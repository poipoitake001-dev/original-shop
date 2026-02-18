/**
 * ========================================
 * 用户安全路由（前台用户）
 * User Security Routes
 * ========================================
 *
 * 功能：
 * - 设置/修改支付密码
 * - 设置密保问题
 * - 通过密保重置登录密码
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'space-card-shop-secret-key';

/**
 * POST /set-payment-password
 * 设置支付密码（需要验证登录密码）
 */
router.post('/set-payment-password', verifyToken, async (req, res) => {
    try {
        const { loginPassword, paymentPassword } = req.body;
        if (!loginPassword || !paymentPassword) {
            return res.status(400).json({ code: 400, message: '请填写登录密码和支付密码' });
        }
        if (paymentPassword.length < 6) {
            return res.status(400).json({ code: 400, message: '支付密码不能少于6位' });
        }

        // 验证登录密码
        const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        const isMatch = await bcrypt.compare(loginPassword, users[0].password);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '登录密码错误' });
        }

        // 加密并保存支付密码
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(paymentPassword, salt);
        await db.query('UPDATE users SET payment_password_hash = ? WHERE id = ?', [hash, req.user.id]);

        res.json({ code: 200, message: '支付密码设置成功' });
    } catch (error) {
        console.error('设置支付密码失败:', error);
        res.status(500).json({ code: 500, message: '设置失败' });
    }
});

/**
 * POST /verify-payment-password
 * 验证支付密码
 */
router.post('/verify-payment-password', verifyToken, async (req, res) => {
    try {
        const { paymentPassword } = req.body;
        if (!paymentPassword) {
            return res.status(400).json({ code: 400, message: '请输入支付密码' });
        }

        const users = await db.query('SELECT payment_password_hash FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        if (!users[0].payment_password_hash) {
            return res.status(400).json({ code: 400, message: '尚未设置支付密码', needSetup: true });
        }

        const isMatch = await bcrypt.compare(paymentPassword, users[0].payment_password_hash);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '支付密码错误' });
        }

        res.json({ code: 200, message: '验证成功' });
    } catch (error) {
        console.error('验证支付密码失败:', error);
        res.status(500).json({ code: 500, message: '验证失败' });
    }
});

/**
 * POST /set-security-question
 * 设置密保问题
 */
router.post('/set-security-question', verifyToken, async (req, res) => {
    try {
        const { loginPassword, securityQuestion, securityAnswer } = req.body;
        if (!loginPassword || !securityQuestion || !securityAnswer) {
            return res.status(400).json({ code: 400, message: '请填写所有字段' });
        }

        // 验证登录密码
        const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        const isMatch = await bcrypt.compare(loginPassword, users[0].password);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '登录密码错误' });
        }

        // 加密答案并保存
        const salt = await bcrypt.genSalt(10);
        const answerHash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), salt);
        await db.query(
            'UPDATE users SET security_question = ?, security_answer = ? WHERE id = ?',
            [securityQuestion.trim(), answerHash, req.user.id]
        );

        res.json({ code: 200, message: '密保问题设置成功' });
    } catch (error) {
        console.error('设置密保失败:', error);
        res.status(500).json({ code: 500, message: '设置失败' });
    }
});

/**
 * GET /security-status
 * 获取安全设置状态
 */
router.get('/security-status', verifyToken, async (req, res) => {
    try {
        const users = await db.query(
            'SELECT security_question, security_answer, payment_password_hash FROM users WHERE id = ?',
            [req.user.id]
        );
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        res.json({
            code: 200,
            data: {
                hasPaymentPassword: !!users[0].payment_password_hash,
                hasSecurityQuestion: !!users[0].security_question && !!users[0].security_answer,
                securityQuestion: users[0].security_question || null
            }
        });
    } catch (error) {
        console.error('获取安全状态失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * POST /verify-security-question
 * 验证密保问题，返回临时 token 用于重置密码
 */
router.post('/verify-security-question', async (req, res) => {
    try {
        const { account, securityAnswer } = req.body;
        if (!account || !securityAnswer) {
            return res.status(400).json({ code: 400, message: '请填写账号和密保答案' });
        }

        const users = await db.query(
            'SELECT id, username, security_question, security_answer FROM users WHERE username = ? OR email = ?',
            [account, account.toLowerCase()]
        );
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = users[0];
        if (!user.security_answer) {
            return res.status(400).json({ code: 400, message: '该账号未设置密保问题' });
        }

        const isMatch = await bcrypt.compare(securityAnswer.trim().toLowerCase(), user.security_answer);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '密保答案错误' });
        }

        // 生成临时重置 token（5分钟有效）
        const resetToken = jwt.sign(
            { userId: user.id, type: 'password_reset' },
            JWT_SECRET,
            { expiresIn: '5m' }
        );

        res.json({ code: 200, message: '验证成功', data: { resetToken } });
    } catch (error) {
        console.error('验证密保失败:', error);
        res.status(500).json({ code: 500, message: '验证失败' });
    }
});

/**
 * GET /security-question
 * 获取用户的密保问题（用于忘记密码流程）
 */
router.get('/security-question', async (req, res) => {
    try {
        const { account } = req.query;
        if (!account) {
            return res.status(400).json({ code: 400, message: '请提供账号' });
        }

        const users = await db.query(
            'SELECT security_question FROM users WHERE username = ? OR email = ?',
            [account, account.toLowerCase()]
        );
        if (users.length === 0 || !users[0].security_question) {
            return res.status(404).json({ code: 404, message: '未找到密保问题' });
        }

        res.json({ code: 200, data: { securityQuestion: users[0].security_question } });
    } catch (error) {
        console.error('获取密保问题失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * POST /reset-password-via-security
 * 使用密保重置 token 来设置新登录密码
 */
router.post('/reset-password-via-security', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        if (!resetToken || !newPassword) {
            return res.status(400).json({ code: 400, message: '请提供重置令牌和新密码' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ code: 400, message: '新密码不能少于6位' });
        }

        // 验证 token
        let decoded;
        try {
            decoded = jwt.verify(resetToken, JWT_SECRET);
        } catch (e) {
            return res.status(401).json({ code: 401, message: '重置令牌无效或已过期' });
        }

        if (decoded.type !== 'password_reset') {
            return res.status(401).json({ code: 401, message: '令牌类型无效' });
        }

        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, decoded.userId]);

        res.json({ code: 200, message: '密码重置成功' });
    } catch (error) {
        console.error('重置密码失败:', error);
        res.status(500).json({ code: 500, message: '重置失败' });
    }
});

module.exports = router;
