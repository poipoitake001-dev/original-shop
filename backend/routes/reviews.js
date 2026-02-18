/**
 * ========================================
 * 评价系统路由
 * Review System Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');
const { onReviewCreated } = require('../utils/reputation');

/**
 * POST /api/reviews
 * 提交评价（买家评卖家 / 卖家评买家）
 * body: { orderId, targetUserId, score (1-5), comment }
 */
router.post('/', verifyToken, async (req, res) => {
    try {
        const reviewerId = req.user.id;
        const { orderId, targetUserId, score, comment } = req.body;

        // 参数校验
        if (!orderId || !targetUserId || !score) {
            return res.status(400).json({ code: 400, message: '缺少必填参数' });
        }
        if (score < 1 || score > 5 || !Number.isInteger(score)) {
            return res.status(400).json({ code: 400, message: '评分必须为 1-5 的整数' });
        }
        if (reviewerId === targetUserId) {
            return res.status(400).json({ code: 400, message: '不能给自己评价' });
        }

        // 检查订单是否存在且状态为 completed
        const orders = await db.query(
            'SELECT * FROM orders WHERE id = ? AND status = ?',
            [Number(orderId), 'completed']
        );
        if (orders.length === 0) {
            return res.status(400).json({ code: 400, message: '订单不存在或未完成' });
        }

        const order = orders[0];

        // 检查评价人是否与订单相关（买家或卖家）
        const isBuyer = order.user_id === reviewerId;
        const isSeller = order.seller_id === reviewerId;
        if (!isBuyer && !isSeller) {
            return res.status(403).json({ code: 403, message: '您无权评价此订单' });
        }

        // 检查是否已评价（同一订单，同一评价人只能评一次）
        const existing = await db.query(
            'SELECT id FROM reviews WHERE order_id = ? AND reviewer_id = ?',
            [Number(orderId), reviewerId]
        );
        if (existing.length > 0) {
            return res.status(400).json({ code: 400, message: '您已评价过此订单' });
        }

        // 插入评价
        await db.query(
            'INSERT INTO reviews (order_id, reviewer_id, target_user_id, score, comment) VALUES (?, ?, ?, ?, ?)',
            [Number(orderId), reviewerId, Number(targetUserId), score, comment || '']
        );

        // 重新计算目标用户的平均评分
        const ratingResult = await db.query(
            'SELECT AVG(score) AS avg_score, COUNT(*) AS total FROM reviews WHERE target_user_id = ?',
            [Number(targetUserId)]
        );
        const avgRating = parseFloat(ratingResult[0]?.avg_score) || 5.0;
        const reviewCount = parseInt(ratingResult[0]?.total) || 0;

        await db.query(
            'UPDATE users SET rating = ?, review_count = ? WHERE id = ?',
            [Math.round(avgRating * 10) / 10, reviewCount, Number(targetUserId)]
        );

        // 信誉系统：更新好评计数 & 重新计算徽章
        try {
            await onReviewCreated(Number(targetUserId), score);
        } catch (repErr) {
            console.error('信誉徽章更新失败:', repErr.message);
        }

        res.json({
            code: 200,
            message: '评价成功',
            data: {
                rating: Math.round(avgRating * 10) / 10,
                reviewCount
            }
        });
    } catch (error) {
        console.error('提交评价失败:', error);
        res.status(500).json({ code: 500, message: '提交评价失败' });
    }
});

/**
 * GET /api/reviews/order/:orderId
 * 获取订单的评价列表（检查当前用户是否已评）
 */
router.get('/order/:orderId', verifyToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user.id;

        const reviews = await db.query(
            `SELECT r.*, 
                    reviewer.username AS reviewer_name,
                    target.username AS target_name
             FROM reviews r
             LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
             LEFT JOIN users target ON r.target_user_id = target.id
             WHERE r.order_id = ?
             ORDER BY r.created_at DESC`,
            [Number(orderId)]
        );

        // 检查当前用户是否已评价
        const myReview = reviews.find(r => r.reviewer_id === userId);

        res.json({
            code: 200,
            data: {
                reviews,
                hasReviewed: !!myReview,
                myReview: myReview || null
            }
        });
    } catch (error) {
        console.error('获取评价失败:', error);
        res.status(500).json({ code: 500, message: '获取评价失败' });
    }
});

/**
 * GET /api/reviews/user/:userId
 * 获取某用户收到的所有评价
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const [reviews, countResult] = await Promise.all([
            db.query(
                `SELECT r.*, reviewer.username AS reviewer_name
                 FROM reviews r
                 LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
                 WHERE r.target_user_id = ?
                 ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
                [Number(userId), Number(limit), Number(offset)]
            ),
            db.query(
                'SELECT COUNT(*) AS total FROM reviews WHERE target_user_id = ?',
                [Number(userId)]
            )
        ]);

        res.json({
            code: 200,
            data: {
                list: reviews,
                total: countResult[0]?.total || 0,
                page: Number(page),
                limit: Number(limit)
            }
        });
    } catch (error) {
        console.error('获取用户评价失败:', error);
        res.status(500).json({ code: 500, message: '获取用户评价失败' });
    }
});

module.exports = router;
