/**
 * ========================================
 * 管理后台 API 路由
 * Admin Dashboard API Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'space-card-shop-secret-key';

/**
 * 管理员登录
 * POST /api/admin/login
 */
router.post('/login', async (req, res) => {
    try {
        const { account, password } = req.body;
        
        if (!account || !password) {
            return res.status(400).json({ code: 400, message: '请输入账号和密码' });
        }

        // 查找用户
        const users = await db.query(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND role = $2',
            [account, 'admin']
        );

        if (users.length === 0) {
            return res.status(401).json({ code: 401, message: '账号不存在或无管理员权限' });
        }

        const user = users[0];

        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '密码错误' });
        }

        // 生成 token
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            code: 200,
            message: '登录成功',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ code: 500, message: '登录失败' });
    }
});

/**
 * 获取统计数据
 * GET /api/admin/stats
 */
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        // 总订单数
        const ordersResult = await db.query('SELECT COUNT(*) AS count FROM orders');
        const totalOrders = parseInt(ordersResult[0]?.count || 0);

        // 总收入
        const revenueResult = await db.query(
            "SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status IN ('paid', 'delivered', 'completed')"
        );
        const totalRevenue = parseFloat(revenueResult[0]?.total || 0);

        // 商品数量
        const productsResult = await db.query('SELECT COUNT(*) AS count FROM products');
        const totalProducts = parseInt(productsResult[0]?.count || 0);

        // 用户数量
        const usersResult = await db.query("SELECT COUNT(*) AS count FROM users WHERE role != 'admin'");
        const totalUsers = parseInt(usersResult[0]?.count || 0);

        // 今日订单
        const todayOrdersResult = await db.query(
            "SELECT COUNT(*) AS count FROM orders WHERE created_at >= CURRENT_DATE"
        );
        const todayOrders = parseInt(todayOrdersResult[0]?.count || 0);

        // 今日收入
        const todayRevenueResult = await db.query(
            "SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status IN ('paid', 'delivered', 'completed') AND pay_time >= CURRENT_DATE"
        );
        const todayRevenue = parseFloat(todayRevenueResult[0]?.total || 0);

        res.json({
            code: 200,
            data: {
                totalOrders,
                totalRevenue,
                totalProducts,
                totalUsers,
                todayOrders,
                todayRevenue
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ code: 500, message: '获取统计失败' });
    }
});

/**
 * 获取订单列表
 * GET /api/admin/orders
 */
router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM orders';
        const params = [];

        if (status && status !== 'all') {
            sql += ' WHERE status = $1';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
        params.push(limit, offset);

        const orders = await db.query(sql, params);

        res.json({ code: 200, data: orders });
    } catch (error) {
        console.error('Admin orders error:', error);
        res.status(500).json({ code: 500, message: '获取订单失败' });
    }
});

/**
 * 更新订单状态
 * PATCH /api/admin/orders/:id/status
 */
router.patch('/orders/:id/status', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        await db.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

        res.json({ code: 200, message: '订单状态已更新' });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ code: 500, message: '更新失败' });
    }
});

/**
 * 删除订单
 * DELETE /api/admin/orders/:id
 */
router.delete('/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM orders WHERE id = $1', [id]);
        res.json({ code: 200, message: '订单已删除' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

/**
 * 获取商品列表
 * GET /api/admin/products
 */
router.get('/products', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const products = await db.query(
            'SELECT * FROM products ORDER BY created_at DESC'
        );
        res.json({ code: 200, data: products });
    } catch (error) {
        console.error('Admin products error:', error);
        res.status(500).json({ code: 500, message: '获取商品失败' });
    }
});

/**
 * 删除商品
 * DELETE /api/admin/products/:id
 */
router.delete('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ code: 200, message: '商品已删除' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

/**
 * 获取用户列表
 * GET /api/admin/users
 */
router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await db.query(
            'SELECT id, username, email, nickname, role, seller_status, created_at FROM users ORDER BY created_at DESC'
        );
        res.json({ code: 200, data: users });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ code: 500, message: '获取用户失败' });
    }
});

/**
 * 获取分类列表
 * GET /api/admin/categories
 */
router.get('/categories', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const categories = await db.query(
            'SELECT * FROM categories ORDER BY sort_order ASC'
        );
        res.json({ code: 200, data: categories });
    } catch (error) {
        console.error('Admin categories error:', error);
        res.status(500).json({ code: 500, message: '获取分类失败' });
    }
});

/**
 * 获取系统设置
 * GET /api/admin/settings
 */
router.get('/settings', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const settings = await db.query('SELECT * FROM site_settings WHERE id = 1');
        res.json({ code: 200, data: settings[0] || {} });
    } catch (error) {
        console.error('Admin settings error:', error);
        res.status(500).json({ code: 500, message: '获取设置失败' });
    }
});

/**
 * 更新系统设置
 * PUT /api/admin/settings
 */
router.put('/settings', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { site_name, site_description, contact_email } = req.body;

        await db.query(
            `UPDATE site_settings SET 
                site_name = COALESCE($1, site_name),
                site_description = COALESCE($2, site_description),
                contact_email = COALESCE($3, contact_email),
                updated_at = NOW()
            WHERE id = 1`,
            [site_name, site_description, contact_email]
        );

        res.json({ code: 200, message: '设置已更新' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ code: 500, message: '更新失败' });
    }
});

module.exports = router;
