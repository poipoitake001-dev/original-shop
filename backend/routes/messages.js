/**
 * ========================================
 * 站内消息路由
 * Internal Messaging Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

/**
 * GET /conversations
 * 获取会话列表（管理员看所有用户，普通用户看自己的）
 * 每个会话显示对方信息 + 最新一条消息 + 未读数
 */
router.get('/conversations', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const isAdmin = req.user.role === 'admin';

        // 找出所有与当前用户有消息往来的对方用户
        let sql;
        let params;

        if (isAdmin) {
            // 管理员：看所有给管理员发过消息的用户（或管理员给他们发过的）
            sql = `
                SELECT 
                    u.id, u.username, u.avatar, u.role,
                    (SELECT content FROM messages WHERE 
                        (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
                        ORDER BY created_at DESC LIMIT 1
                    ) AS last_message,
                    (SELECT created_at FROM messages WHERE 
                        (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
                        ORDER BY created_at DESC LIMIT 1
                    ) AS last_time,
                    (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
                    ) AS unread_count
                FROM users u
                WHERE u.id != ? AND u.id IN (
                    SELECT DISTINCT sender_id FROM messages WHERE receiver_id = ?
                    UNION
                    SELECT DISTINCT receiver_id FROM messages WHERE sender_id = ?
                )
                ORDER BY last_time DESC
            `;
            params = [userId, userId, userId, userId, userId, userId, userId, userId];
        } else {
            // 普通用户/卖家：只看与管理员的对话
            sql = `
                SELECT 
                    u.id, u.username, u.avatar, u.role,
                    (SELECT content FROM messages WHERE 
                        (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
                        ORDER BY created_at DESC LIMIT 1
                    ) AS last_message,
                    (SELECT created_at FROM messages WHERE 
                        (sender_id = u.id AND receiver_id = ?) OR (sender_id = ? AND receiver_id = u.id)
                        ORDER BY created_at DESC LIMIT 1
                    ) AS last_time,
                    (SELECT COUNT(*) FROM messages WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0
                    ) AS unread_count
                FROM users u
                WHERE u.role = 'admin' AND u.id IN (
                    SELECT DISTINCT sender_id FROM messages WHERE receiver_id = ?
                    UNION
                    SELECT DISTINCT receiver_id FROM messages WHERE sender_id = ?
                )
                ORDER BY last_time DESC
            `;
            params = [userId, userId, userId, userId, userId, userId, userId];
        }

        const conversations = await db.query(sql, params);

        // 如果用户没有任何对话，但不是管理员，返回管理员列表让他们可以发起对话
        if (conversations.length === 0 && !isAdmin) {
            const admins = await db.query(
                "SELECT id, username, avatar, role FROM users WHERE role = 'admin' AND status = 1 LIMIT 5"
            );
            return res.json({
                code: 200,
                data: admins.map(a => ({
                    ...a,
                    last_message: null,
                    last_time: null,
                    unread_count: 0
                }))
            });
        }

        res.json({ code: 200, data: conversations });
    } catch (error) {
        console.error('获取会话列表失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * GET /history
 * 获取与某用户的消息历史
 * Query: targetId, page, limit
 */
router.get('/history', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetId, page = 1, limit = 50 } = req.query;

        if (!targetId) {
            return res.status(400).json({ code: 400, message: '请指定对方用户' });
        }

        const offset = (page - 1) * limit;
        const tid = Number(targetId);

        const [messages, countResult] = await Promise.all([
            db.query(
                `SELECT m.*, 
                        su.username AS sender_name, su.avatar AS sender_avatar,
                        ru.username AS receiver_name
                 FROM messages m
                 LEFT JOIN users su ON m.sender_id = su.id
                 LEFT JOIN users ru ON m.receiver_id = ru.id
                 WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
                 ORDER BY m.created_at ASC
                 LIMIT ? OFFSET ?`,
                [userId, tid, tid, userId, Number(limit), Number(offset)]
            ),
            db.query(
                `SELECT COUNT(*) AS total FROM messages 
                 WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)`,
                [userId, tid, tid, userId]
            )
        ]);

        res.json({
            code: 200,
            data: {
                list: messages,
                total: countResult[0]?.total || 0,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('获取消息历史失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * POST /send
 * 发送消息
 */
router.post('/send', verifyToken, validate(schemas.sendMessage), async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId, content } = req.body;

        if (!receiverId || !content?.trim()) {
            return res.status(400).json({ code: 400, message: '接收者和消息内容不能为空' });
        }

        // 验证接收者存在
        const receivers = await db.query('SELECT id, role FROM users WHERE id = ? AND status = 1', [Number(receiverId)]);
        if (receivers.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        // 非管理员只能给管理员发消息
        if (req.user.role !== 'admin' && receivers[0].role !== 'admin') {
            return res.status(403).json({ code: 403, message: '只能向客服发送消息' });
        }

        const result = await db.query(
            'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
            [senderId, Number(receiverId), content.trim()]
        );

        const msg = await db.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);

        res.json({
            code: 200,
            message: '发送成功',
            data: msg[0]
        });
    } catch (error) {
        console.error('发送消息失败:', error);
        res.status(500).json({ code: 500, message: '发送失败' });
    }
});

/**
 * PUT /read
 * 标记消息为已读
 * Body: { targetId } - 将对方发给我的所有未读消息标记为已读
 */
router.put('/read', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({ code: 400, message: '请指定对方用户' });
        }

        const result = await db.query(
            'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
            [Number(targetId), userId]
        );

        res.json({ code: 200, message: '已标记为已读', data: { updated: result.affectedRows || 0 } });
    } catch (error) {
        console.error('标记已读失败:', error);
        res.status(500).json({ code: 500, message: '操作失败' });
    }
});

/**
 * GET /unread-count
 * 获取当前用户的总未读消息数
 */
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT COUNT(*) AS count FROM messages WHERE receiver_id = ? AND is_read = 0',
            [req.user.id]
        );
        res.json({ code: 200, data: { count: result[0]?.count || 0 } });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

module.exports = router;
