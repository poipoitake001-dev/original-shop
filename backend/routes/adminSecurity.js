/**
 * ========================================
 * 管理员安全验证路由
 * Admin Security Routes
 * ========================================
 * 
 * 包含：
 * - 支付密码验证
 * - 安全设置（首次设置支付密码和密保问题）
 * - 支付密码重置（通过密保问题）
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// JWT 密钥（与主认证系统共享）
const JWT_SECRET = process.env.JWT_SECRET || 'space-card-shop-secret-key';

// 支付验证令牌有效期（5分钟）
const PAYMENT_TOKEN_EXPIRES = '5m';

/**
 * POST /verify-payment-password
 * 验证支付密码，返回临时令牌
 */
router.post('/verify-payment-password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { paymentPassword } = req.body;
        const adminId = req.user.id;

        if (!paymentPassword) {
            return res.status(400).json({
                code: 400,
                message: '请输入支付密码'
            });
        }

        // 获取管理员的支付密码哈希
        const users = await db.query(
            'SELECT payment_password_hash FROM users WHERE id = ? AND role = ?',
            [adminId, 'admin']
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '管理员账户不存在'
            });
        }

        const admin = users[0];

        // 检查是否已设置支付密码
        if (!admin.payment_password_hash) {
            return res.status(400).json({
                code: 400,
                message: '尚未设置支付密码，请先进行安全设置',
                needSetup: true
            });
        }

        // 验证支付密码
        const isMatch = await bcrypt.compare(paymentPassword, admin.payment_password_hash);

        if (!isMatch) {
            return res.status(401).json({
                code: 401,
                message: '支付密码错误'
            });
        }

        // 生成临时验证令牌（5分钟有效）
        const paymentToken = jwt.sign(
            {
                adminId: adminId,
                type: 'payment_verification',
                timestamp: Date.now()
            },
            JWT_SECRET,
            { expiresIn: PAYMENT_TOKEN_EXPIRES }
        );

        res.json({
            code: 200,
            message: '验证成功',
            data: {
                paymentToken: paymentToken,
                expiresIn: 300 // 5分钟 = 300秒
            }
        });

    } catch (error) {
        console.error('验证支付密码失败:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

/**
 * POST /setup-security
 * 首次设置支付密码和密保问题
 */
router.post('/setup-security', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { paymentPassword, securityQuestion, securityAnswer } = req.body;
        const adminId = req.user.id;

        // 验证必填字段
        if (!paymentPassword || !securityQuestion || !securityAnswer) {
            return res.status(400).json({
                code: 400,
                message: '请填写所有必填字段：支付密码、密保问题和答案'
            });
        }

        // 验证支付密码长度（至少6位）
        if (paymentPassword.length < 6) {
            return res.status(400).json({
                code: 400,
                message: '支付密码至少需要6位'
            });
        }

        // 检查是否已经设置过
        const users = await db.query(
            'SELECT payment_password_hash FROM users WHERE id = ? AND role = ?',
            [adminId, 'admin']
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '管理员账户不存在'
            });
        }

        if (users[0].payment_password_hash) {
            return res.status(400).json({
                code: 400,
                message: '安全设置已存在，如需修改请使用重置功能'
            });
        }

        // 哈希支付密码和密保答案
        const paymentPasswordHash = await bcrypt.hash(paymentPassword, 10);
        const securityAnswerHash = await bcrypt.hash(securityAnswer.toLowerCase().trim(), 10);

        // 更新数据库
        await db.query(
            `UPDATE users SET 
                payment_password_hash = ?,
                security_question = ?,
                security_answer = ?
            WHERE id = ?`,
            [paymentPasswordHash, securityQuestion, securityAnswerHash, adminId]
        );

        res.json({
            code: 200,
            message: '安全设置成功'
        });

    } catch (error) {
        console.error('设置安全信息失败:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

/**
 * GET /security-status
 * 获取安全设置状态
 */
router.get('/security-status', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const adminId = req.user.id;

        const users = await db.query(
            'SELECT payment_password_hash, security_question FROM users WHERE id = ? AND role = ?',
            [adminId, 'admin']
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '管理员账户不存在'
            });
        }

        const admin = users[0];

        res.json({
            code: 200,
            data: {
                hasPaymentPassword: !!admin.payment_password_hash,
                hasSecurityQuestion: !!admin.security_question,
                securityQuestion: admin.security_question || null
            }
        });

    } catch (error) {
        console.error('获取安全状态失败:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

/**
 * POST /reset-payment-password
 * 通过密保问题重置支付密码
 */
router.post('/reset-payment-password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { securityAnswer, newPaymentPassword } = req.body;
        const adminId = req.user.id;

        // 验证必填字段
        if (!securityAnswer || !newPaymentPassword) {
            return res.status(400).json({
                code: 400,
                message: '请填写密保答案和新支付密码'
            });
        }

        // 验证新密码长度
        if (newPaymentPassword.length < 6) {
            return res.status(400).json({
                code: 400,
                message: '新支付密码至少需要6位'
            });
        }

        // 获取管理员的密保答案
        const users = await db.query(
            'SELECT security_answer, security_question FROM users WHERE id = ? AND role = ?',
            [adminId, 'admin']
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '管理员账户不存在'
            });
        }

        const admin = users[0];

        // 检查是否已设置密保问题
        if (!admin.security_answer) {
            return res.status(400).json({
                code: 400,
                message: '尚未设置密保问题，无法重置'
            });
        }

        // 验证密保答案
        const isMatch = await bcrypt.compare(securityAnswer.toLowerCase().trim(), admin.security_answer);

        if (!isMatch) {
            return res.status(401).json({
                code: 401,
                message: '密保答案错误'
            });
        }

        // 哈希新支付密码
        const newPaymentPasswordHash = await bcrypt.hash(newPaymentPassword, 10);

        // 更新支付密码
        await db.query(
            'UPDATE users SET payment_password_hash = ? WHERE id = ?',
            [newPaymentPasswordHash, adminId]
        );

        res.json({
            code: 200,
            message: '支付密码重置成功'
        });

    } catch (error) {
        console.error('重置支付密码失败:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

/**
 * POST /change-payment-password
 * 修改支付密码（需要验证原密码）
 */
router.post('/change-payment-password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminId = req.user.id;

        // 验证必填字段
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                code: 400,
                message: '请填写当前密码和新密码'
            });
        }

        // 验证新密码长度
        if (newPassword.length < 6) {
            return res.status(400).json({
                code: 400,
                message: '新支付密码至少需要6位'
            });
        }

        // 获取当前支付密码
        const users = await db.query(
            'SELECT payment_password_hash FROM users WHERE id = ? AND role = ?',
            [adminId, 'admin']
        );

        if (!users || users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '管理员账户不存在'
            });
        }

        const admin = users[0];

        if (!admin.payment_password_hash) {
            return res.status(400).json({
                code: 400,
                message: '尚未设置支付密码'
            });
        }

        // 验证当前密码
        const isMatch = await bcrypt.compare(currentPassword, admin.payment_password_hash);

        if (!isMatch) {
            return res.status(401).json({
                code: 401,
                message: '当前密码错误'
            });
        }

        // 哈希新密码
        const newPasswordHash = await bcrypt.hash(newPassword, 10);

        // 更新密码
        await db.query(
            'UPDATE users SET payment_password_hash = ? WHERE id = ?',
            [newPasswordHash, adminId]
        );

        res.json({
            code: 200,
            message: '支付密码修改成功'
        });

    } catch (error) {
        console.error('修改支付密码失败:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

/**
 * 中间件：验证支付令牌
 * 用于保护敏感操作的API
 */
function verifyPaymentToken(req, res, next) {
    const paymentToken = req.headers['x-payment-token'];

    if (!paymentToken) {
        return res.status(403).json({
            code: 403,
            message: '需要支付密码验证',
            requirePaymentVerification: true
        });
    }

    try {
        const decoded = jwt.verify(paymentToken, JWT_SECRET);

        // 验证令牌类型
        if (decoded.type !== 'payment_verification') {
            return res.status(403).json({
                code: 403,
                message: '无效的支付验证令牌'
            });
        }

        // 验证是否是同一管理员
        if (decoded.adminId !== req.user.id) {
            return res.status(403).json({
                code: 403,
                message: '令牌与当前用户不匹配'
            });
        }

        req.paymentVerified = true;
        next();

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                code: 403,
                message: '支付验证已过期，请重新验证',
                requirePaymentVerification: true
            });
        }
        return res.status(403).json({
            code: 403,
            message: '无效的支付验证令牌'
        });
    }
}

module.exports = router;
module.exports.verifyPaymentToken = verifyPaymentToken;
