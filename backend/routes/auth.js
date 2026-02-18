/**
 * ========================================
 * 管理后台认证路由（与后端一体部署时使用）
 * Admin Auth Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { verifyToken, verifyAdmin, generateToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

// 管理后台登录（仅管理员，与 /api/users/login 逻辑一致但限制 role=admin）
router.post('/login', async (req, res) => {
    try {
        const { account, password } = req.body;
        if (!account || !password) {
            return res.status(400).json({ code: 400, message: '账号和密码不能为空' });
        }
        const users = await db.query(
            'SELECT id, username, email, password, avatar, role, status FROM users WHERE (username = ? OR email = ?) AND role = ?',
            [String(account), String(account), 'admin']
        );
        if (users.length === 0) {
            return res.status(401).json({ code: 401, message: '账号或密码错误' });
        }
        const user = users[0];
        if (user.status === 0) {
            return res.status(403).json({ code: 403, message: '账户已被禁用' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ code: 401, message: '账号或密码错误' });
        }
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
        });
        return res.json({
            code: 200,
            message: '登录成功',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: user.role
                }
            }
        });
    } catch (error) {
        console.error('管理后台登录失败:', error);
        return res.status(500).json({ code: 500, message: '登录失败' });
    }
});

// 验证 Token（管理后台用，返回当前用户）
router.get('/verify', verifyToken, (req, res) => {
    return res.json({
        code: 200,
        data: { user: req.user }
    });
});

// 修改密码（管理后台用，与 /api/users/password 一致）
router.put('/password', verifyToken, userController.changePassword);

module.exports = router;
