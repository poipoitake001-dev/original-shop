/**
 * ========================================
 * 信誉系统工具
 * Reputation & Badge Calculation Utility
 * ========================================
 */

const db = require('../config/db');

/**
 * 计算并更新用户徽章
 * 
 * 逻辑:
 * - 优秀卖家 (Excellent Seller): soldCount >= 10 AND disputeCount == 0 AND rating >= 4.8
 * - 优秀买家 (Excellent Buyer): boughtCount >= 10 AND disputeCount == 0
 * 
 * @param {number} userId - 用户 ID
 * @returns {object} { badges, stats }
 */
async function calculateBadges(userId) {
    try {
        const users = await db.query(
            'SELECT sold_count, bought_count, dispute_count, good_review_count, rating FROM users WHERE id = ?',
            [Number(userId)]
        );
        if (users.length === 0) return null;

        const user = users[0];
        const soldCount = user.sold_count || 0;
        const boughtCount = user.bought_count || 0;
        const disputeCount = user.dispute_count || 0;
        const rating = parseFloat(user.rating) || 5.0;

        // 计算徽章
        const isExcellentSeller = soldCount >= 10 && disputeCount === 0 && rating >= 4.8;
        const isExcellentBuyer = boughtCount >= 10 && disputeCount === 0;

        // 更新用户徽章字段
        await db.query(
            'UPDATE users SET badge_excellent_seller = ?, badge_excellent_buyer = ? WHERE id = ?',
            [isExcellentSeller ? 1 : 0, isExcellentBuyer ? 1 : 0, Number(userId)]
        );

        return {
            badges: {
                excellentSeller: isExcellentSeller,
                excellentBuyer: isExcellentBuyer,
            },
            stats: {
                soldCount,
                boughtCount,
                disputeCount,
                goodReviewCount: user.good_review_count || 0,
                rating,
            }
        };
    } catch (error) {
        console.error('calculateBadges error:', error.message);
        return null;
    }
}

/**
 * 订单完成时更新买卖双方统计数据 + 重新计算徽章
 * 
 * @param {object} order - 订单对象 (需含 user_id, seller_id)
 */
async function onOrderCompleted(order) {
    try {
        // 更新买家 boughtCount
        if (order.user_id) {
            await db.query(
                'UPDATE users SET bought_count = bought_count + ? WHERE id = ?',
                [Number(order.quantity) || 1, Number(order.user_id)]
            );
            await calculateBadges(order.user_id);
        }

        // 更新卖家 soldCount
        if (order.seller_id) {
            await db.query(
                'UPDATE users SET sold_count = sold_count + ? WHERE id = ?',
                [Number(order.quantity) || 1, Number(order.seller_id)]
            );
            await calculateBadges(order.seller_id);
        }
    } catch (error) {
        console.error('onOrderCompleted reputation update error:', error.message);
    }
}

/**
 * 评价创建后更新好评计数 + 重新计算徽章
 * 
 * @param {number} targetUserId - 被评价的用户 ID
 * @param {number} score - 评分 (1-5)
 */
async function onReviewCreated(targetUserId, score) {
    try {
        // 好评(4-5分)计数
        if (score >= 4) {
            await db.query(
                'UPDATE users SET good_review_count = good_review_count + 1 WHERE id = ?',
                [Number(targetUserId)]
            );
        }
        await calculateBadges(targetUserId);
    } catch (error) {
        console.error('onReviewCreated reputation update error:', error.message);
    }
}

module.exports = {
    calculateBadges,
    onOrderCompleted,
    onReviewCreated,
};
