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

        const users = await db.query(
            'SELECT * FROM users WHERE (username = $1 OR email = $1) AND role = $2',
            [account, 'admin']
        );

        if (users.length === 0) {
            return res.status(401).json({ code: 401, message: '账号不存在或无管理员权限' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '密码错误' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ code: 200, message: '登录成功', token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ code: 500, message: '登录失败' });
    }
});

/**
 * 获取统计数据
 */
router.get('/stats', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [orders, revenue, products, users, todayOrders, todayRevenue, cardkeys] = await Promise.all([
            db.query('SELECT COUNT(*) AS count FROM orders'),
            db.query("SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status IN ('paid', 'delivered', 'completed')"),
            db.query('SELECT COUNT(*) AS count FROM products'),
            db.query("SELECT COUNT(*) AS count FROM users WHERE role != 'admin'"),
            db.query("SELECT COUNT(*) AS count FROM orders WHERE created_at >= CURRENT_DATE"),
            db.query("SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status IN ('paid', 'delivered', 'completed') AND pay_time >= CURRENT_DATE"),
            db.query("SELECT COUNT(*) AS count FROM card_keys WHERE status = 0")
        ]);

        res.json({
            code: 200,
            data: {
                totalOrders: parseInt(orders[0]?.count || 0),
                totalRevenue: parseFloat(revenue[0]?.total || 0),
                totalProducts: parseInt(products[0]?.count || 0),
                totalUsers: parseInt(users[0]?.count || 0),
                todayOrders: parseInt(todayOrders[0]?.count || 0),
                todayRevenue: parseFloat(todayRevenue[0]?.total || 0),
                availableCardkeys: parseInt(cardkeys[0]?.count || 0)
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ code: 500, message: '获取统计失败' });
    }
});

// ==================== 订单管理 ====================

router.get('/orders', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { status, page = 1, limit = 50, search } = req.query;
        const offset = (page - 1) * limit;
        const params = [];
        let paramIndex = 1;
        let sql = `SELECT o.*, p.title as product_title FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE 1=1`;

        if (status && status !== 'all') {
            sql += ` AND o.status = $${paramIndex++}`;
            params.push(status);
        }
        if (search) {
            sql += ` AND (o.order_no ILIKE $${paramIndex++} OR o.contact ILIKE $${paramIndex++})`;
            params.push(`%${search}%`, `%${search}%`);
        }
        sql += ` ORDER BY o.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));

        const orders = await db.query(sql, params);
        res.json({ code: 200, data: orders });
    } catch (error) {
        console.error('Admin orders error:', error);
        res.status(500).json({ code: 500, message: '获取订单失败' });
    }
});

router.patch('/orders/:id/status', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        await db.query('UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);
        res.json({ code: 200, message: '订单状态已更新' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '更新失败' });
    }
});

router.delete('/orders/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM orders WHERE id = $1', [req.params.id]);
        res.json({ code: 200, message: '订单已删除' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

router.post('/orders/batch-delete', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ code: 400, message: '请选择要删除的订单' });
        }
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        await db.query(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
        res.json({ code: 200, message: `成功删除 ${ids.length} 个订单` });
    } catch (error) {
        res.status(500).json({ code: 500, message: '批量删除失败' });
    }
});

// ==================== 商品管理 ====================

router.get('/products', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const products = await db.query(`
            SELECT p.*, c.name as category_name,
                (SELECT COUNT(*) FROM card_keys WHERE product_id = p.id AND status = 0) as available_keys
            FROM products p LEFT JOIN categories c ON p.category_id = c.id
            ORDER BY p.created_at DESC
        `);
        res.json({ code: 200, data: products });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取商品失败' });
    }
});

router.post('/products', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { title, description, price, category_id, image_url, icon, delivery_type } = req.body;
        if (!title || !price) {
            return res.status(400).json({ code: 400, message: '商品名称和价格不能为空' });
        }
        const result = await db.query(`
            INSERT INTO products (title, description, price, category_id, image_url, icon, delivery_type, stock, status, audit_status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 1, 'approved', NOW(), NOW()) RETURNING id
        `, [title, description || '', parseFloat(price), category_id || null, image_url || null, icon || '📦', delivery_type || 'auto']);
        res.json({ code: 200, message: '商品创建成功', data: { id: result[0]?.id || result.insertId } });
    } catch (error) {
        res.status(500).json({ code: 500, message: '创建商品失败' });
    }
});

router.put('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, price, category_id, image_url, icon, status, delivery_type } = req.body;
        await db.query(`
            UPDATE products SET title = COALESCE($1, title), description = COALESCE($2, description),
            price = COALESCE($3, price), category_id = COALESCE($4, category_id), image_url = COALESCE($5, image_url),
            icon = COALESCE($6, icon), status = COALESCE($7, status), delivery_type = COALESCE($8, delivery_type), updated_at = NOW() WHERE id = $9
        `, [title, description, price ? parseFloat(price) : null, category_id, image_url, icon, status, delivery_type, id]);
        res.json({ code: 200, message: '商品更新成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '更新商品失败' });
    }
});

router.delete('/products/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM card_keys WHERE product_id = $1', [id]);
        await db.query('DELETE FROM products WHERE id = $1', [id]);
        res.json({ code: 200, message: '商品已删除' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

// ==================== 卡密管理 ====================

router.get('/cardkeys/:productId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        const { status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        const params = [parseInt(productId)];
        let paramIndex = 2;

        let sql = 'SELECT * FROM card_keys WHERE product_id = $1';
        if (status !== undefined && status !== '' && status !== 'all') {
            sql += ` AND status = $${paramIndex++}`;
            params.push(parseInt(status));
        }
        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));

        const cardKeys = await db.query(sql, params);
        const stats = await db.query(`
            SELECT COUNT(*) AS total,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS sold
            FROM card_keys WHERE product_id = $1
        `, [parseInt(productId)]);

        res.json({
            code: 200,
            data: {
                list: cardKeys,
                stats: { total: parseInt(stats[0]?.total || 0), available: parseInt(stats[0]?.available || 0), sold: parseInt(stats[0]?.sold || 0) }
            }
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取卡密列表失败' });
    }
});

router.post('/cardkeys/:productId/import', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        const { cardKeys } = req.body;

        if (!cardKeys || !Array.isArray(cardKeys) || cardKeys.length === 0) {
            return res.status(400).json({ code: 400, message: '请提供卡密列表' });
        }

        const uniqueKeys = [...new Set(cardKeys.map(k => k.trim()).filter(k => k.length > 0))];
        if (uniqueKeys.length === 0) {
            return res.status(400).json({ code: 400, message: '没有有效的卡密' });
        }

        // 检查重复
        const existingKeys = await db.query(
            'SELECT card_key FROM card_keys WHERE product_id = $1 AND card_key = ANY($2)',
            [parseInt(productId), uniqueKeys]
        );
        const existingSet = new Set(existingKeys.map(k => k.card_key));
        const newKeys = uniqueKeys.filter(k => !existingSet.has(k));

        if (newKeys.length === 0) {
            return res.status(400).json({ code: 400, message: '所有卡密都已存在' });
        }

        // 批量插入
        for (const key of newKeys) {
            await db.query('INSERT INTO card_keys (product_id, card_key, status, created_at) VALUES ($1, $2, 0, NOW())', [parseInt(productId), key]);
        }

        // 更新库存
        await db.query('UPDATE products SET stock = (SELECT COUNT(*) FROM card_keys WHERE product_id = $1 AND status = 0), updated_at = NOW() WHERE id = $1', [parseInt(productId)]);

        res.json({ code: 200, message: `成功导入 ${newKeys.length} 个卡密`, data: { imported: newKeys.length, duplicates: uniqueKeys.length - newKeys.length } });
    } catch (error) {
        console.error('导入卡密失败:', error);
        res.status(500).json({ code: 500, message: '导入卡密失败' });
    }
});

router.delete('/cardkeys/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const cardKey = await db.query('SELECT * FROM card_keys WHERE id = $1', [parseInt(id)]);
        if (cardKey.length === 0) {
            return res.status(404).json({ code: 404, message: '卡密不存在' });
        }
        const productId = cardKey[0].product_id;
        await db.query('DELETE FROM card_keys WHERE id = $1', [parseInt(id)]);
        await db.query('UPDATE products SET stock = (SELECT COUNT(*) FROM card_keys WHERE product_id = $1 AND status = 0), updated_at = NOW() WHERE id = $1', [productId]);
        res.json({ code: 200, message: '卡密已删除' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '删除卡密失败' });
    }
});

router.delete('/cardkeys/product/:productId/clear', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        await db.query('DELETE FROM card_keys WHERE product_id = $1 AND status = 0', [parseInt(productId)]);
        await db.query('UPDATE products SET stock = 0, updated_at = NOW() WHERE id = $1', [parseInt(productId)]);
        res.json({ code: 200, message: '已清空未售出卡密' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '清空卡密失败' });
    }
});

// ==================== 分类管理 ====================

router.get('/categories', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM categories ORDER BY sort_order ASC');
        res.json({ code: 200, data: categories });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取分类失败' });
    }
});

router.post('/categories', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, slug, description, icon, sort_order } = req.body;
        if (!name || !slug) {
            return res.status(400).json({ code: 400, message: '分类名称和标识不能为空' });
        }
        const result = await db.query(`
            INSERT INTO categories (name, slug, description, icon, sort_order, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id
        `, [name, slug, description || '', icon || '📁', sort_order || 0]);
        res.json({ code: 200, message: '分类创建成功', data: { id: result[0]?.id || result.insertId } });
    } catch (error) {
        res.status(500).json({ code: 500, message: '创建分类失败' });
    }
});

router.delete('/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
        res.json({ code: 200, message: '分类已删除' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

// ==================== 用户管理 ====================

router.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await db.query('SELECT id, username, email, nickname, role, created_at FROM users ORDER BY created_at DESC');
        res.json({ code: 200, data: users });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取用户失败' });
    }
});

// ==================== 系统设置 ====================

router.get('/settings', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const settings = await db.query('SELECT * FROM site_settings WHERE id = 1');
        res.json({ code: 200, data: settings[0] || {} });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取设置失败' });
    }
});

router.put('/settings', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const fields = ['site_name', 'site_description', 'contact_email', 'contact_phone', 'contact_wechat', 
            'contact_qr_url', 'footer_text', 'theme_color', 'bg_color', 'site_logo_url', 'favicon_url', 'page_title'];
        const updateFields = [];
        const params = [];
        let paramIndex = 1;

        fields.forEach(f => {
            if (req.body[f] !== undefined) {
                updateFields.push(`${f} = $${paramIndex++}`);
                params.push(req.body[f] || null);
            }
        });

        if (updateFields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }

        params.push(1);
        await db.query(`UPDATE site_settings SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`, params);
        res.json({ code: 200, message: '设置已更新' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ code: 500, message: '更新失败' });
    }
});

// ==================== 账号管理 ====================

router.get('/account', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await db.query('SELECT id, username, email, created_at FROM users WHERE id = $1', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ code: 404, message: '用户不存在' });
        res.json({ code: 200, data: users[0] });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取账户信息失败' });
    }
});

router.put('/account', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { username, email, current_password } = req.body;
        if (!current_password) return res.status(400).json({ code: 400, message: '请输入当前密码' });

        const users = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ code: 404, message: '用户不存在' });

        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) return res.status(400).json({ code: 400, message: '当前密码错误' });

        const updateFields = [];
        const params = [];
        let paramIndex = 1;

        if (username) {
            const existing = await db.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, req.user.id]);
            if (existing.length > 0) return res.status(400).json({ code: 400, message: '用户名已被使用' });
            updateFields.push(`username = $${paramIndex++}`);
            params.push(username);
        }
        if (email) {
            const existing = await db.query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, req.user.id]);
            if (existing.length > 0) return res.status(400).json({ code: 400, message: '邮箱已被使用' });
            updateFields.push(`email = $${paramIndex++}`);
            params.push(email);
        }

        if (updateFields.length === 0) return res.status(400).json({ code: 400, message: '没有要更新的字段' });

        params.push(req.user.id);
        await db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`, params);
        res.json({ code: 200, message: '账户信息更新成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '更新账户信息失败' });
    }
});

router.put('/password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({ code: 400, message: '请填写所有密码字段' });
        }
        if (new_password !== confirm_password) {
            return res.status(400).json({ code: 400, message: '两次输入的新密码不一致' });
        }
        if (new_password.length < 6) {
            return res.status(400).json({ code: 400, message: '新密码长度不能少于6位' });
        }

        const users = await db.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
        if (users.length === 0) return res.status(404).json({ code: 404, message: '用户不存在' });

        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) return res.status(400).json({ code: 400, message: '当前密码错误' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        await db.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, req.user.id]);
        res.json({ code: 200, message: '密码修改成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '修改密码失败' });
    }
});

// ==================== 公告管理 ====================

router.get('/announcements', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const announcements = await db.query('SELECT * FROM announcements ORDER BY sort_order ASC, created_at DESC');
        res.json({ code: 200, data: announcements });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取公告失败' });
    }
});

router.post('/announcements', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { type, content, media_url, link, bg_color, status, sort_order } = req.body;
        if (!content) return res.status(400).json({ code: 400, message: '公告内容不能为空' });

        const result = await db.query(`
            INSERT INTO announcements (type, content, media_url, link, bg_color, status, sort_order, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING id
        `, [type || 'text', content, media_url || null, link || null, bg_color || '#6366f1', status !== undefined ? status : 1, sort_order || 0]);
        res.json({ code: 200, message: '公告创建成功', data: { id: result[0]?.id || result.insertId } });
    } catch (error) {
        res.status(500).json({ code: 500, message: '创建公告失败' });
    }
});

router.put('/announcements/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { type, content, media_url, link, bg_color, status, sort_order } = req.body;
        const fields = [];
        const params = [];
        let paramIndex = 1;

        if (type !== undefined) { fields.push(`type = $${paramIndex++}`); params.push(type); }
        if (content !== undefined) { fields.push(`content = $${paramIndex++}`); params.push(content); }
        if (media_url !== undefined) { fields.push(`media_url = $${paramIndex++}`); params.push(media_url || null); }
        if (link !== undefined) { fields.push(`link = $${paramIndex++}`); params.push(link || null); }
        if (bg_color !== undefined) { fields.push(`bg_color = $${paramIndex++}`); params.push(bg_color); }
        if (status !== undefined) { fields.push(`status = $${paramIndex++}`); params.push(status); }
        if (sort_order !== undefined) { fields.push(`sort_order = $${paramIndex++}`); params.push(sort_order); }

        if (fields.length === 0) return res.status(400).json({ code: 400, message: '没有要更新的字段' });

        params.push(parseInt(id));
        await db.query(`UPDATE announcements SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`, params);
        res.json({ code: 200, message: '公告更新成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '更新公告失败' });
    }
});

router.delete('/announcements/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM announcements WHERE id = $1', [parseInt(req.params.id)]);
        res.json({ code: 200, message: '公告已删除' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

module.exports = router;
