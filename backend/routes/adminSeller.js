/**
 * ========================================
 * 管理员 - 卖家管理路由
 * Admin Seller Management Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { processWithdrawal } = require('../utils/finance');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ========== 卖家入驻审核 ==========

/**
 * GET /applications
 * 获取所有卖家申请
 */
router.get('/applications', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = `SELECT sa.*, u.username, u.email, u.avatar 
                   FROM seller_applications sa 
                   JOIN users u ON sa.user_id = u.id`;
        let countSql = 'SELECT COUNT(*) AS total FROM seller_applications';
        const params = [];

        if (status) {
            sql += ' WHERE sa.status = ?';
            countSql += ' WHERE status = ?';
            params.push(status);
        }

        sql += ' ORDER BY sa.created_at DESC LIMIT ? OFFSET ?';

        const [apps, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);

        res.json({
            code: 200,
            data: { list: apps, total: countResult[0]?.total || 0, page: Number(page), limit: Number(limit) }
        });
    } catch (error) {
        console.error('获取卖家申请列表失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * PUT /applications/:id
 * 审核卖家申请（通过/拒绝）
 */
router.put('/applications/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, adminNote } = req.body; // action: 'approve' | 'reject'

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ code: 400, message: '操作类型无效' });
        }

        const apps = await db.query('SELECT * FROM seller_applications WHERE id = ?', [Number(id)]);
        if (apps.length === 0) {
            return res.status(404).json({ code: 404, message: '申请不存在' });
        }

        const app = apps[0];
        if (app.status !== 'pending') {
            return res.status(400).json({ code: 400, message: '该申请已被处理' });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // 更新申请状态
        await db.query(
            'UPDATE seller_applications SET status = ?, admin_note = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id = ?',
            [newStatus, adminNote || null, req.user.id, Number(id)]
        );

        if (action === 'approve') {
            // 升级用户角色为卖家
            await db.query(
                "UPDATE users SET role = 'seller', seller_status = 'approved' WHERE id = ?",
                [app.user_id]
            );

            // 为卖家创建钱包
            const existing = await db.query('SELECT id FROM wallets WHERE user_id = ?', [app.user_id]);
            if (existing.length === 0) {
                await db.query('INSERT INTO wallets (user_id) VALUES (?)', [app.user_id]);
            }
        } else {
            // 拒绝：更新 seller_status
            await db.query(
                "UPDATE users SET seller_status = 'rejected' WHERE id = ?",
                [app.user_id]
            );
        }

        res.json({ code: 200, message: action === 'approve' ? '已通过申请' : '已拒绝申请' });
    } catch (error) {
        console.error('审核卖家申请失败:', error);
        res.status(500).json({ code: 500, message: '操作失败' });
    }
});

// ========== 商品审核 ==========

/**
 * GET /products/audit
 * 获取待审核的卖家商品
 */
router.get('/products/audit', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { audit_status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [products, countResult] = await Promise.all([
            db.query(
                `SELECT p.*, u.username AS seller_name, c.name AS category_name
                 FROM products p
                 LEFT JOIN users u ON p.seller_id = u.id
                 LEFT JOIN categories c ON p.category_id = c.id
                 WHERE p.seller_id IS NOT NULL AND p.audit_status = ?
                 ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
                [audit_status, Number(limit), Number(offset)]
            ),
            db.query(
                'SELECT COUNT(*) AS total FROM products WHERE seller_id IS NOT NULL AND audit_status = ?',
                [audit_status]
            )
        ]);

        res.json({
            code: 200,
            data: { list: products, total: countResult[0]?.total || 0, page: Number(page), limit: Number(limit) }
        });
    } catch (error) {
        console.error('获取待审核商品失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * PUT /products/:id/audit
 * 审核卖家商品（通过/拒绝）
 */
router.put('/products/:id/audit', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, feedback } = req.body; // action: 'approve' | 'reject'

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ code: 400, message: '操作类型无效' });
        }

        const products = await db.query('SELECT * FROM products WHERE id = ? AND seller_id IS NOT NULL', [Number(id)]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在' });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await db.query(
            'UPDATE products SET audit_status = ?, audit_feedback = ? WHERE id = ?',
            [newStatus, action === 'reject' ? (feedback || '不符合平台规范') : null, Number(id)]
        );

        res.json({ code: 200, message: action === 'approve' ? '商品已通过审核' : '商品已拒绝' });
    } catch (error) {
        console.error('审核商品失败:', error);
        res.status(500).json({ code: 500, message: '操作失败' });
    }
});

// ========== 学生认证审核 ==========

/**
 * GET /student-verifications
 * 获取学生认证申请列表
 */
router.get('/student-verifications', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [list, countResult] = await Promise.all([
            db.query(
                `SELECT sv.*, u.username, u.email, u.avatar, u.is_student_verified, u.can_skip_audit
                 FROM student_verifications sv
                 JOIN users u ON sv.user_id = u.id
                 WHERE sv.status = ?
                 ORDER BY sv.created_at DESC LIMIT ? OFFSET ?`,
                [status, Number(limit), Number(offset)]
            ),
            db.query(
                'SELECT COUNT(*) AS total FROM student_verifications WHERE status = ?',
                [status]
            )
        ]);

        res.json({
            code: 200,
            data: { list, total: countResult[0]?.total || 0, page: Number(page), limit: Number(limit) }
        });
    } catch (error) {
        console.error('获取学生认证列表失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * PUT /student-verifications/:id
 * 审核学生认证申请（通过/拒绝）
 * body: { action: 'approve'|'reject', adminNote?: string, enableTrust?: boolean }
 */
router.put('/student-verifications/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, adminNote, enableTrust } = req.body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return res.status(400).json({ code: 400, message: '操作类型无效' });
        }

        const apps = await db.query('SELECT * FROM student_verifications WHERE id = ?', [Number(id)]);
        if (apps.length === 0) {
            return res.status(404).json({ code: 404, message: '申请不存在' });
        }

        const app = apps[0];
        if (app.status !== 'pending') {
            return res.status(400).json({ code: 400, message: '该申请已被处理' });
        }

        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        // 更新申请状态
        await db.query(
            'UPDATE student_verifications SET status = ?, admin_note = ?, reviewed_at = NOW() WHERE id = ?',
            [newStatus, adminNote || null, Number(id)]
        );

        if (action === 'approve') {
            // 标记用户学生认证通过
            let updateSql = 'UPDATE users SET is_student_verified = 1';
            if (enableTrust) {
                updateSql += ', can_skip_audit = 1';
            }
            updateSql += ' WHERE id = ?';
            await db.query(updateSql, [app.user_id]);
        }

        const message = action === 'approve'
            ? (enableTrust ? '已通过认证并开启免审核权限' : '已通过学生认证')
            : '已拒绝学生认证';

        res.json({ code: 200, message });
    } catch (error) {
        console.error('审核学生认证失败:', error);
        res.status(500).json({ code: 500, message: '操作失败' });
    }
});

// ========== 提现管理 ==========

/**
 * GET /withdrawals
 * 获取提现申请列表
 */
router.get('/withdrawals', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = `SELECT wr.*, u.username, u.email
                   FROM withdrawal_requests wr
                   JOIN users u ON wr.user_id = u.id`;
        let countSql = 'SELECT COUNT(*) AS total FROM withdrawal_requests';
        const params = [];

        if (status) {
            sql += ' WHERE wr.status = ?';
            countSql += ' WHERE status = ?';
            params.push(status);
        }

        sql += ' ORDER BY wr.created_at DESC LIMIT ? OFFSET ?';

        const [withdrawals, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);

        res.json({
            code: 200,
            data: { list: withdrawals, total: countResult[0]?.total || 0, page: Number(page), limit: Number(limit) }
        });
    } catch (error) {
        console.error('获取提现列表失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * PUT /withdrawals/:id
 * 处理提现申请（完成/拒绝）— 原子性操作，使用 MySQL 事务
 */
router.put('/withdrawals/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, adminNote } = req.body; // action: 'complete' | 'reject'

        if (!action || !['complete', 'reject'].includes(action)) {
            return res.status(400).json({ code: 400, message: '操作类型无效' });
        }

        const result = await processWithdrawal(Number(id), action, req.user.id, adminNote);

        if (!result.success) {
            return res.status(400).json({ code: 400, message: result.message });
        }

        res.json({ code: 200, message: action === 'complete' ? '提现已完成' : '提现已拒绝' });
    } catch (error) {
        console.error('处理提现失败:', error);
        res.status(500).json({ code: 500, message: '操作失败' });
    }
});

module.exports = router;
