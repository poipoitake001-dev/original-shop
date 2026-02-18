/**
 * ========================================
 * 分类管理路由
 * Category Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ========== 公开接口 ==========

/**
 * 获取分类列表（公开）
 * GET /api/categories
 */
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        let sql = 'SELECT * FROM categories';
        const params = [];
        
        if (status !== undefined && status !== '') {
            sql += ' WHERE status = ?';
            params.push(Number(status));
        }
        
        sql += ' ORDER BY sort_order ASC, id ASC';
        
        const categories = await db.query(sql, params);
        
        res.json({
            code: 200,
            data: { list: categories }
        });
    } catch (error) {
        console.error('获取分类列表失败:', error);
        res.status(500).json({ code: 500, message: '获取分类列表失败' });
    }
});

/**
 * 获取分类详情（公开）
 * GET /api/categories/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const categories = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
        
        if (categories.length === 0) {
            return res.status(404).json({ code: 404, message: '分类不存在' });
        }
        
        res.json({ code: 200, data: categories[0] });
    } catch (error) {
        console.error('获取分类详情失败:', error);
        res.status(500).json({ code: 500, message: '获取分类详情失败' });
    }
});

// ========== 管理员接口 ==========

/**
 * 创建分类（管理员）
 * POST /api/categories
 */
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, slug, description, icon, image_url, sort_order, status } = req.body;
        
        if (!name || !slug) {
            return res.status(400).json({ code: 400, message: '分类名称和标识不能为空' });
        }
        
        // 检查 slug 是否已存在
        const existing = await db.query('SELECT id FROM categories WHERE slug = ?', [slug]);
        if (existing.length > 0) {
            return res.status(400).json({ code: 400, message: '分类标识已存在' });
        }
        
        const result = await db.query(
            `INSERT INTO categories (name, slug, description, icon, image_url, sort_order, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                name,
                slug,
                description || null,
                icon || '📦',
                image_url || null,
                sort_order || 0,
                status !== undefined ? status : 1
            ]
        );
        
        res.status(201).json({
            code: 200,
            message: '分类创建成功',
            data: { id: result.insertId }
        });
    } catch (error) {
        console.error('创建分类失败:', error);
        res.status(500).json({ code: 500, message: '创建分类失败' });
    }
});

/**
 * 更新分类（管理员）
 * PUT /api/categories/:id
 */
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, icon, image_url, sort_order, status } = req.body;
        
        // 检查分类是否存在
        const existing = await db.query('SELECT id FROM categories WHERE id = ?', [id]);
        if (existing.length === 0) {
            return res.status(404).json({ code: 404, message: '分类不存在' });
        }
        
        // 如果更新 slug，检查是否与其他分类冲突
        if (slug) {
            const slugConflict = await db.query(
                'SELECT id FROM categories WHERE slug = ? AND id != ?',
                [slug, id]
            );
            if (slugConflict.length > 0) {
                return res.status(400).json({ code: 400, message: '分类标识已被使用' });
            }
        }
        
        const updateFields = [];
        const params = [];
        
        if (name !== undefined) { updateFields.push('name = ?'); params.push(name); }
        if (slug !== undefined) { updateFields.push('slug = ?'); params.push(slug); }
        if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
        if (icon !== undefined) { updateFields.push('icon = ?'); params.push(icon); }
        if (image_url !== undefined) { updateFields.push('image_url = ?'); params.push(image_url); }
        if (sort_order !== undefined) { updateFields.push('sort_order = ?'); params.push(sort_order); }
        if (status !== undefined) { updateFields.push('status = ?'); params.push(status); }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }
        
        params.push(id);
        await db.query(
            `UPDATE categories SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({ code: 200, message: '分类更新成功' });
    } catch (error) {
        console.error('更新分类失败:', error);
        res.status(500).json({ code: 500, message: '更新分类失败' });
    }
});

/**
 * 删除分类（管理员）
 * DELETE /api/categories/:id
 */
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查是否有商品使用此分类
        const products = await db.query(
            'SELECT COUNT(*) AS count FROM products WHERE category_id = ?',
            [id]
        );
        if (products[0].count > 0) {
            return res.status(400).json({
                code: 400,
                message: `无法删除：该分类下有 ${products[0].count} 个商品`
            });
        }
        
        await db.query('DELETE FROM categories WHERE id = ?', [id]);
        
        res.json({ code: 200, message: '分类删除成功' });
    } catch (error) {
        console.error('删除分类失败:', error);
        res.status(500).json({ code: 500, message: '删除分类失败' });
    }
});

module.exports = router;
