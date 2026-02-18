/**
 * ========================================
 * 支付路由
 * Payment Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const orderController = require('../controllers/orderController');

// ========== 工具函数 ==========

/**
 * 获取后端的公开基础URL
 * 处理反向代理（Railway/Nginx）后面的协议和域名
 */
function getBackendBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    return `${protocol}://${host}`;
}

// ========== 创建支付URL（System 1 - API网关）==========

/**
 * 创建支付链接
 * POST /api/payment/create
 * 
 * 生成支付网关的跳转URL
 */
router.post('/create', async (req, res) => {
    try {
        const { orderId, orderNo, amount } = req.body;

        if (!orderId || !orderNo || !amount) {
            return res.status(400).json({
                code: 400,
                message: '参数不完整'
            });
        }

        // 验证订单存在且金额匹配，防止伪造支付请求
        const orders = await db.query('SELECT id, total_price, status FROM orders WHERE id = ? AND order_no = ?', [orderId, orderNo]);
        if (!orders || orders.length === 0) {
            return res.status(404).json({ code: 404, message: '订单不存在' });
        }
        if (orders[0].status !== 'pending') {
            return res.status(400).json({ code: 400, message: '订单状态不允许支付' });
        }
        if (Math.abs(parseFloat(orders[0].total_price) - parseFloat(amount)) > 0.01) {
            return res.status(400).json({ code: 400, message: '支付金额不匹配' });
        }

        // 获取支付配置
        const configs = await db.query('SELECT * FROM payment_config WHERE id = 1');
        
        if (!configs || configs.length === 0 || !configs[0].system1_enabled) {
            return res.status(400).json({
                code: 400,
                message: '在线支付未启用'
            });
        }

        const config = configs[0];
        let system1Config = {};
        
        try {
            system1Config = typeof config.system1_config === 'string'
                ? JSON.parse(config.system1_config)
                : (config.system1_config || {});
        } catch (e) {
            return res.status(500).json({
                code: 500,
                message: '支付配置解析错误'
            });
        }

        const { apiUrl, pid, key, notifyUrl } = system1Config;

        if (!apiUrl || !pid || !key) {
            return res.status(500).json({
                code: 500,
                message: '支付网关配置不完整'
            });
        }

        // 获取订单信息用于生成支付参数（复用前面的验证查询）
        const orderDetail = await db.query(
            'SELECT * FROM orders WHERE id = ? AND order_no = ?',
            [orderId, orderNo]
        );

        if (!orderDetail || orderDetail.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '订单不存在'
            });
        }

        const order = orderDetail[0];

        // ========== 构建正确的回调URL ==========
        // 关键修复：前后端分离部署时，return_url 必须指向前端域名，
        // 而 notify_url 必须指向后端域名（支付网关服务器回调后端）
        const backendBaseUrl = getBackendBaseUrl(req);
        const frontendBaseUrl = process.env.FRONTEND_URL 
            || backendBaseUrl; // 如果没配 FRONTEND_URL，回退到后端地址

        // 构建支付参数（易支付/彩虹易支付标准接口）
        const payParams = {
            pid: pid,
            type: 'alipay', // 默认支付宝，可以扩展
            out_trade_no: orderNo,
            notify_url: notifyUrl || `${backendBaseUrl}/api/payment/notify`,
            return_url: `${frontendBaseUrl}/?orderResult=${orderNo}`,
            name: order.product_title,
            money: parseFloat(order.total_price).toFixed(2)
        };

        // 生成签名（MD5签名，按key排序）
        const signStr = Object.keys(payParams)
            .sort()
            .map(k => `${k}=${payParams[k]}`)
            .join('&') + key;
        
        const sign = crypto.createHash('md5').update(signStr).digest('hex');
        payParams.sign = sign;
        payParams.sign_type = 'MD5';

        // 构建跳转URL
        const queryString = Object.keys(payParams)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(payParams[k])}`)
            .join('&');
        
        const payUrl = `${apiUrl}?${queryString}`;

        res.json({
            code: 200,
            message: '支付链接创建成功',
            data: {
                payUrl: payUrl
            }
        });

    } catch (error) {
        console.error('创建支付链接失败:', error);
        res.status(500).json({
            code: 500,
            message: '创建支付链接失败'
        });
    }
});

// ========== 支付网关回调（Webhook）==========

/**
 * 统一支付回调处理函数
 * 
 * 兼容易支付/彩虹易支付的参数格式：
 *   out_trade_no  - 商户订单号
 *   trade_no      - 支付平台交易号
 *   trade_status  - 交易状态 (TRADE_SUCCESS)
 *   money         - 交易金额
 *   sign          - 签名
 *   sign_type     - 签名方式 (MD5)
 * 
 * 同时兼容通用 Webhook 格式：
 *   order_no / status / payment_id
 */
async function handlePaymentNotify(req, res) {
    try {
        // 合并 GET query 和 POST body 参数（兼容两种方式）
        const params = { ...req.query, ...req.body };
        
        console.log('[支付回调]', req.method, '参数:', JSON.stringify(params));

        // ========== 1. 提取订单号（兼容多种参数名）==========
        const orderNo = params.out_trade_no || params.order_no;
        
        if (!orderNo) {
            console.error('[支付回调] 缺少订单号, 收到的参数:', Object.keys(params));
            return res.status(400).send('fail');
        }

        // ========== 2. 获取支付配置用于签名验证 ==========
        const configs = await db.query('SELECT * FROM payment_config WHERE id = 1');
        
        if (!configs || configs.length === 0) {
            console.error('[支付回调] 支付配置不存在');
            return res.send('fail');
        }

        let system1Config = {};
        try {
            system1Config = typeof configs[0].system1_config === 'string'
                ? JSON.parse(configs[0].system1_config)
                : (configs[0].system1_config || {});
        } catch (e) {
            console.error('[支付回调] 配置解析失败');
            return res.send('fail');
        }

        // ========== 3. 验证签名（易支付MD5签名）==========
        if (params.sign && system1Config.key) {
            // 易支付签名规则：按参数名排序，拼接后加上 key，MD5 取值
            const signParams = {};
            for (const k of Object.keys(params)) {
                if (k !== 'sign' && k !== 'sign_type' && params[k] !== '' && params[k] !== undefined) {
                    signParams[k] = params[k];
                }
            }
            const signStr = Object.keys(signParams)
                .sort()
                .map(k => `${k}=${signParams[k]}`)
                .join('&') + system1Config.key;
            
            const expectedSign = crypto.createHash('md5').update(signStr).digest('hex');
            
            if (params.sign !== expectedSign) {
                console.error('[支付回调] 签名验证失败!', { orderNo, received: params.sign, expected: expectedSign });
                return res.send('fail');
            } else {
                console.log('[支付回调] 签名验证通过:', orderNo);
            }
        }

        // ========== 4. 查找订单 ==========
        const orders = await db.query(
            'SELECT * FROM orders WHERE order_no = ?',
            [orderNo]
        );

        if (!orders || orders.length === 0) {
            console.error('[支付回调] 订单不存在:', orderNo);
            return res.send('fail');
        }

        const order = orders[0];

        // 已处理过的订单直接返回成功
        if (order.status === 'paid' || order.status === 'delivered' || order.status === 'completed') {
            console.log('[支付回调] 订单已处理过:', orderNo, '状态:', order.status);
            return res.send('success');
        }

        // ========== 5. 判断支付状态（兼容多种格式）==========
        const tradeStatus = params.trade_status || params.status || '';
        const isSuccess = tradeStatus === 'TRADE_SUCCESS' 
                       || tradeStatus === 'TRADE_FINISHED' 
                       || tradeStatus === 'success' 
                       || tradeStatus === 'SUCCESS';

        if (!isSuccess) {
            console.log('[支付回调] 支付未成功:', orderNo, '状态:', tradeStatus);
            return res.send('success');
        }

        // ========== 6. 金额验证 ==========
        if (params.money) {
            const paidAmount = parseFloat(params.money);
            const orderAmount = parseFloat(order.total_price);
            if (Math.abs(paidAmount - orderAmount) > 0.01) {
                console.error('[支付回调] 金额不匹配!', orderNo, '支付:', paidAmount, '订单:', orderAmount);
                return res.send('fail');
            }
        }

        // ========== 7. 更新订单状态 + 自动分配卡密 ==========
        console.log('[支付回调] 支付成功, 开始处理:', orderNo);

        // 检查商品发货类型，仅自动发卡类型分配卡密
        let cardKeysJson = null;
        const productRow = await db.query('SELECT delivery_type FROM products WHERE id = ?', [order.product_id]);
        const productDeliveryType = productRow[0]?.delivery_type || 'auto';

        if (productDeliveryType === 'auto') {
            try {
                const availableKeys = await db.query(
                    'SELECT id, card_key FROM card_keys WHERE product_id = ? AND status = 0 ORDER BY created_at ASC LIMIT ?',
                    [order.product_id, order.quantity]
                );

                if (availableKeys && availableKeys.length >= order.quantity) {
                    const keyIds = availableKeys.map(k => k.id);
                    const keyValues = availableKeys.map(k => k.card_key);
                    const placeholders = keyIds.map(() => '?').join(',');
                    await db.query(
                        `UPDATE card_keys SET status = 1, order_id = ?, sold_at = NOW() WHERE id IN (${placeholders})`,
                        [order.id, ...keyIds]
                    );
                    cardKeysJson = JSON.stringify(keyValues);
                    console.log('[支付回调] 自动分配卡密:', orderNo, keyValues.length, '个');
                } else {
                    console.warn('[支付回调] 卡密库存不足:', orderNo, '可用:', availableKeys?.length || 0, '需要:', order.quantity);
                }
            } catch (e) {
                console.error('[支付回调] 分配卡密失败:', e.message);
            }
        } else {
            console.log('[支付回调] 手动发货商品，跳过卡密分配:', orderNo);
        }

        // 更新订单状态
        const tradeNo = params.trade_no || params.payment_id || '';
        const newStatus = cardKeysJson ? 'delivered' : 'paid';
        
        let updateSql = 'UPDATE orders SET status = ?, pay_time = NOW()';
        const updateParams = [newStatus];

        if (cardKeysJson) {
            updateSql += ', card_keys = ?';
            updateParams.push(cardKeysJson);
        }

        if (tradeNo) {
            updateSql += ', remark = ?';
            updateParams.push('支付交易号: ' + tradeNo);
        }

        updateSql += ' WHERE id = ?';
        updateParams.push(order.id);

        await db.query(updateSql, updateParams);
        console.log('[支付回调] 订单更新成功:', orderNo, '状态:', newStatus);

        // 卖家入账（如果适用）
        if (order.seller_id && order.seller_amount) {
            try {
                const { creditSellerWallet } = require('../utils/finance');
                await creditSellerWallet(order);
            } catch (e) {
                console.error('[支付回调] 卖家入账失败:', e.message);
            }
        }

        res.send('success');

    } catch (error) {
        console.error('[支付回调] 处理异常:', error);
        res.send('fail');
    }
}

/**
 * 支付通知回调 - POST 方式
 * POST /api/payment/notify
 */
router.post('/notify', handlePaymentNotify);

/**
 * 支付通知回调 - GET 方式
 * GET /api/payment/notify
 * 
 * 易支付/彩虹易支付默认使用 GET 方式回调
 */
router.get('/notify', handlePaymentNotify);

module.exports = router;
