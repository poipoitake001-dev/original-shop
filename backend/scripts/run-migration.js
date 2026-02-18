/**
 * 执行数据库迁移脚本
 * Run Database Migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('🔄 开始执行数据库迁移...');
        console.log('📍 数据库:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[1] || 'Unknown');

        // 读取 PostgreSQL 迁移脚本
        const sqlPath = path.join(__dirname, '../../database/migrations/add_settings_tables_postgres.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // 移除注释行
        const cleanedSQL = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
            .join('\n');

        // 按分号分割，但保留完整的语句
        const statements = cleanedSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 10);

        console.log(`📝 共 ${statements.length} 条 SQL 语句待执行\n`);

        // 逐条执行
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            try {
                console.log(`[${i + 1}/${statements.length}] 执行中...`);
                console.log(`SQL: ${statement.substring(0, 80)}...`);
                await pool.query(statement);
                console.log(`✓ 成功\n`);
            } catch (error) {
                // 如果是"表已存在"错误，继续执行
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log(`⚠ 跳过（已存在）\n`);
                } else {
                    console.error(`✗ 失败:`, error.message);
                    console.error(`SQL:`, statement.substring(0, 200) + '...\n');
                }
            }
        }

        // 验证表是否创建成功
        console.log('\n📊 验证数据库表...');
        const tables = await pool.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('site_settings', 'trust_badges', 'info_pages')
            ORDER BY table_name
        `);

        if (tables.rows.length > 0) {
            console.log('✓ 以下表已存在:');
            tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
        } else {
            console.log('⚠ 未找到目标表，请检查迁移脚本');
        }

        // 检查 site_settings 表的列
        console.log('\n📋 检查 site_settings 表结构...');
        const columns = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'site_settings' 
            AND column_name IN ('gateway_enabled', 'gateway_url', 'manual_qr_enabled', 'manual_qr_image')
            ORDER BY column_name
        `);

        if (columns.rows.length > 0) {
            console.log('✓ 支付设置字段已存在:');
            columns.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
        } else {
            console.log('⚠ 未找到支付设置字段');
        }

        console.log('\n✅ 数据库迁移完成！');
        
    } catch (error) {
        console.error('\n❌ 迁移失败:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
