/**
 * ========================================
 * 公告管理路由
 * Announcement Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// 获取启用的公告列表（公开）
router.get('/', async (req, res) => {
    try {
        const announcements = await db.query(
            'SELECT id, type, content, media_url, link, bg_color FROM announcements WHERE status = 1 ORDER BY sort_order ASC, id DESC'
        );
        res.json({ code: 200, data: { list: announcements } });
    } catch (error) {
        console.error('获取公告失败:', error);
        res.status(500).json({ code: 500, message: '获取公告失败' });
    }
});

// 获取所有公告（管理员）
router.get('/all', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const announcements = await db.query(
            'SELECT * FROM announcements ORDER BY sort_order ASC, id DESC'
        );
        res.json({ code: 200, data: { list: announcements } });
    } catch (error) {
        console.error('获取公告失败:', error);
        res.status(500).json({ code: 500, message: '获取公告失败' });
    }
});

// 创建公告（管理员）
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { type, content, media_url, link, bg_color, status, sort_order } = req.body;
        
        // 根据类型验证必填字段
        const announcementType = type || 'text';
        if (announcementType === 'text' && (!content || !content.trim())) {
            return res.status(400).json({ code: 400, message: '文字公告内容不能为空' });
        }
        if ((announcementType === 'image' || announcementType === 'video') && !media_url) {
            return res.status(400).json({ code: 400, message: '媒体公告需要提供媒体链接' });
        }
        
        const result = await db.query(
            'INSERT INTO announcements (type, content, media_url, link, bg_color, status, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                announcementType,
                content ? content.trim() : '',
                media_url || null,
                link || null,
                bg_color || '#6366f1',
                status ?? 1,
                sort_order ?? 0
            ]
        );
        
        res.json({ code: 200, message: '公告创建成功', data: { id: result.insertId } });
    } catch (error) {
        console.error('创建公告失败:', error);
        res.status(500).json({ code: 500, message: '创建公告失败' });
    }
});

// 更新公告（管理员）
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, content, media_url, link, bg_color, status, sort_order } = req.body;
        
        const updateFields = [];
        const params = [];
        
        if (type !== undefined) {
            updateFields.push('type = ?');
            params.push(type);
        }
        if (content !== undefined) {
            updateFields.push('content = ?');
            params.push(content ? content.trim() : '');
        }
        if (media_url !== undefined) {
            updateFields.push('media_url = ?');
            params.push(media_url || null);
        }
        if (link !== undefined) {
            updateFields.push('link = ?');
            params.push(link || null);
        }
        if (bg_color !== undefined) {
            updateFields.push('bg_color = ?');
            params.push(bg_color);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            params.push(status);
        }
        if (sort_order !== undefined) {
            updateFields.push('sort_order = ?');
            params.push(sort_order);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }
        
        params.push(id);
        await db.query(
            `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({ code: 200, message: '公告更新成功' });
    } catch (error) {
        console.error('更新公告失败:', error);
        res.status(500).json({ code: 500, message: '更新公告失败' });
    }
});

// 删除公告（管理员）
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM announcements WHERE id = ?', [id]);
        res.json({ code: 200, message: '公告删除成功' });
    } catch (error) {
        console.error('删除公告失败:', error);
        res.status(500).json({ code: 500, message: '删除公告失败' });
    }
});

module.exports = router;
