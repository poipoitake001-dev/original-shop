/**
 * ========================================
 * 数据库配置模块
 * Database Configuration
 * 支持本地开发和云数据库部署
 * ========================================
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库连接池配置
// 支持 DATABASE_URL（云数据库）或单独配置（本地开发）
let poolConfig;

if (process.env.DATABASE_URL) {
    // 云数据库连接（Railway 等）
    // Railway 内部连接不需要 SSL 验证
    poolConfig = {
        uri: process.env.DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 5,
        queueLimit: 0,
        charset: 'utf8mb4'
    };
} else {
    // 本地开发环境
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'space_card_shop',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    };
}

const pool = mysql.createPool(poolConfig);

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✓ 数据库连接成功');
        connection.release();
        return true;
    } catch (error) {
        console.error('✗ 数据库连接失败:', error.message);
        return false;
    }
}

// 执行SQL查询 - 使用 query 而不是 execute 避免参数类型问题
async function query(sql, params) {
    try {
        // 确保 params 是数组，如果为空则传入空数组
        const safeParams = Array.isArray(params) ? params : [];
        const [rows] = await pool.query(sql, safeParams);
        return rows;
    } catch (error) {
        console.error('SQL 执行错误:', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
        throw error;
    }
}

// 执行SQL并返回插入ID
async function insert(sql, params) {
    try {
        const safeParams = Array.isArray(params) ? params : [];
        const [result] = await pool.query(sql, safeParams);
        return result.insertId;
    } catch (error) {
        console.error('SQL INSERT 错误:', error.message);
        console.error('SQL:', sql);
        throw error;
    }
}

// 执行SQL并返回影响行数
async function update(sql, params) {
    try {
        const safeParams = Array.isArray(params) ? params : [];
        const [result] = await pool.query(sql, safeParams);
        return result.affectedRows;
    } catch (error) {
        console.error('SQL UPDATE 错误:', error.message);
        console.error('SQL:', sql);
        throw error;
    }
}

/**
 * 获取数据库连接（用于事务操作）
 * 使用方式:
 *   const conn = await db.getConnection();
 *   try {
 *     await conn.beginTransaction();
 *     await conn.query(...);
 *     await conn.commit();
 *   } catch (e) {
 *     await conn.rollback();
 *     throw e;
 *   } finally {
 *     conn.release();
 *   }
 */
async function getConnection() {
    return await pool.getConnection();
}

module.exports = {
    pool,
    query,
    insert,
    update,
    getConnection,
    testConnection
};
