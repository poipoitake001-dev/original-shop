/**
 * ========================================
 * 客户认证和订单路由
 * Customer Auth & Orders Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, verifyAdmin, generateToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// ========== 客户认证 ==========

/**
 * 客户注册
 * POST /api/customer/register
 */
router.post('/register', validate(schemas.register), async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // 验证输入
        if (!username || !email || !password) {
            return res.status(400).json({ code: 400, message: '请填写所有必填字段' });
        }
        
        if (username.length < 2 || username.length > 20) {
            return res.status(400).json({ code: 400, message: '用户名长度需在2-20个字符之间' });
        }
        
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ code: 400, message: '邮箱格式不正确' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ code: 400, message: '密码长度不能少于6位' });
        }
        
        // 检查用户名是否已存在
        const existingUser = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [username]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ code: 400, message: '用户名已被注册' });
        }
        
        // 检查邮箱是否已存在
        const existingEmail = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({ code: 400, message: '邮箱已被注册' });
        }
        
        // 加密密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // 创建用户
        const result = await db.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
            [username.trim(), email.trim().toLowerCase(), hashedPassword, 'user']
        );
        
        // 生成 token
        const token = generateToken({
            id: result.insertId,
            username: username.trim(),
            email: email.trim().toLowerCase(),
            role: 'user',
            sellerStatus: 'none'
        });
        
        res.status(201).json({
            code: 200,
            message: '注册成功',
            data: {
                token,
                user: {
                    id: result.insertId,
                    username: username.trim(),
                    email: email.trim().toLowerCase(),
                    role: 'user',
                    sellerStatus: 'none'
                }
            }
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ code: 500, message: '注册失败' });
    }
});

/**
 * 客户登录
 * POST /api/customer/login
 */
router.post('/login', validate(schemas.login), async (req, res) => {
    try {
        const { account, password } = req.body;
        
        if (!account || !password) {
            return res.status(400).json({ code: 400, message: '账号和密码不能为空' });
        }
        
        // 查找用户（用户名或邮箱，支持 user 和 seller 角色登录）
        const users = await db.query(
            'SELECT id, username, email, password, avatar, role, seller_status, status FROM users WHERE (username = ? OR email = ?) AND role IN (?, ?)',
            [account, account.toLowerCase(), 'user', 'seller']
        );
        
        if (users.length === 0) {
            return res.status(401).json({ code: 401, message: '账号或密码错误' });
        }
        
        const user = users[0];
        
        // 检查账户状态
        if (user.status === 0) {
            return res.status(403).json({ code: 403, message: '账户已被禁用' });
        }
        
        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '账号或密码错误' });
        }
        
        // 生成 token（包含卖家信息）
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            sellerStatus: user.seller_status || 'none'
        });
        
        res.json({
            code: 200,
            message: '登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    sellerStatus: user.seller_status || 'none'
                }
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ code: 500, message: '登录失败' });
    }
});

/**
 * 获取当前用户信息
 * GET /api/customer/profile
 */
router.get('/profile', verifyToken, async (req, res) => {
    try {
        const users = await db.query(
            `SELECT id, username, email, avatar, nickname, avatar_url, role, seller_status, commission_rate,
                    is_student_verified, can_skip_audit, rating, review_count,
                    sold_count, bought_count, dispute_count, good_review_count,
                    badge_excellent_seller, badge_excellent_buyer, created_at
             FROM users WHERE id = ?`,
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        
        const userData = users[0];
        res.json({
            code: 200,
            data: {
                ...userData,
                nickname: userData.nickname || null,
                avatarUrl: userData.avatar_url || userData.avatar || null,
                sellerStatus: userData.seller_status || 'none',
                commissionRate: parseFloat(userData.commission_rate) || 0.05,
                isStudentVerified: !!userData.is_student_verified,
                canSkipAudit: !!userData.can_skip_audit,
                rating: userData.rating || 5.0,
                reviewCount: userData.review_count || 0,
                soldCount: userData.sold_count || 0,
                boughtCount: userData.bought_count || 0,
                disputeCount: userData.dispute_count || 0,
                goodReviewCount: userData.good_review_count || 0,
                badgeExcellentSeller: !!userData.badge_excellent_seller,
                badgeExcellentBuyer: !!userData.badge_excellent_buyer,
            }
        });
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ code: 500, message: '获取用户信息失败' });
    }
});

/**
 * 刷新 Token（角色变更后调用）
 * POST /api/customer/refresh-token
 */
router.post('/refresh-token', verifyToken, async (req, res) => {
    try {
        const users = await db.query(
            'SELECT id, username, email, role, seller_status FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        const user = users[0];
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            sellerStatus: user.seller_status || 'none'
        });
        res.json({
            code: 200,
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    sellerStatus: user.seller_status || 'none'
                }
            }
        });
    } catch (error) {
        console.error('刷新Token失败:', error);
        res.status(500).json({ code: 500, message: '刷新失败' });
    }
});

/**
 * 修改密码
 * PUT /api/customer/password
 */
router.put('/password', verifyToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        
        if (!current_password || !new_password) {
            return res.status(400).json({ code: 400, message: '请填写当前密码和新密码' });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ code: 400, message: '新密码长度不能少于6位' });
        }
        
        // 获取当前用户
        const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        
        // 验证当前密码
        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '当前密码错误' });
        }
        
        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        
        // 更新密码
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
        
        res.json({ code: 200, message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ code: 500, message: '修改密码失败' });
    }
});

// ========== 客户订单 ==========

/**
 * 获取我的订单列表
 * GET /api/customer/orders
 * 
 * 修改：通过 user_id 查询订单（登录用户），同时兼容 email 匹配（历史订单）
 */
router.get('/orders', verifyToken, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        
        // 通过 user_id 或 email 匹配订单
        // - user_id 匹配：登录状态下创建的订单
        // - email 匹配：兼容游客订单或历史订单
        let sql = `SELECT o.*, u.username AS seller_name
                   FROM orders o
                   LEFT JOIN users u ON o.seller_id = u.id
                   WHERE (o.user_id = ? OR o.email = ?)`;
        let countSql = 'SELECT COUNT(*) AS total FROM orders WHERE (user_id = ? OR email = ?)';
        const params = [req.user.id, req.user.email];
        
        if (status) {
            sql += ' AND o.status = ?';
            countSql += ' AND status = ?';
            params.push(status);
        }
        
        sql += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        
        const [orders, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);
        
        res.json({
            code: 200,
            data: {
                list: orders,
                total: countResult[0].total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('获取订单列表失败:', error);
        res.status(500).json({ code: 500, message: '获取订单列表失败' });
    }
});

/**
 * 获取订单详情
 * GET /api/customer/orders/:orderNo
 * 
 * 修改：通过 user_id 或 email 匹配订单
 */
router.get('/orders/:orderNo', verifyToken, async (req, res) => {
    try {
        const { orderNo } = req.params;
        
        // 通过 user_id 或 email 匹配订单
        const orders = await db.query(
            'SELECT * FROM orders WHERE order_no = ? AND (user_id = ? OR email = ?)',
            [orderNo, req.user.id, req.user.email]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }
        
        res.json({ code: 200, data: orders[0] });
    } catch (error) {
        console.error('获取订单详情失败:', error);
        res.status(500).json({ code: 500, message: '获取订单详情失败' });
    }
});

// ========== 管理员管理客户 ==========

/**
 * 获取客户列表（管理员）
 * GET /api/customer/admin/list
 */
router.get('/admin/list', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { search, status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = 'SELECT id, username, email, avatar, nickname, avatar_url, role, status, is_student_verified, can_skip_audit, rating, review_count, sold_count, bought_count, dispute_count, good_review_count, badge_excellent_seller, badge_excellent_buyer, created_at, updated_at FROM users WHERE role != ?';
        let countSql = 'SELECT COUNT(*) AS total FROM users WHERE role != ?';
        const params = ['admin'];
        
        if (search) {
            sql += ' AND (username LIKE ? OR email LIKE ?)';
            countSql += ' AND (username LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        if (status !== undefined && status !== '') {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(Number(status));
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        
        const [users, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);
        
        // 获取每个用户的订单数
        for (const user of users) {
            const orderCount = await db.query(
                'SELECT COUNT(*) AS count FROM orders WHERE email = ?',
                [user.email]
            );
            user.order_count = orderCount[0].count;
        }
        
        res.json({
            code: 200,
            data: {
                list: users,
                total: countResult[0].total,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('获取客户列表失败:', error);
        res.status(500).json({ code: 500, message: '获取客户列表失败' });
    }
});

/**
 * 获取客户详情（管理员）
 * GET /api/customer/admin/:id
 */
router.get('/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        const users = await db.query(
            "SELECT id, username, email, avatar, role, status, created_at, updated_at FROM users WHERE id = ? AND role != ?",
            [id, 'admin']
        );
        
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '客户不存在' });
        }
        
        // 获取客户订单统计
        const orderStats = await db.query(
            `SELECT 
                COUNT(*) AS total_orders,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_orders,
                SUM(total_price) AS total_spent
             FROM orders WHERE email = ?`,
            [users[0].email]
        );
        
        res.json({
            code: 200,
            data: {
                ...users[0],
                stats: orderStats[0]
            }
        });
    } catch (error) {
        console.error('获取客户详情失败:', error);
        res.status(500).json({ code: 500, message: '获取客户详情失败' });
    }
});

/**
 * 修改客户密码（管理员）
 * PUT /api/customer/admin/:id/password
 */
router.put('/admin/:id/password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { new_password } = req.body;
        
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ code: 400, message: '新密码长度不能少于6位' });
        }
        
        // 检查客户是否存在（排除管理员）
        const users = await db.query("SELECT id FROM users WHERE id = ? AND role != ?", [id, 'admin']);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '客户不存在' });
        }
        
        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        
        // 更新密码
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id]);
        
        res.json({ code: 200, message: '密码修改成功' });
    } catch (error) {
        console.error('修改客户密码失败:', error);
        res.status(500).json({ code: 500, message: '修改客户密码失败' });
    }
});

/**
 * 修改客户状态（管理员）
 * PUT /api/customer/admin/:id/status
 */
router.put('/admin/:id/status', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        if (status !== 0 && status !== 1) {
            return res.status(400).json({ code: 400, message: '状态值无效' });
        }
        
        await db.query("UPDATE users SET status = ? WHERE id = ? AND role != ?", [status, id, 'admin']);
        
        res.json({ code: 200, message: status === 1 ? '账户已启用' : '账户已禁用' });
    } catch (error) {
        console.error('修改客户状态失败:', error);
        res.status(500).json({ code: 500, message: '修改客户状态失败' });
    }
});

/**
 * 删除客户（管理员）
 * DELETE /api/customer/admin/:id
 */
router.delete('/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查客户是否存在（排除管理员）
        const users = await db.query("SELECT id FROM users WHERE id = ? AND role != ?", [id, 'admin']);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '客户不存在' });
        }
        
        await db.query("DELETE FROM users WHERE id = ? AND role != ?", [id, 'admin']);
        
        res.json({ code: 200, message: '客户删除成功' });
    } catch (error) {
        console.error('删除客户失败:', error);
        res.status(500).json({ code: 500, message: '删除客户失败' });
    }
});

/**
 * 切换用户免审核权限（管理员）
 * PUT /api/customer/admin/:id/trust-mode
 */
router.put('/admin/:id/trust-mode', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { canSkipAudit } = req.body;

        if (typeof canSkipAudit !== 'boolean') {
            return res.status(400).json({ code: 400, message: '参数无效' });
        }

        // 检查用户是否存在（排除管理员）
        const users = await db.query("SELECT id, username FROM users WHERE id = ? AND role != ?", [id, 'admin']);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        await db.query('UPDATE users SET can_skip_audit = ? WHERE id = ?', [canSkipAudit ? 1 : 0, id]);

        res.json({
            code: 200,
            message: canSkipAudit ? '已开启免审核权限' : '已关闭免审核权限',
            data: { can_skip_audit: canSkipAudit }
        });
    } catch (error) {
        console.error('切换免审核权限失败:', error);
        res.status(500).json({ code: 500, message: '操作失败' });
    }
});

/**
 * 批量删除客户（管理员）
 * POST /api/customer/admin/batch-delete
 */
router.post('/admin/batch-delete', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ code: 400, message: '请选择要删除的客户' });
        }
        
        // 只删除非管理员用户
        const placeholders = ids.map(() => '?').join(',');
        await db.query(
            `DELETE FROM users WHERE id IN (${placeholders}) AND role != ?`,
            [...ids, 'admin']
        );
        
        res.json({ code: 200, message: `已删除 ${ids.length} 个客户` });
    } catch (error) {
        console.error('批量删除客户失败:', error);
        res.status(500).json({ code: 500, message: '批量删除客户失败' });
    }
});

module.exports = router;
