/**
 * ========================================
 * 用户路由
 * User Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middleware/auth');

// 用户注册
router.post('/register', userController.register);

// 用户登录
router.post('/login', userController.login);

// 获取当前用户信息（需登录）
router.get('/profile', verifyToken, userController.getProfile);

// 更新个人资料（需登录）
router.patch('/profile', verifyToken, userController.updateProfile);

// 获取用户公开信息（无需登录）
router.get('/:id/public', userController.getPublicProfile);

// 修改密码（需登录）
router.put('/password', verifyToken, userController.changePassword);

// ========== 学生认证 ==========

// 提交学生认证申请（需登录）
router.post('/verify-student', verifyToken, userController.submitStudentVerification);

// 获取学生认证状态（需登录）
router.get('/verify-student/status', verifyToken, userController.getStudentVerificationStatus);

module.exports = router;
