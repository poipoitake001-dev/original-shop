/**
 * ========================================
 * 订单控制器
 * Order Controller
 * ========================================
 */

const db = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { creditSellerWallet } = require('../utils/finance');
const { onOrderCompleted } = require('../utils/reputation');

/**
 * 生成订单号
 */
function generateOrderNo() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    return 'SC' + year + month + day + random;
}

/**
 * 创建订单
 * POST /api/orders
 */
async function createOrder(req, res) {
    try {
        const { product_id, spec, quantity, email } = req.body;
        
        // 获取用户ID（可能为空，支持游客购买）
        const userId = req.user ? req.user.id : null;
        
        // 参数验证
        if (!product_id || !quantity || !email) {
            return res.status(400).json({
                code: 400,
                message: '商品ID、数量和邮箱不能为空'
            });
        }
        
        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                code: 400,
                message: '邮箱格式不正确'
            });
        }
        
        // 获取商品信息（含商品类型）
        const products = await db.query(
            "SELECT * FROM products WHERE id = ? AND status = 1 AND audit_status = 'approved'",
            [Number(product_id)]
        );
        
        if (products.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '商品不存在或已下架'
            });
        }
        
        const product = products[0];
        const productType = product.type || 'VIRTUAL';
        const qty = Number(quantity);
        
        // 检查库存
        if (product.stock < qty) {
            return res.status(400).json({
                code: 400,
                message: '商品库存不足'
            });
        }
        
        // 计算价格
        const unitPrice = parseFloat(product.price);
        const totalPrice = unitPrice * qty;
        
        // 卖家ID（提现手续费模式：卖家收取100%，不再计算佣金）
        const sellerId = product.seller_id || null;

        // 生成订单号
        const orderNo = generateOrderNo();
        
        // 创建订单
        const orderId = await db.insert(`
            INSERT INTO orders 
            (order_no, user_id, product_id, seller_id, product_title, spec, quantity, unit_price, total_price, commission_amount, seller_amount, email, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending')
        `, [
            orderNo,
            userId,
            Number(product_id),
            sellerId,
            String(product.title),
            spec || null,
            qty,
            unitPrice,
            totalPrice,
            totalPrice, // seller_amount = 100% of total_price
            String(email)
        ]);
        
        // 扣减库存
        await db.update(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [qty, Number(product_id)]
        );
        
        res.status(201).json({
            code: 200,
            message: '订单创建成功',
            data: {
                id: orderId,
                order_no: orderNo,
                product_title: product.title,
                product_type: productType,
                spec: spec,
                quantity: qty,
                unit_price: unitPrice,
                total_price: totalPrice,
                email: email,
                status: 'pending'
            }
        });
    } catch (error) {
        console.error('创建订单失败:', error);
        res.status(500).json({
            code: 500,
            message: '创建订单失败：' + error.message
        });
    }
}

/**
 * 获取订单列表（管理员）
 * GET /api/orders
 */
async function getOrders(req, res) {
    try {
        const { status, page, pageSize, email, order_no } = req.query;
        
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const offset = (pageNum - 1) * pageSizeNum;
        
        let sql = `
            SELECT o.*, u.username
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            WHERE 1=1
        `;
        let countSql = 'SELECT COUNT(*) AS total FROM orders WHERE 1=1';
        const params = [];
        const countParams = [];
        
        // 按状态筛选
        if (status) {
            sql += ' AND o.status = ?';
            countSql += ' AND status = ?';
            params.push(String(status));
            countParams.push(String(status));
        }
        
        // 按邮箱筛选
        if (email) {
            sql += ' AND o.email LIKE ?';
            countSql += ' AND email LIKE ?';
            const likeEmail = '%' + String(email) + '%';
            params.push(likeEmail);
            countParams.push(likeEmail);
        }
        
        // 按订单号筛选
        if (order_no) {
            sql += ' AND o.order_no LIKE ?';
            countSql += ' AND order_no LIKE ?';
            const likeOrderNo = '%' + String(order_no) + '%';
            params.push(likeOrderNo);
            countParams.push(likeOrderNo);
        }
        
        // 排序
        sql += ' ORDER BY o.created_at DESC';
        
        // 分页
        sql += ' LIMIT ' + pageSizeNum + ' OFFSET ' + offset;
        
        const orders = await db.query(sql, params);
        const countResult = await db.query(countSql, countParams);
        const total = countResult[0] ? countResult[0].total : 0;
        
        res.json({
            code: 200,
            message: 'success',
            data: {
                list: orders,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    total: total,
                    totalPages: Math.ceil(total / pageSizeNum)
                }
            }
        });
    } catch (error) {
        console.error('获取订单列表失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取订单列表失败：' + error.message
        });
    }
}

/**
 * 获取当前用户的订单
 * GET /api/orders/my
 */
async function getMyOrders(req, res) {
    try {
        const userId = req.user.id;
        const { status, page, pageSize } = req.query;
        
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;
        const offset = (pageNum - 1) * pageSizeNum;
        
        let sql = 'SELECT * FROM orders WHERE user_id = ?';
        let countSql = 'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?';
        const params = [Number(userId)];
        const countParams = [Number(userId)];
        
        if (status) {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(String(status));
            countParams.push(String(status));
        }
        
        sql += ' ORDER BY created_at DESC';
        sql += ' LIMIT ' + pageSizeNum + ' OFFSET ' + offset;
        
        const orders = await db.query(sql, params);
        const countResult = await db.query(countSql, countParams);
        const total = countResult[0] ? countResult[0].total : 0;
        
        res.json({
            code: 200,
            message: 'success',
            data: {
                list: orders,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    total: total,
                    totalPages: Math.ceil(total / pageSizeNum)
                }
            }
        });
    } catch (error) {
        console.error('获取我的订单失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取我的订单失败：' + error.message
        });
    }
}

/**
 * 获取订单详情
 * GET /api/orders/:id
 */
async function getOrderById(req, res) {
    try {
        const { id } = req.params;
        
        const orders = await db.query(`
            SELECT o.*, u.username, p.icon AS product_icon
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.id = ?
        `, [Number(id)]);
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        res.json({
            code: 200,
            message: 'success',
            data: orders[0]
        });
    } catch (error) {
        console.error('获取订单详情失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取订单详情失败：' + error.message
        });
    }
}

/**
 * 通过订单号查询订单（公开）
 * GET /api/orders/query/:orderNo
 */
async function getOrderByNo(req, res) {
    try {
        const { orderNo } = req.params;
        
        const orders = await db.query(`
            SELECT order_no, product_title, spec, quantity, unit_price, total_price, 
                   email, status, created_at, pay_time, deliver_time
            FROM orders
            WHERE order_no = ?
        `, [String(orderNo)]);
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        res.json({
            code: 200,
            message: 'success',
            data: orders[0]
        });
    } catch (error) {
        console.error('查询订单失败:', error);
        res.status(500).json({
            code: 500,
            message: '查询订单失败：' + error.message
        });
    }
}

/**
 * 更新订单状态（管理员）
 * PATCH /api/orders/:id/status
 * 
 * 重要功能：当状态变为 paid/delivered/completed 时，自动分配卡密
 */
async function updateOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const { status, card_keys, remark } = req.body;
        
        const validStatus = ['pending', 'paid', 'awaiting_delivery', 'delivered', 'completed', 'cancelled'];
        if (!validStatus.includes(status)) {
            return res.status(400).json({
                code: 400,
                message: '无效的订单状态'
            });
        }
        
        // 检查订单是否存在
        const orders = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [Number(id)]
        );
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        const order = orders[0];
        const updateFields = ['status = ?'];
        const params = [String(status)];
        
        // 根据状态更新时间字段
        if (status === 'paid' || status === 'awaiting_delivery') {
            updateFields.push('pay_time = NOW()');
        }
        if (status === 'delivered') {
            updateFields.push('deliver_time = NOW()');
        }
        
        // ============ 获取商品信息（类型 + 发货方式） ============
        const productInfo = await db.query('SELECT delivery_type, type FROM products WHERE id = ?', [Number(order.product_id)]);
        const deliveryType = productInfo[0]?.delivery_type || 'auto';
        const productType = productInfo[0]?.type || 'VIRTUAL';
        
        let assignedCardKeys = null;
        
        // ============ 分流处理：虚拟商品 vs 实物商品 ============
        if (productType === 'PHYSICAL') {
            // ===== 实物商品：不分配卡密，状态流 PAID -> AWAITING_DELIVERY -> DELIVERED -> COMPLETED =====
            // 实物商品支付后自动进入 awaiting_delivery 状态
            if (status === 'paid') {
                // 实物商品支付成功后自动转为 awaiting_delivery
                params[0] = 'awaiting_delivery';
                updateFields[0] = 'status = ?';
            }
            // 不做任何卡密分配
        } else {
            // ===== 虚拟商品：保持原有自动发卡逻辑 =====
            // 触发条件：auto 类型 + 状态变为 paid/delivered/completed 且订单没有卡密
            const shouldAssignCardKeys = deliveryType === 'auto' && ['paid', 'delivered', 'completed'].includes(status);
            const orderHasNoCardKeys = !order.card_keys || order.card_keys === 'null' || order.card_keys === '[]';
            
            if (shouldAssignCardKeys && orderHasNoCardKeys && !card_keys) {
                const availableCardKeys = await db.query(
                    'SELECT * FROM card_keys WHERE product_id = ? AND status = 0 ORDER BY created_at ASC LIMIT ?',
                    [Number(order.product_id), Number(order.quantity)]
                );
                
                // 库存检查
                if (availableCardKeys.length < order.quantity) {
                    return res.status(400).json({
                        code: 400,
                        message: '库存不足，无法完成订单。可用卡密: ' + availableCardKeys.length + ', 需要: ' + order.quantity
                    });
                }
                
                // 原子分配：更新卡密状态
                const keyIds = availableCardKeys.map(function(k) { return k.id; });
                const assignedKeys = availableCardKeys.map(function(k) { return k.card_key; });
                
                if (keyIds.length > 0) {
                    const placeholders = keyIds.map(function() { return '?'; }).join(',');
                    await db.update(
                        'UPDATE card_keys SET status = 1, order_id = ?, sold_at = NOW() WHERE id IN (' + placeholders + ')',
                        [Number(id)].concat(keyIds.map(function(kid) { return Number(kid); }))
                    );
                    
                    // 更新商品库存
                    await db.update(
                        'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
                        [Number(order.quantity), Number(order.product_id), Number(order.quantity)]
                    );
                }
                
                assignedCardKeys = JSON.stringify(assignedKeys);
                updateFields.push('card_keys = ?');
                params.push(assignedCardKeys);
                
                console.log('自动分配卡密:', order.order_no, assignedKeys.length, '个');
            } else if (card_keys) {
                // 手动设置卡密（仅虚拟商品）
                const cardKeysJson = typeof card_keys === 'string' ? card_keys : JSON.stringify(card_keys);
                updateFields.push('card_keys = ?');
                params.push(cardKeysJson);
            }
        }
        // ============ 分流处理结束 ============
        
        // 备注
        if (remark !== undefined) {
            updateFields.push('remark = ?');
            params.push(remark);
        }
        
        params.push(Number(id));
        
        await db.update(
            'UPDATE orders SET ' + updateFields.join(', ') + ' WHERE id = ?',
            params
        );
        
        // 如果取消订单，恢复库存和卡密
        if (status === 'cancelled') {
            if (productType === 'VIRTUAL' && deliveryType === 'auto') {
                // 虚拟商品自动发卡：恢复卡密状态，重新计算库存
                await db.update(
                    'UPDATE card_keys SET status = 0, order_id = NULL, sold_at = NULL WHERE order_id = ?',
                    [Number(id)]
                );
                const stockResult = await db.query(
                    'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
                    [Number(order.product_id)]
                );
                await db.update(
                    'UPDATE products SET stock = ? WHERE id = ?',
                    [stockResult[0].count, Number(order.product_id)]
                );
            } else {
                // 实物商品或手动发货：直接恢复扣减的库存数量
                await db.update(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [Number(order.quantity), Number(order.product_id)]
                );
            }
        }
        
        // ============ 卖家入账逻辑（100% 入账，提现时扣手续费）============
        // 对于实物商品，paid 已被自动转为 awaiting_delivery，所以也要处理入账
        const shouldCreditSeller = (status === 'paid' || status === 'awaiting_delivery') && order.seller_id;
        if (shouldCreditSeller && order.seller_id) {
            try {
                await creditSellerWallet(order);
            } catch (walletErr) {
                console.error('卖家入账失败（订单已更新）:', walletErr.message);
                // 订单状态已更新，入账失败不回滚订单，但记录错误
            }
        }
        // ============ 卖家入账逻辑结束 ============

        // ============ 信誉系统：订单完成时更新统计 & 徽章 ============
        if (status === 'completed') {
            try {
                await onOrderCompleted(order);
            } catch (repErr) {
                console.error('信誉统计更新失败（订单已更新）:', repErr.message);
            }
        }
        // ============ 信誉系统结束 ============
        
        res.json({
            code: 200,
            message: '订单状态更新成功' + (assignedCardKeys ? '，已自动分配 ' + JSON.parse(assignedCardKeys).length + ' 个卡密' : ''),
            data: {
                assigned_card_keys: assignedCardKeys ? JSON.parse(assignedCardKeys) : null
            }
        });
    } catch (error) {
        console.error('更新订单状态失败:', error);
        res.status(500).json({
            code: 500,
            message: '更新订单状态失败：' + error.message
        });
    }
}

/**
 * 模拟支付完成（测试用）
 * POST /api/orders/:id/pay
 * 
 * 支付成功后自动分配卡密
 */
async function simulatePay(req, res) {
    try {
        const { id } = req.params;
        
        const orders = await db.query(
            'SELECT * FROM orders WHERE id = ? AND status = ?',
            [Number(id), 'pending']
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在或状态不正确'
            });
        }
        
        const order = orders[0];
        let cardKeysJson = null;
        let assignedCount = 0;
        
        // 检查商品发货类型和商品类型
        const prodInfo = await db.query('SELECT delivery_type, type FROM products WHERE id = ?', [Number(order.product_id)]);
        const dtype = prodInfo[0]?.delivery_type || 'auto';
        const pType = prodInfo[0]?.type || 'VIRTUAL';
        
        // 实物商品：不分配卡密，直接进入 awaiting_delivery 状态
        const isPhysical = pType === 'PHYSICAL';
        
        // 仅虚拟商品 + 自动发卡类型分配卡密
        if (!isPhysical && dtype === 'auto') {
            const availableCardKeys = await db.query(
                'SELECT * FROM card_keys WHERE product_id = ? AND status = 0 ORDER BY created_at ASC LIMIT ?',
                [Number(order.product_id), Number(order.quantity)]
            );
            
            if (availableCardKeys.length >= order.quantity) {
                const assignedKeys = [];
                const keyIds = [];
                for (const cardKey of availableCardKeys) {
                    assignedKeys.push(cardKey.card_key);
                    keyIds.push(cardKey.id);
                }
                if (keyIds.length > 0) {
                    const placeholders = keyIds.map(() => '?').join(',');
                    await db.update(
                        `UPDATE card_keys SET status = 1, order_id = ?, sold_at = NOW() WHERE id IN (${placeholders})`,
                        [Number(order.id), ...keyIds.map(id => Number(id))]
                    );
                }
                cardKeysJson = JSON.stringify(assignedKeys);
                assignedCount = assignedKeys.length;
                console.log('模拟支付: 已分配卡密', order.order_no, assignedKeys.length, '个');
            } else {
                console.warn('模拟支付: 卡密不足', order.order_no, '可用:', availableCardKeys.length, '需要:', order.quantity);
            }
        }
        
        // 更新订单状态：实物商品->awaiting_delivery，虚拟商品->paid
        const newStatus = isPhysical ? 'awaiting_delivery' : 'paid';
        const updateFields = ['status = ?', 'pay_time = NOW()'];
        const updateParams = [newStatus];
        
        if (cardKeysJson) {
            updateFields.push('card_keys = ?');
            updateParams.push(cardKeysJson);
        }
        
        updateParams.push(Number(id));
        
        await db.update(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
        );
        
        // 卖家入账（100%）
        if (order.seller_id) {
            try { await creditSellerWallet(order); } catch (e) { console.error('模拟支付: 入账失败:', e.message); }
        }
        
        res.json({
            code: 200,
            message: isPhysical ? '支付成功（模拟），实物商品等待发货' : '支付成功（模拟）',
            data: {
                status: newStatus,
                product_type: pType,
                card_keys: cardKeysJson ? JSON.parse(cardKeysJson) : null,
                assigned_count: assignedCount
            }
        });
    } catch (error) {
        console.error('模拟支付失败:', error);
        res.status(500).json({
            code: 500,
            message: '模拟支付失败：' + error.message
        });
    }
}

/**
 * 支付通知回调（Webhook）
 * POST /api/payment/notify
 * 
 * 该接口由支付网关调用，用于通知支付结果
 * 
 * 请求体示例:
 * {
 *   order_no: string,      // 订单号
 *   payment_id?: string,   // 支付平台交易号
 *   status: string,        // 支付状态: 'SUCCESS' | 'FAILED'
 *   amount?: number,       // 支付金额
 *   timestamp?: number,    // 时间戳
 *   signature?: string     // 签名
 * }
 */
async function paymentNotify(req, res) {
    try {
        const { order_no, payment_id, status, amount, timestamp, signature } = req.body;
        
        // TODO: Verify signature based on payment provider SDK
        // 签名验证占位逻辑 - 根据实际支付提供商SDK实现
        // 
        // 支付宝示例:
        // const isValid = alipay.checkNotifySign(req.body);
        // 
        // 微信支付示例:
        // const isValid = wxpay.verifySign(req.body);
        // 
        // Stripe示例:
        // const sig = req.headers['stripe-signature'];
        // const event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
        //
        if (!verifyPaymentSignature(req.body, signature)) {
            console.warn('支付通知: 签名验证失败', order_no);
            // 生产环境应拒绝无效签名
            // return res.status(401).send('FAIL');
        }
        
        // 验证必填字段
        if (!order_no) {
            console.error('支付通知: 缺少订单号');
            return res.status(400).send('FAIL');
        }
        
        // 查找订单
        const orders = await db.query(
            'SELECT o.*, p.id as prod_id FROM orders o LEFT JOIN products p ON o.product_id = p.id WHERE o.order_no = ?',
            [String(order_no)]
        );
        
        if (orders.length === 0) {
            console.error('支付通知: 订单不存在', order_no);
            return res.status(404).send('FAIL');
        }
        
        const order = orders[0];
        
        // 检查订单是否已处理
        if (order.status === 'paid' || order.status === 'delivered' || order.status === 'completed') {
            console.log('支付通知: 订单已处理', order_no);
            return res.status(200).send('success');
        }
        
        // 判断支付状态
        const paymentSuccess = status === 'SUCCESS' || status === 'success' || 
                              status === 'TRADE_SUCCESS' || status === 'TRADE_FINISHED';
        
        if (!paymentSuccess) {
            // 支付失败 - 更新订单状态
            await db.update(
                'UPDATE orders SET status = ?, remark = ? WHERE id = ?',
                ['cancelled', '支付失败: ' + (status || 'unknown'), Number(order.id)]
            );
            
            // 恢复库存
            await db.update(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                [Number(order.quantity), Number(order.product_id)]
            );
            
            console.log('支付通知: 支付失败', order_no);
            return res.status(200).send('success');
        }
        
        // 支付成功 - 处理卡密分配（仅虚拟商品 + 自动发卡类型）
        let cardKeysJson = null;
        
        const pInfo = await db.query('SELECT delivery_type, type FROM products WHERE id = ?', [Number(order.product_id)]);
        const pDeliveryType = pInfo[0]?.delivery_type || 'auto';
        const pProductType = pInfo[0]?.type || 'VIRTUAL';
        const isPhysicalOrder = pProductType === 'PHYSICAL';
        
        // 仅虚拟商品分配卡密
        if (!isPhysicalOrder && pDeliveryType === 'auto') {
            const availableCardKeys = await db.query(
                'SELECT * FROM card_keys WHERE product_id = ? AND status = 0 ORDER BY created_at ASC LIMIT ?',
                [Number(order.product_id), Number(order.quantity)]
            );
            
            if (availableCardKeys.length > 0) {
                const assignedKeys = [];
                const keyIds = [];
                for (const cardKey of availableCardKeys) {
                    assignedKeys.push(cardKey.card_key);
                    keyIds.push(cardKey.id);
                }
                if (keyIds.length > 0) {
                    const placeholders = keyIds.map(() => '?').join(',');
                    await db.update(
                        `UPDATE card_keys SET status = 1, order_id = ?, sold_at = NOW() WHERE id IN (${placeholders})`,
                        [Number(order.id), ...keyIds.map(id => Number(id))]
                    );
                }
                cardKeysJson = JSON.stringify(assignedKeys);
                console.log('支付通知: 已分配卡密', order_no, assignedKeys.length, '个');
            } else {
                console.warn('支付通知: 无可用卡密', order_no, '商品ID:', order.product_id);
            }
        }
        
        // 更新订单状态：实物商品->awaiting_delivery，虚拟商品->paid
        const newOrderStatus = isPhysicalOrder ? 'awaiting_delivery' : 'paid';
        const updateFields = ['status = ?', 'pay_time = NOW()'];
        const updateParams = [newOrderStatus];
        
        if (payment_id) {
            updateFields.push('remark = COALESCE(remark, \'\') || ?');
            updateParams.push(' 支付交易号: ' + payment_id);
        }
        
        if (cardKeysJson) {
            updateFields.push('card_keys = ?');
            updateParams.push(cardKeysJson);
        }
        
        updateParams.push(Number(order.id));
        
        await db.update(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`,
            updateParams
        );
        
        console.log('支付通知: 订单支付成功', order_no);
        
        // ============ 卖家入账逻辑（100%）============
        if (order.seller_id) {
            try {
                await creditSellerWallet(order);
            } catch (walletErr) {
                console.error('支付通知: 卖家入账失败:', walletErr.message, '订单:', order_no);
            }
        }
        // ============ 卖家入账逻辑结束 ============
        
        // 返回成功响应给支付网关
        res.status(200).send('success');
        
    } catch (error) {
        console.error('支付通知处理失败:', error);
        res.status(500).send('FAIL');
    }
}

/**
 * 签名验证占位函数
 * TODO: Verify signature based on payment provider SDK
 * 
 * @param {Object} payload - 支付回调数据
 * @param {string} signature - 签名
 * @returns {boolean} - 签名是否有效
 */
function verifyPaymentSignature(payload, signature) {
    // TODO: 根据实际支付提供商SDK实现签名验证
    // 
    // 支付宝:
    // const { createVerify } = require('crypto');
    // const params = sortAndStringify(payload);
    // return alipayPublicKey.verify(params, signature);
    //
    // 微信支付:
    // const sign = wxpay.sign(payload);
    // return sign === signature;
    //
    // Stripe:
    // 使用 stripe.webhooks.constructEvent 验证
    
    console.warn('警告: 支付签名验证未实现，使用占位逻辑');
    return true;
}

/**
 * 获取订单状态（轻量级接口）
 * GET /api/orders/:id/status
 * 
 * 用于前端轮询检查订单支付状态
 * 返回: { status: 'pending' | 'paid' | 'delivered' | 'completed' | 'cancelled' }
 * 
 * 可选参数: ?include_secret=true - 当状态为paid时包含卡密
 */
async function getOrderStatus(req, res) {
    try {
        const { id } = req.params;
        const includeSecret = req.query.include_secret === 'true';
        
        if (!id) {
            return res.status(400).json({
                code: 400,
                message: '缺少订单ID'
            });
        }
        
        // 查询订单状态
        const orders = await db.query(
            'SELECT id, order_no, status, card_keys, pay_time FROM orders WHERE id = ? OR order_no = ?',
            [Number(id) || 0, String(id)]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        const order = orders[0];
        
        // 构建响应
        const response = {
            code: 200,
            message: 'success',
            data: {
                status: order.status
            }
        };
        
        // 只有在状态为 paid/awaiting_delivery/delivered/completed 且请求包含卡密时才返回
        if (includeSecret && ['paid', 'awaiting_delivery', 'delivered', 'completed'].includes(order.status)) {
            response.data.card_keys = order.card_keys ? JSON.parse(order.card_keys) : null;
            response.data.pay_time = order.pay_time;
        }
        
        res.json(response);
        
    } catch (error) {
        console.error('获取订单状态失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取订单状态失败：' + error.message
        });
    }
}

/**
 * 删除订单（管理员）
 * DELETE /api/orders/:id
 */
async function deleteOrder(req, res) {
    try {
        const { id } = req.params;
        
        // 检查订单是否存在
        const orders = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [Number(id)]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        const order = orders[0];
        
        // 如果订单状态是待支付，删除时恢复库存
        if (order.status === 'pending') {
            await db.update(
                'UPDATE products SET stock = stock + ? WHERE id = ?',
                [Number(order.quantity), Number(order.product_id)]
            );
        }
        
        // 删除订单
        await db.update('DELETE FROM orders WHERE id = ?', [Number(id)]);
        
        res.json({
            code: 200,
            message: '订单删除成功'
        });
    } catch (error) {
        console.error('删除订单失败:', error);
        res.status(500).json({
            code: 500,
            message: '删除订单失败：' + error.message
        });
    }
}

/**
 * 批量删除订单（管理员）
 * POST /api/orders/batch-delete
 */
async function batchDeleteOrders(req, res) {
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '请提供要删除的订单ID列表'
            });
        }
        
        let successCount = 0;
        let failCount = 0;
        
        for (const id of ids) {
            try {
                // 检查订单是否存在
                const orders = await db.query(
                    'SELECT * FROM orders WHERE id = ?',
                    [Number(id)]
                );
                
                if (orders.length > 0) {
                    const order = orders[0];
                    
                    // 如果订单状态是待支付，删除时恢复库存
                    if (order.status === 'pending') {
                        await db.update(
                            'UPDATE products SET stock = stock + ? WHERE id = ?',
                            [Number(order.quantity), Number(order.product_id)]
                        );
                    }
                    
                    // 删除订单
                    await db.update('DELETE FROM orders WHERE id = ?', [Number(id)]);
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                failCount++;
            }
        }
        
        res.json({
            code: 200,
            message: `批量删除完成：成功 ${successCount} 个，失败 ${failCount} 个`,
            data: { successCount, failCount }
        });
    } catch (error) {
        console.error('批量删除订单失败:', error);
        res.status(500).json({
            code: 500,
            message: '批量删除订单失败：' + error.message
        });
    }
}

/**
 * 手动为订单分配卡密（管理员功能）
 * POST /api/orders/:id/assign-cardkeys
 * 
 * 用于为已支付但没有卡密的订单补发卡密
 */
async function assignCardKeys(req, res) {
    try {
        const { id } = req.params;
        
        // 获取订单
        const orders = await db.query(
            'SELECT * FROM orders WHERE id = ?',
            [Number(id)]
        );
        
        if (orders.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }
        
        const order = orders[0];
        
        // 只能为已支付的订单分配卡密
        if (order.status !== 'paid' && order.status !== 'delivered' && order.status !== 'completed') {
            return res.status(400).json({
                code: 400,
                message: '只能为已支付的订单分配卡密'
            });
        }
        
        // 检查是否已有卡密
        if (order.card_keys) {
            return res.status(400).json({
                code: 400,
                message: '该订单已有卡密，无需重复分配'
            });
        }
        
        // 从卡密库存中分配卡密
        const availableCardKeys = await db.query(
            'SELECT * FROM card_keys WHERE product_id = ? AND status = 0 ORDER BY created_at ASC LIMIT ?',
            [Number(order.product_id), Number(order.quantity)]
        );
        
        if (availableCardKeys.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '该商品暂无可用卡密库存，请先导入卡密'
            });
        }
        
        if (availableCardKeys.length < order.quantity) {
            return res.status(400).json({
                code: 400,
                message: `卡密库存不足，需要 ${order.quantity} 个，仅剩 ${availableCardKeys.length} 个`
            });
        }
        
        // 分配卡密
        const assignedKeys = [];
        const keyIds = [];
        
        for (const cardKey of availableCardKeys) {
            assignedKeys.push(cardKey.card_key);
            keyIds.push(cardKey.id);
        }
        
        // 更新卡密状态为已售出
        const placeholders = keyIds.map(() => '?').join(',');
        await db.update(
            `UPDATE card_keys SET status = 1, order_id = ?, sold_at = NOW() WHERE id IN (${placeholders})`,
            [Number(order.id), ...keyIds.map(id => Number(id))]
        );
        
        // 更新订单的卡密字段
        const cardKeysJson = JSON.stringify(assignedKeys);
        await db.update(
            'UPDATE orders SET card_keys = ? WHERE id = ?',
            [cardKeysJson, Number(id)]
        );
        
        // 更新商品库存
        const stockResult = await db.query(
            'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
            [Number(order.product_id)]
        );
        await db.update(
            'UPDATE products SET stock = ? WHERE id = ?',
            [stockResult[0].count, Number(order.product_id)]
        );
        
        console.log('手动分配卡密成功:', order.order_no, assignedKeys.length, '个');
        
        res.json({
            code: 200,
            message: `成功分配 ${assignedKeys.length} 个卡密`,
            data: {
                card_keys: assignedKeys,
                assigned_count: assignedKeys.length
            }
        });
    } catch (error) {
        console.error('手动分配卡密失败:', error);
        res.status(500).json({
            code: 500,
            message: '分配卡密失败：' + error.message
        });
    }
}

module.exports = {
    createOrder,
    getOrders,
    getMyOrders,
    getOrderById,
    getOrderByNo,
    updateOrderStatus,
    simulatePay,
    deleteOrder,
    batchDeleteOrders,
    paymentNotify,
    getOrderStatus,
    assignCardKeys
};
