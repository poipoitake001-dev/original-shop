/**
 * ========================================
 * 认证中间件
 * Authentication Middleware
 * ========================================
 */

const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

/**
 * 验证JWT Token
 * 必须登录才能访问的接口使用此中间件
 */
function verifyToken(req, res, next) {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({
            code: 401,
            message: '未提供认证令牌'
        });
    }
    
    // 解析 Bearer Token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            code: 401,
            message: '认证令牌格式错误'
        });
    }
    
    const token = parts[1];
    
    try {
        // 验证token
        const decoded = jwt.verify(token, JWT_SECRET);
        // 将用户信息附加到请求对象
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                code: 401,
                message: '认证令牌已过期，请重新登录'
            });
        }
        return res.status(401).json({
            code: 401,
            message: '无效的认证令牌'
        });
    }
}

/**
 * 可选验证Token
 * 登录和未登录都可以访问，但登录用户会有用户信息
 */
function optionalToken(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        req.user = null;
        return next();
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        req.user = null;
        return next();
    }
    
    const token = parts[1];
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (error) {
        req.user = null;
    }
    
    next();
}

/**
 * 验证管理员权限
 * 需要先通过 verifyToken 中间件
 */
function verifyAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            code: 401,
            message: '未登录'
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            code: 403,
            message: '权限不足，需要管理员权限'
        });
    }
    
    next();
}

/**
 * 验证卖家权限
 * 需要先通过 verifyToken 中间件
 * 从数据库实时查询角色（JWT token 中的 role 可能过期）
 */
async function verifySeller(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            code: 401,
            message: '未登录'
        });
    }
    
    // 管理员也拥有卖家权限
    if (req.user.role === 'admin') {
        return next();
    }
    
    // JWT 中的 role 可能是旧的（用户登录后被批准为卖家）
    // 从数据库实时查询当前角色
    try {
        const db = require('../config/db');
        const users = await db.query('SELECT role, seller_status FROM users WHERE id = ?', [req.user.id]);
        if (users.length > 0 && (users[0].role === 'seller' || users[0].role === 'admin')) {
            // 更新 req.user 供后续中间件使用
            req.user.role = users[0].role;
            req.user.sellerStatus = users[0].seller_status;
            return next();
        }
    } catch (e) {
        console.error('verifySeller DB check failed:', e.message);
    }
    
    return res.status(403).json({
        code: 403,
        message: '权限不足，需要卖家权限'
    });
}

/**
 * 验证卖家或管理员权限
 * 用于卖家可以操作自己的资源，管理员可以操作所有资源的场景
 */
function verifySellerOrAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            code: 401,
            message: '未登录'
        });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'seller') {
        return res.status(403).json({
            code: 403,
            message: '权限不足，需要卖家或管理员权限'
        });
    }
    
    next();
}

/**
 * 生成JWT Token
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
}

module.exports = {
    verifyToken,
    optionalToken,
    verifyAdmin,
    verifySeller,
    verifySellerOrAdmin,
    generateToken
};
