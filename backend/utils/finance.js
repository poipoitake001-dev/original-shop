/**
 * ========================================
 * 财务逻辑工具模块
 * Finance Utility Module
 * ========================================
 *
 * 财务模型（提现手续费模式）：
 * - 订单支付时：卖家收取 100% 订单金额
 * - 提现时：平台收取手续费（百分比 + 最低费用）
 *
 * 所有钱包操作使用 MySQL 事务保证原子性：
 * - 钱包余额更新
 * - 交易记录创建
 * - 防止竞争条件 (SELECT ... FOR UPDATE)
 */

const db = require('../config/db');

/**
 * 当订单支付成功时，为卖家入账（100% 订单金额）
 * 创建一条不可篡改的交易记录：type = 'sale'
 *
 * @param {Object} order - 订单对象（必须包含 id, seller_id, total_price, order_no）
 * @returns {boolean} 是否成功
 */
async function creditSellerWallet(order) {
    if (!order.seller_id) return false;

    const sellerId = order.seller_id;
    // 卖家收取 100% 订单金额
    const creditAmount = parseFloat(order.total_price);

    if (creditAmount <= 0) return false;

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. 锁定卖家钱包行
        const [wallets] = await conn.query(
            'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
            [sellerId]
        );

        let currentBalance;

        if (wallets.length === 0) {
            await conn.query(
                'INSERT INTO wallets (user_id, balance, total_earned) VALUES (?, ?, ?)',
                [sellerId, creditAmount, creditAmount]
            );
            currentBalance = creditAmount;
        } else {
            await conn.query(
                'UPDATE wallets SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?',
                [creditAmount, creditAmount, sellerId]
            );
            currentBalance = parseFloat(wallets[0].balance) + creditAmount;
        }

        // 2. 创建卖家收入交易记录
        await conn.query(
            `INSERT INTO transactions (user_id, order_id, type, amount, balance_after, description, status)
             VALUES (?, ?, 'sale', ?, ?, ?, 'completed')`,
            [sellerId, order.id, creditAmount, currentBalance, '订单收入 #' + (order.order_no || order.id)]
        );

        await conn.commit();
        console.log(`[Finance] 卖家 ${sellerId} 入账 ¥${creditAmount.toFixed(2)}，订单 #${order.order_no}`);
        return true;
    } catch (error) {
        await conn.rollback();
        console.error('[Finance] 卖家入账失败:', error.message, '订单:', order.order_no);
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * 获取提现手续费配置
 */
async function getWithdrawalFeeConfig() {
    try {
        const rows = await db.query('SELECT withdrawal_fee_percent, withdrawal_min_fee FROM site_settings WHERE id = 1');
        if (rows.length > 0) {
            return {
                feePercent: parseFloat(rows[0].withdrawal_fee_percent) || 5.0,
                minFee: parseFloat(rows[0].withdrawal_min_fee) || 2.0
            };
        }
    } catch (e) {
        console.error('[Finance] 获取手续费配置失败:', e.message);
    }
    return { feePercent: 5.0, minFee: 2.0 };
}

/**
 * 计算提现手续费
 * @param {number} amount - 提现金额
 * @returns {{ feeAmount: number, actualAmount: number }}
 */
async function calculateWithdrawalFee(amount) {
    const config = await getWithdrawalFeeConfig();
    let feeAmount = Math.round(amount * config.feePercent) / 100; // 百分比手续费
    if (feeAmount < config.minFee) feeAmount = config.minFee;     // 最低手续费
    feeAmount = Math.round(feeAmount * 100) / 100;                // 保留2位小数
    const actualAmount = Math.round((amount - feeAmount) * 100) / 100;
    return { feeAmount, actualAmount };
}

/**
 * 提现申请 — 原子性地冻结余额并计算手续费
 */
async function createWithdrawalRequest(userId, amount, paymentMethod, accountName, accountNumber) {
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < 1) {
        return { success: false, message: '提现金额最低 1 元' };
    }

    // 计算手续费
    const { feeAmount, actualAmount } = await calculateWithdrawalFee(withdrawAmount);
    if (actualAmount <= 0) {
        return { success: false, message: '提现金额不足以覆盖手续费' };
    }

    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        // 1. 锁定钱包
        const [wallets] = await conn.query(
            'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
            [userId]
        );

        if (wallets.length === 0 || parseFloat(wallets[0].balance) < withdrawAmount) {
            await conn.rollback();
            return { success: false, message: '余额不足' };
        }

        // 2. 检查待处理的提现
        const [pending] = await conn.query(
            "SELECT id FROM withdrawal_requests WHERE user_id = ? AND status IN ('pending', 'processing')",
            [userId]
        );
        if (pending.length > 0) {
            await conn.rollback();
            return { success: false, message: '您有一个提现申请正在处理中' };
        }

        // 3. 冻结全部申请金额
        await conn.query(
            'UPDATE wallets SET balance = balance - ?, frozen_balance = frozen_balance + ? WHERE user_id = ?',
            [withdrawAmount, withdrawAmount, userId]
        );

        // 4. 创建提现申请（含手续费信息）
        const [insertResult] = await conn.query(
            `INSERT INTO withdrawal_requests (user_id, amount, fee_amount, actual_amount, payment_method, account_name, account_number)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, withdrawAmount, feeAmount, actualAmount, paymentMethod, accountName.trim(), accountNumber.trim()]
        );

        // 5. 获取更新后的余额
        const [updated] = await conn.query('SELECT balance FROM wallets WHERE user_id = ?', [userId]);
        const newBalance = parseFloat(updated[0].balance);

        // 6. 创建交易记录
        await conn.query(
            `INSERT INTO transactions (user_id, type, amount, balance_after, description, status)
             VALUES (?, 'withdrawal', ?, ?, ?, 'pending')`,
            [userId, -withdrawAmount, newBalance, '提现 ¥' + actualAmount.toFixed(2) + '（手续费 ¥' + feeAmount.toFixed(2) + '）']
        );

        await conn.commit();
        console.log(`[Finance] 卖家 ${userId} 提现 ¥${withdrawAmount.toFixed(2)}，手续费 ¥${feeAmount.toFixed(2)}，实际到账 ¥${actualAmount.toFixed(2)}`);
        return { success: true, withdrawalId: insertResult.insertId, feeAmount, actualAmount };
    } catch (error) {
        await conn.rollback();
        console.error('[Finance] 提现申请失败:', error.message);
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * 管理员处理提现 — 原子性操作
 */
async function processWithdrawal(withdrawalId, action, adminId, adminNote) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const [requests] = await conn.query(
            'SELECT * FROM withdrawal_requests WHERE id = ? FOR UPDATE',
            [withdrawalId]
        );
        if (requests.length === 0) {
            await conn.rollback();
            return { success: false, message: '提现申请不存在' };
        }

        const wr = requests[0];
        if (wr.status !== 'pending' && wr.status !== 'processing') {
            await conn.rollback();
            return { success: false, message: '该申请已被处理' };
        }

        const wrAmount = parseFloat(wr.amount);

        const [wallets] = await conn.query(
            'SELECT * FROM wallets WHERE user_id = ? FOR UPDATE',
            [wr.user_id]
        );
        if (wallets.length === 0) {
            await conn.rollback();
            return { success: false, message: '卖家钱包不存在' };
        }

        if (action === 'complete') {
            // 完成：从冻结余额扣除全部金额（含手续费），手续费归平台
            await conn.query(
                'UPDATE wallets SET frozen_balance = frozen_balance - ?, total_withdrawn = total_withdrawn + ? WHERE user_id = ?',
                [wrAmount, parseFloat(wr.actual_amount || wrAmount), wr.user_id]
            );
            await conn.query(
                "UPDATE withdrawal_requests SET status = 'completed', admin_note = ?, processed_at = NOW(), processed_by = ? WHERE id = ?",
                [adminNote || null, adminId, withdrawalId]
            );
            await conn.query(
                "UPDATE transactions SET status = 'completed' WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
                [wr.user_id]
            );
        } else {
            // 拒绝：全额退回
            await conn.query(
                'UPDATE wallets SET balance = balance + ?, frozen_balance = frozen_balance - ? WHERE user_id = ?',
                [wrAmount, wrAmount, wr.user_id]
            );
            await conn.query(
                "UPDATE withdrawal_requests SET status = 'rejected', admin_note = ?, processed_at = NOW(), processed_by = ? WHERE id = ?",
                [adminNote || '提现被拒绝', adminId, withdrawalId]
            );
            await conn.query(
                "UPDATE transactions SET status = 'cancelled' WHERE user_id = ? AND type = 'withdrawal' AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
                [wr.user_id]
            );
        }

        await conn.commit();
        console.log(`[Finance] 提现 #${withdrawalId} ${action === 'complete' ? '已完成' : '已拒绝'}`);
        return { success: true };
    } catch (error) {
        await conn.rollback();
        console.error('[Finance] 处理提现失败:', error.message);
        throw error;
    } finally {
        conn.release();
    }
}

module.exports = {
    creditSellerWallet,
    createWithdrawalRequest,
    processWithdrawal,
    calculateWithdrawalFee,
    getWithdrawalFeeConfig
};
