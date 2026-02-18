/**
 * ========================================
 * 商品路由
 * Product Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ========== 公开接口 ==========

// 获取分类列表
router.get('/categories', productController.getCategories);

// 获取商品列表
router.get('/', productController.getProducts);

// 获取商品详情
router.get('/:id', productController.getProductById);

// ========== 社交互动接口 ==========

// 切换"想要"状态（需登录）
router.post('/:id/want', verifyToken, productController.toggleWant);

// 获取当前用户的想要状态（需登录）
router.get('/:id/want-status', verifyToken, productController.getWantStatus);

// ========== 管理员接口 ==========

// 新增商品（需管理员权限）
router.post('/', verifyToken, verifyAdmin, productController.createProduct);

// 更新商品（需管理员权限）
router.put('/:id', verifyToken, verifyAdmin, productController.updateProduct);

// 更新库存（需管理员权限）
router.patch('/:id/stock', verifyToken, verifyAdmin, productController.updateStock);

// 删除商品（需管理员权限）
router.delete('/:id', verifyToken, verifyAdmin, productController.deleteProduct);

module.exports = router;
