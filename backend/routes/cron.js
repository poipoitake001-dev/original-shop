/**
 * ========================================
 * 定时任务路由
 * Cron Job Routes
 * ========================================
 *
 * 安全：需要 CRON_SECRET 头验证
 * 调用方式：
 *   curl -H "x-cron-secret: YOUR_SECRET" https://yoursite.com/api/cron/cleanup-orders
 *
 * 或配置 Railway Cron / 外部 cron 服务每 5 分钟调用
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');

const CRON_SECRET = process.env.CRON_SECRET || 'default-cron-secret-change-me';
const ORDER_TIMEOUT_MINUTES = 15;

/**
 * 验证 Cron Secret 中间件
 */
function verifyCronSecret(req, res, next) {
    const secret = req.headers['x-cron-secret'];
    if (!secret || secret !== CRON_SECRET) {
        return res.status(403).json({ code: 403, message: 'Unauthorized' });
    }
    next();
}

/**
 * GET /cleanup-orders
 * 自动取消超时未支付的订单，释放库存
 */
router.get('/cleanup-orders', verifyCronSecret, async (req, res) => {
    const startTime = Date.now();

    try {
        // 查找超过 15 分钟未支付的订单
        const expiredOrders = await db.query(
            `SELECT id, order_no, product_id, quantity, seller_id
             FROM orders 
             WHERE status = 'pending' 
             AND created_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
            [ORDER_TIMEOUT_MINUTES]
        );

        if (expiredOrders.length === 0) {
            return res.json({
                code: 200,
                message: 'No expired orders',
                data: { cancelled: 0, duration: Date.now() - startTime }
            });
        }

        let cancelledCount = 0;

        for (const order of expiredOrders) {
            try {
                // 1. 标记订单为已取消
                await db.query(
                    "UPDATE orders SET status = 'cancelled', remark = '系统自动取消：超时未支付' WHERE id = ? AND status = 'pending'",
                    [order.id]
                );

                // 2. 释放卡密（如果有被预留的）
                await db.query(
                    'UPDATE card_keys SET status = 0, order_id = NULL, sold_at = NULL WHERE order_id = ?',
                    [order.id]
                );

                // 3. 恢复库存（重新计算可用卡密数）
                const stockResult = await db.query(
                    'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
                    [order.product_id]
                );
                await db.query(
                    'UPDATE products SET stock = ? WHERE id = ?',
                    [stockResult[0]?.count || 0, order.product_id]
                );

                cancelledCount++;
                console.log(`[Cron] 自动取消订单 #${order.order_no}，已释放 ${order.quantity} 个库存`);
            } catch (orderErr) {
                console.error(`[Cron] 取消订单 #${order.order_no} 失败:`, orderErr.message);
            }
        }

        const duration = Date.now() - startTime;
        console.log(`[Cron] 清理完成: ${cancelledCount}/${expiredOrders.length} 个订单已取消，耗时 ${duration}ms`);

        res.json({
            code: 200,
            message: `Cancelled ${cancelledCount} expired orders`,
            data: { cancelled: cancelledCount, total: expiredOrders.length, duration }
        });
    } catch (error) {
        console.error('[Cron] 清理订单失败:', error.message);
        res.status(500).json({ code: 500, message: 'Cleanup failed' });
    }
});

/**
 * GET /status
 * 健康检查（不需要 secret）
 */
router.get('/status', (req, res) => {
    res.json({ code: 200, message: 'Cron service is running', time: new Date().toISOString() });
});

module.exports = router;
