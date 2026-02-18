/**
 * ========================================
 * 订单路由
 * Order Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, verifyAdmin, optionalToken } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validate');

// ========== 公开接口 ==========

// 创建订单（支持游客，可选登录）
router.post('/', optionalToken, validate(schemas.createOrder), orderController.createOrder);

// 通过订单号查询订单
router.get('/query/:orderNo', orderController.getOrderByNo);

// 获取订单状态（轻量级，用于前端轮询）
router.get('/:id/status', orderController.getOrderStatus);

// ========== 用户接口（需登录）==========

// 获取当前用户的订单
router.get('/my', verifyToken, orderController.getMyOrders);

// ========== 管理员接口 ==========

// 获取订单列表（需管理员权限）
router.get('/', verifyToken, verifyAdmin, orderController.getOrders);

// 批量删除订单（需管理员权限）- 必须放在 /:id 路由之前
router.post('/batch-delete', verifyToken, verifyAdmin, orderController.batchDeleteOrders);

// 获取订单详情（需管理员权限）
router.get('/:id', verifyToken, verifyAdmin, orderController.getOrderById);

// 更新订单状态（需管理员权限）
router.patch('/:id/status', verifyToken, verifyAdmin, orderController.updateOrderStatus);

// 模拟支付（测试用，需管理员权限）
router.post('/:id/pay', verifyToken, verifyAdmin, orderController.simulatePay);

// 手动分配卡密（需管理员权限）
router.post('/:id/assign-cardkeys', verifyToken, verifyAdmin, orderController.assignCardKeys);

// 删除订单（需管理员权限）
router.delete('/:id', verifyToken, verifyAdmin, orderController.deleteOrder);

module.exports = router;
