/**
 * ========================================
 * 卖家中心路由
 * Seller Center Routes
 * ========================================
 * 
 * 包含：
 * - 卖家入驻申请
 * - 卖家商品管理（含审核机制）
 * - 卖家卡密管理
 * - 卖家订单查看
 * - 卖家钱包 & 提现
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, verifySeller } = require('../middleware/auth');
const { createWithdrawalRequest, calculateWithdrawalFee, getWithdrawalFeeConfig } = require('../utils/finance');

// ========== 卖家入驻申请 ==========

/**
 * POST /apply
 * 提交卖家入驻申请
 */
router.post('/apply', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { realName, shopName, shopDescription, contactPhone, contactWechat, reason } = req.body;

        if (!realName || !shopName) {
            return res.status(400).json({ code: 400, message: '真实姓名和店铺名称为必填项' });
        }

        // 检查用户当前状态
        const users = await db.query('SELECT role, seller_status FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        if (users[0].role === 'seller' && users[0].seller_status === 'approved') {
            return res.status(400).json({ code: 400, message: '您已经是卖家' });
        }

        // 检查是否有待审核的申请
        const pending = await db.query(
            'SELECT id FROM seller_applications WHERE user_id = ? AND status = ?',
            [userId, 'pending']
        );
        if (pending.length > 0) {
            return res.status(400).json({ code: 400, message: '您已有一个待审核的申请' });
        }

        // 创建申请
        await db.query(
            `INSERT INTO seller_applications (user_id, real_name, shop_name, shop_description, contact_phone, contact_wechat, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, realName.trim(), shopName.trim(), shopDescription || null, contactPhone || null, contactWechat || null, reason || null]
        );

        // 更新用户的 seller_status 为 pending
        await db.query('UPDATE users SET seller_status = ? WHERE id = ?', ['pending', userId]);

        res.json({ code: 200, message: '申请已提交，请等待审核' });
    } catch (error) {
        console.error('提交卖家申请失败:', error);
        res.status(500).json({ code: 500, message: '提交失败' });
    }
});

/**
 * GET /apply/status
 * 查看申请状态
 */
router.get('/apply/status', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const users = await db.query('SELECT role, seller_status FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        // 获取最近一条申请
        const apps = await db.query(
            'SELECT * FROM seller_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [userId]
        );

        res.json({
            code: 200,
            data: {
                role: users[0].role,
                sellerStatus: users[0].seller_status || 'none',
                application: apps.length > 0 ? apps[0] : null
            }
        });
    } catch (error) {
        console.error('获取申请状态失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

// ========== 卖家商品管理 ==========

/**
 * GET /products
 * 获取卖家自己的商品列表
 */
router.get('/products', verifyToken, verifySeller, async (req, res) => {
    try {
        const { audit_status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const sellerId = req.user.id;

        let sql = 'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.seller_id = ?';
        let countSql = 'SELECT COUNT(*) AS total FROM products WHERE seller_id = ?';
        const params = [sellerId];

        if (audit_status) {
            sql += ' AND p.audit_status = ?';
            countSql += ' AND audit_status = ?';
            params.push(audit_status);
        }

        sql += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';

        const [products, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);

        // 获取每个商品的库存统计
        for (const p of products) {
            const stock = await db.query(
                'SELECT COUNT(*) AS available FROM card_keys WHERE product_id = ? AND status = 0',
                [p.id]
            );
            p.available_keys = stock[0]?.available || 0;
        }

        res.json({
            code: 200,
            data: {
                list: products,
                total: countResult[0]?.total || 0,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('获取卖家商品失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * POST /products
 * 卖家创建商品
 * 
 * 混合市场支持：
 * - type: 'VIRTUAL' (虚拟卡密，默认) / 'PHYSICAL' (实物商品)
 * - VIRTUAL: delivery_type=auto, 库存由卡密数量决定
 * - PHYSICAL: delivery_type=manual, 库存手动设置, 需要image_url
 * 
 * 审核逻辑：
 * - 检查卖家 canSkipAudit 权限
 * - canSkipAudit=true: audit_status='approved'（直接上架）
 * - canSkipAudit=false: audit_status='pending'（等待管理员审核）
 */
router.post('/products', verifyToken, verifySeller, async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { category_id, delivery_type, type, title, description, detail, icon, image_url, price, stock, specs } = req.body;

        if (!title || price === undefined) {
            return res.status(400).json({ code: 400, message: '标题和价格不能为空' });
        }

        // 商品类型：VIRTUAL(默认) / PHYSICAL
        const productType = type === 'PHYSICAL' ? 'PHYSICAL' : 'VIRTUAL';

        // PHYSICAL 商品必须有图片
        if (productType === 'PHYSICAL' && !image_url) {
            return res.status(400).json({ code: 400, message: '实物商品必须上传商品图片' });
        }

        const finalCategoryId = category_id || 1;

        // 根据商品类型决定发货方式和库存逻辑
        let dtype, initialStock;
        if (productType === 'PHYSICAL') {
            // 实物商品：强制手动发货，库存手动设置
            dtype = 'manual';
            initialStock = Number(stock) || 0;
        } else {
            // 虚拟商品：沿用原有逻辑
            dtype = delivery_type === 'manual' ? 'manual' : 'auto';
            initialStock = dtype === 'manual' ? (Number(stock) || 0) : 0;
        }

        let specsJson = null;
        if (specs) {
            specsJson = typeof specs === 'string' ? specs : JSON.stringify(specs);
        }

        // ========== 审核逻辑：检查 canSkipAudit 权限 ==========
        let auditStatus = 'pending';
        let auditMessage = '商品已创建，等待管理员审核';

        const userInfo = await db.query(
            'SELECT can_skip_audit FROM users WHERE id = ?',
            [sellerId]
        );
        if (userInfo.length > 0 && userInfo[0].can_skip_audit) {
            auditStatus = 'approved';
            auditMessage = '商品已创建并直接上架（免审核权限）';
        }
        // ==========================================================

        const result = await db.query(
            `INSERT INTO products (category_id, seller_id, delivery_type, type, title, description, detail, icon, image_url, price, stock, specs, audit_status, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [Number(finalCategoryId), sellerId, dtype, productType, String(title), description || null, detail || null, icon || '📦', image_url || null, Number(price), initialStock, specsJson, auditStatus]
        );

        res.status(201).json({
            code: 200,
            message: auditMessage,
            data: { id: result.insertId, type: productType, audit_status: auditStatus }
        });
    } catch (error) {
        console.error('创建商品失败:', error);
        res.status(500).json({ code: 500, message: '创建失败' });
    }
});

/**
 * PUT /products/:id
 * 卖家编辑商品（需验证所有权，编辑后重新审核）
 */
router.put('/products/:id', verifyToken, verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        // 验证所有权
        const products = await db.query('SELECT id, delivery_type, type, seller_id FROM products WHERE id = ? AND seller_id = ?', [Number(id), sellerId]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在或无权操作' });
        }

        const { category_id, delivery_type, type, title, description, detail, icon, image_url, price, stock, specs } = req.body;
        const currentDeliveryType = products[0].delivery_type || 'auto';
        const currentProductType = products[0].type || 'VIRTUAL';
        const updateFields = [];
        const params = [];

        // 更新商品类型
        if (type !== undefined && ['VIRTUAL', 'PHYSICAL'].includes(type)) {
            updateFields.push('type = ?'); params.push(type);
            if (type === 'PHYSICAL') {
                updateFields.push("delivery_type = 'manual'");
            }
        }

        if (delivery_type !== undefined && ['auto', 'manual'].includes(delivery_type)) {
            const effectiveProductType = type || currentProductType;
            if (effectiveProductType === 'PHYSICAL' && delivery_type === 'auto') {
                return res.status(400).json({ code: 400, message: '实物商品不支持自动发货' });
            }
            updateFields.push('delivery_type = ?'); params.push(delivery_type);
        }
        if (category_id !== undefined) { updateFields.push('category_id = ?'); params.push(Number(category_id)); }
        if (title !== undefined) { updateFields.push('title = ?'); params.push(String(title)); }
        if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
        if (detail !== undefined) { updateFields.push('detail = ?'); params.push(detail); }
        if (icon !== undefined) { updateFields.push('icon = ?'); params.push(icon); }
        if (image_url !== undefined) { updateFields.push('image_url = ?'); params.push(image_url); }
        if (price !== undefined) { updateFields.push('price = ?'); params.push(Number(price)); }
        // 手动发货类型允许直接设置库存
        const effectiveDeliveryType = delivery_type || currentDeliveryType;
        if (stock !== undefined && effectiveDeliveryType === 'manual') {
            updateFields.push('stock = ?'); params.push(Number(stock));
        }
        if (specs !== undefined) {
            const specsJson = typeof specs === 'string' ? specs : JSON.stringify(specs);
            updateFields.push('specs = ?');
            params.push(specsJson);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }

        // 编辑后审核逻辑：检查 canSkipAudit
        const userInfo = await db.query('SELECT can_skip_audit FROM users WHERE id = ?', [sellerId]);
        if (userInfo.length > 0 && userInfo[0].can_skip_audit) {
            updateFields.push("audit_status = 'approved'");
        } else {
            updateFields.push("audit_status = 'pending'");
        }
        updateFields.push('audit_feedback = NULL');

        params.push(Number(id), sellerId);
        await db.query(
            `UPDATE products SET ${updateFields.join(', ')} WHERE id = ? AND seller_id = ?`,
            params
        );

        res.json({ code: 200, message: '商品已更新，等待重新审核' });
    } catch (error) {
        console.error('更新商品失败:', error);
        res.status(500).json({ code: 500, message: '更新失败' });
    }
});

/**
 * DELETE /products/:id
 * 卖家删除商品（需验证所有权）
 */
router.delete('/products/:id', verifyToken, verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        const products = await db.query('SELECT * FROM products WHERE id = ? AND seller_id = ?', [Number(id), sellerId]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在或无权操作' });
        }

        // 检查是否有已完成的订单
        const orders = await db.query(
            "SELECT COUNT(*) AS cnt FROM orders WHERE product_id = ? AND status IN ('paid', 'delivered', 'completed')",
            [Number(id)]
        );
        if (orders[0].cnt > 0) {
            return res.status(400).json({ code: 400, message: '该商品有已完成订单，无法删除，请下架' });
        }

        // 删除卡密
        await db.query('DELETE FROM card_keys WHERE product_id = ?', [Number(id)]);
        // 删除商品
        await db.query('DELETE FROM products WHERE id = ? AND seller_id = ?', [Number(id), sellerId]);

        res.json({ code: 200, message: '商品已删除' });
    } catch (error) {
        console.error('删除商品失败:', error);
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

// ========== 卖家卡密管理 ==========

/**
 * GET /cardkeys/:productId
 * 获取卖家商品的卡密列表
 */
router.get('/cardkeys/:productId', verifyToken, verifySeller, async (req, res) => {
    try {
        const { productId } = req.params;
        const sellerId = req.user.id;

        // 验证商品所有权
        const products = await db.query('SELECT id FROM products WHERE id = ? AND seller_id = ?', [Number(productId), sellerId]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在或无权操作' });
        }

        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const [cardKeys, countResult, stats] = await Promise.all([
            db.query('SELECT * FROM card_keys WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', [Number(productId), Number(limit), Number(offset)]),
            db.query('SELECT COUNT(*) AS total FROM card_keys WHERE product_id = ?', [Number(productId)]),
            db.query(`SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS sold
                FROM card_keys WHERE product_id = ?`, [Number(productId)])
        ]);

        res.json({
            code: 200,
            data: {
                list: cardKeys,
                stats: stats[0] || { total: 0, available: 0, sold: 0 },
                pagination: { page: Number(page), limit: Number(limit), total: countResult[0]?.total || 0 }
            }
        });
    } catch (error) {
        console.error('获取卡密失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * POST /cardkeys/:productId/import
 * 卖家导入卡密
 */
router.post('/cardkeys/:productId/import', verifyToken, verifySeller, async (req, res) => {
    try {
        const { productId } = req.params;
        const sellerId = req.user.id;

        // 验证商品所有权
        const products = await db.query('SELECT id FROM products WHERE id = ? AND seller_id = ?', [Number(productId), sellerId]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在或无权操作' });
        }

        let { card_keys } = req.body;
        if (!card_keys) {
            return res.status(400).json({ code: 400, message: '请提供卡密内容' });
        }

        let keyList = [];
        if (Array.isArray(card_keys)) {
            keyList = card_keys;
        } else if (typeof card_keys === 'string') {
            keyList = card_keys.split(/[;；\n\r]+/).map(k => k.trim()).filter(k => k);
        }

        // 限制单次导入数量，防止内存耗尽
        const MAX_IMPORT = 5000;
        if (keyList.length === 0) {
            return res.status(400).json({ code: 400, message: '未解析到有效卡密' });
        }
        if (keyList.length > MAX_IMPORT) {
            return res.status(400).json({ code: 400, message: `单次最多导入 ${MAX_IMPORT} 个卡密，当前 ${keyList.length} 个` });
        }

        // 检查重复数量（仅提示，不阻止）
        const existingKeys = await db.query('SELECT card_key FROM card_keys WHERE product_id = ?', [Number(productId)]);
        const existingSet = new Set(existingKeys.map(k => k.card_key));
        const duplicateCount = keyList.filter(k => existingSet.has(k)).length;

        // 导入所有卡密（包括重复的）
        const insertValues = keyList.map(key => [Number(productId), key, 0]);
        await db.query('INSERT INTO card_keys (product_id, card_key, status) VALUES ?', [insertValues]);

        // 更新库存
        const stockResult = await db.query(
            'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
            [Number(productId)]
        );
        await db.query('UPDATE products SET stock = ? WHERE id = ?', [stockResult[0].count, Number(productId)]);

        const msg = duplicateCount > 0
            ? '导入 ' + keyList.length + ' 个卡密（' + duplicateCount + ' 个与已有重复）'
            : '导入 ' + keyList.length + ' 个卡密';
        res.json({
            code: 200,
            message: msg,
            data: { imported: keyList.length, duplicates: duplicateCount, newStock: stockResult[0].count }
        });
    } catch (error) {
        console.error('导入卡密失败:', error);
        res.status(500).json({ code: 500, message: '导入失败' });
    }
});

/**
 * DELETE /cardkeys/:id
 * 删除单个卡密（验证所有权）
 */
router.delete('/cardkeys/:id', verifyToken, verifySeller, async (req, res) => {
    try {
        const { id } = req.params;
        const sellerId = req.user.id;

        const cardKeys = await db.query(
            `SELECT ck.*, p.seller_id FROM card_keys ck 
             JOIN products p ON ck.product_id = p.id 
             WHERE ck.id = ? AND p.seller_id = ?`,
            [Number(id), sellerId]
        );
        if (cardKeys.length === 0) {
            return res.status(404).json({ code: 404, message: '卡密不存在或无权操作' });
        }
        // 允许删除已售出的卡密记录

        const productId = cardKeys[0].product_id;
        await db.query('DELETE FROM card_keys WHERE id = ?', [Number(id)]);

        // 更新库存
        const stockResult = await db.query(
            'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
            [productId]
        );
        await db.query('UPDATE products SET stock = ? WHERE id = ?', [stockResult[0].count, productId]);

        res.json({ code: 200, message: '卡密已删除' });
    } catch (error) {
        console.error('删除卡密失败:', error);
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

// ========== 卖家订单 ==========

/**
 * GET /orders
 * 获取卖家的订单列表
 */
router.get('/orders', verifyToken, verifySeller, async (req, res) => {
    try {
        const sellerId = req.user.id;
        const { status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM orders WHERE seller_id = ?';
        let countSql = 'SELECT COUNT(*) AS total FROM orders WHERE seller_id = ?';
        const params = [sellerId];

        if (status) {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(status);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

        const [orders, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);

        res.json({
            code: 200,
            data: {
                list: orders,
                total: countResult[0]?.total || 0,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('获取卖家订单失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * GET /orders/stats
 * 获取卖家的收入统计
 */
router.get('/orders/stats', verifyToken, verifySeller, async (req, res) => {
    try {
        const sellerId = req.user.id;

        const stats = await db.query(`
            SELECT 
                COUNT(*) AS total_orders,
                SUM(CASE WHEN status IN ('paid', 'delivered', 'completed') THEN 1 ELSE 0 END) AS paid_orders,
                COALESCE(SUM(CASE WHEN status IN ('paid', 'delivered', 'completed') THEN total_price ELSE 0 END), 0) AS total_revenue,
                COALESCE(SUM(CASE WHEN status IN ('paid', 'delivered', 'completed') THEN commission_amount ELSE 0 END), 0) AS total_commission,
                COALESCE(SUM(CASE WHEN status IN ('paid', 'delivered', 'completed') THEN seller_amount ELSE 0 END), 0) AS total_earnings
            FROM orders WHERE seller_id = ?
        `, [sellerId]);

        res.json({ code: 200, data: stats[0] });
    } catch (error) {
        console.error('获取订单统计失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

// ========== 卖家钱包 ==========

/**
 * GET /wallet
 * 获取钱包信息
 */
router.get('/wallet', verifyToken, verifySeller, async (req, res) => {
    try {
        const userId = req.user.id;

        let wallets = await db.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
        
        // 如果钱包不存在则自动创建
        if (wallets.length === 0) {
            await db.query('INSERT INTO wallets (user_id) VALUES (?)', [userId]);
            wallets = await db.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
        }

        res.json({ code: 200, data: wallets[0] });
    } catch (error) {
        console.error('获取钱包信息失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * GET /wallet/transactions
 * 获取交易记录
 */
router.get('/wallet/transactions', verifyToken, verifySeller, async (req, res) => {
    try {
        const userId = req.user.id;
        const { type, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let sql = 'SELECT * FROM transactions WHERE user_id = ?';
        let countSql = 'SELECT COUNT(*) AS total FROM transactions WHERE user_id = ?';
        const params = [userId];

        if (type) {
            sql += ' AND type = ?';
            countSql += ' AND type = ?';
            params.push(type);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

        const [transactions, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);

        res.json({
            code: 200,
            data: {
                list: transactions,
                total: countResult[0]?.total || 0,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('获取交易记录失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * GET /wallet/fee-preview
 * 预览提现手续费（前端实时计算用）
 */
router.get('/wallet/fee-preview', verifyToken, verifySeller, async (req, res) => {
    try {
        const amount = parseFloat(req.query.amount) || 0;
        if (amount <= 0) {
            return res.json({ code: 200, data: { feeAmount: 0, actualAmount: 0, feePercent: 0, minFee: 0 } });
        }
        const config = await getWithdrawalFeeConfig();
        const { feeAmount, actualAmount } = await calculateWithdrawalFee(amount);
        res.json({
            code: 200,
            data: { feeAmount, actualAmount, feePercent: config.feePercent, minFee: config.minFee }
        });
    } catch (error) {
        console.error('手续费预览失败:', error);
        res.status(500).json({ code: 500, message: '计算失败' });
    }
});

/**
 * POST /wallet/withdraw
 * 提交提现申请（需验证支付密码）
 */
router.post('/wallet/withdraw', verifyToken, verifySeller, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, paymentMethod, accountName, accountNumber, paymentPassword } = req.body;

        if (!amount || !paymentMethod || !accountName || !accountNumber) {
            return res.status(400).json({ code: 400, message: '请填写完整的提现信息' });
        }

        // 验证支付密码
        if (!paymentPassword) {
            return res.status(400).json({ code: 400, message: '请输入支付密码' });
        }

        const users = await db.query('SELECT payment_password_hash FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        if (!users[0].payment_password_hash) {
            return res.status(400).json({ code: 400, message: '请先在安全中心设置支付密码', needSetup: true });
        }

        const isMatch = await bcrypt.compare(paymentPassword, users[0].payment_password_hash);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '支付密码错误' });
        }

        // 支付密码验证通过，执行提现
        const result = await createWithdrawalRequest(userId, parseFloat(amount), paymentMethod, accountName, accountNumber);

        if (!result.success) {
            return res.status(400).json({ code: 400, message: result.message });
        }

        res.json({
            code: 200,
            message: '提现申请已提交',
            data: { feeAmount: result.feeAmount, actualAmount: result.actualAmount }
        });
    } catch (error) {
        console.error('提现申请失败:', error);
        res.status(500).json({ code: 500, message: '提现失败' });
    }
});

/**
 * GET /wallet/withdrawals
 * 获取提现记录
 */
router.get('/wallet/withdrawals', verifyToken, verifySeller, async (req, res) => {
    try {
        const userId = req.user.id;
        const withdrawals = await db.query(
            'SELECT * FROM withdrawal_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
            [userId]
        );
        res.json({ code: 200, data: withdrawals });
    } catch (error) {
        console.error('获取提现记录失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * GET /dashboard
 * 卖家仪表盘数据
 */
router.get('/dashboard', verifyToken, verifySeller, async (req, res) => {
    try {
        const sellerId = req.user.id;

        const [productStats, orderStats, walletData, recentOrders] = await Promise.all([
            db.query(`SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN audit_status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN audit_status = 'approved' AND status = 1 THEN 1 ELSE 0 END) AS live,
                SUM(CASE WHEN audit_status = 'rejected' THEN 1 ELSE 0 END) AS rejected
                FROM products WHERE seller_id = ?`, [sellerId]),
            db.query(`SELECT 
                COUNT(*) AS total_orders,
                COALESCE(SUM(CASE WHEN status IN ('paid','delivered','completed') THEN seller_amount ELSE 0 END), 0) AS total_earnings
                FROM orders WHERE seller_id = ?`, [sellerId]),
            db.query('SELECT * FROM wallets WHERE user_id = ?', [sellerId]),
            db.query('SELECT * FROM orders WHERE seller_id = ? ORDER BY created_at DESC LIMIT 5', [sellerId])
        ]);

        res.json({
            code: 200,
            data: {
                products: productStats[0],
                orders: orderStats[0],
                wallet: walletData[0] || { balance: 0, frozen_balance: 0, total_earned: 0 },
                recentOrders: recentOrders
            }
        });
    } catch (error) {
        console.error('获取仪表盘数据失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

module.exports = router;
