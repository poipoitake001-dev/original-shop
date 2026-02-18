/**
 * ========================================
 * 数据库配置模块
 * Database Configuration
 * 支持 PostgreSQL (Neon) 云数据库
 * ========================================
 */

const { Pool } = require('pg');
require('dotenv').config();

// PostgreSQL 连接池配置
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// 测试数据库连接
async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✓ 数据库连接成功 (PostgreSQL)');
        client.release();
        return true;
    } catch (error) {
        console.error('✗ 数据库连接失败:', error.message);
        return false;
    }
}

/**
 * 将 MySQL 风格的 SQL 转换为 PostgreSQL 风格
 * - ? 占位符 → $1, $2, $3...
 * - MySQL 函数 → PostgreSQL 函数
 */
function convertSQL(sql, params) {
    let paramIndex = 0;
    let convertedSQL = sql
        // 替换 ? 为 $1, $2, $3...
        .replace(/\?/g, () => `$${++paramIndex}`)
        // MySQL → PostgreSQL 函数转换
        .replace(/NOW\(\)/gi, 'NOW()')
        .replace(/CURDATE\(\)/gi, 'CURRENT_DATE')
        .replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\)/gi, "($1 - INTERVAL '$2 $3')")
        .replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s+(\d+)\s+(\w+)\)/gi, "($1 + INTERVAL '$2 $3')")
        .replace(/IFNULL\(/gi, 'COALESCE(')
        .replace(/LIMIT\s+(\d+)\s*,\s*(\d+)/gi, 'LIMIT $2 OFFSET $1')
        // AUTO_INCREMENT → SERIAL (仅用于建表)
        .replace(/INT\s+AUTO_INCREMENT/gi, 'SERIAL')
        .replace(/BIGINT\s+AUTO_INCREMENT/gi, 'BIGSERIAL')
        // MySQL 特有语法
        .replace(/`/g, '"')
        .replace(/TINYINT\(1\)/gi, 'BOOLEAN')
        .replace(/TINYINT/gi, 'SMALLINT')
        .replace(/DATETIME/gi, 'TIMESTAMP')
        .replace(/ON DUPLICATE KEY UPDATE/gi, 'ON CONFLICT DO UPDATE SET');
    
    return convertedSQL;
}

// 执行SQL查询
async function query(sql, params) {
    try {
        const safeParams = Array.isArray(params) ? params : [];
        const convertedSQL = convertSQL(sql, safeParams);
        const result = await pool.query(convertedSQL, safeParams);
        return result.rows;
    } catch (error) {
        console.error('SQL 执行错误:', error.message);
        console.error('Original SQL:', sql);
        console.error('Converted SQL:', convertSQL(sql, params));
        console.error('Params:', params);
        throw error;
    }
}

// 执行SQL并返回插入ID
async function insert(sql, params) {
    try {
        const safeParams = Array.isArray(params) ? params : [];
        // PostgreSQL 需要 RETURNING id 来获取插入的 ID
        let convertedSQL = convertSQL(sql, safeParams);
        if (!convertedSQL.toLowerCase().includes('returning')) {
            convertedSQL += ' RETURNING id';
        }
        const result = await pool.query(convertedSQL, safeParams);
        return result.rows[0]?.id;
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
        const convertedSQL = convertSQL(sql, safeParams);
        const result = await pool.query(convertedSQL, safeParams);
        return result.rowCount;
    } catch (error) {
        console.error('SQL UPDATE 错误:', error.message);
        console.error('SQL:', sql);
        throw error;
    }
}

/**
 * 获取数据库连接（用于事务操作）
 * PostgreSQL 事务使用方式:
 *   const client = await db.getConnection();
 *   try {
 *     await client.query('BEGIN');
 *     await client.query(...);
 *     await client.query('COMMIT');
 *   } catch (e) {
 *     await client.query('ROLLBACK');
 *     throw e;
 *   } finally {
 *     client.release();
 *   }
 */
async function getConnection() {
    const client = await pool.connect();
    // 添加兼容 MySQL 的方法
    client.beginTransaction = () => client.query('BEGIN');
    client.commit = () => client.query('COMMIT');
    client.rollback = () => client.query('ROLLBACK');
    return client;
}

module.exports = {
    pool,
    query,
    insert,
    update,
    getConnection,
    testConnection
};
