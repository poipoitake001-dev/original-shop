/**
 * 数据库迁移脚本
 * 执行方式: node backend/scripts/migrate.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
    try {
        console.log('开始执行数据库迁移...\n');
        
        // 读取迁移 SQL 文件
        const sqlFile = path.join(__dirname, '../../database/migrations/add_settings_tables.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        // 分割 SQL 语句（按分号分割，但要注意存储过程等特殊情况）
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
        
        console.log(`共 ${statements.length} 条 SQL 语句需要执行\n`);
        
        // 逐条执行
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            
            // 跳过注释和空语句
            if (!statement || statement.startsWith('--') || statement.startsWith('SELECT \'===')) {
                continue;
            }
            
            try {
                await db.query(statement);
                
                // 显示进度
                if (statement.includes('CREATE TABLE')) {
                    const tableName = statement.match(/CREATE TABLE (?:IF NOT EXISTS )?`?(\w+)`?/i)?.[1];
                    console.log(`✓ 创建表: ${tableName}`);
                } else if (statement.includes('INSERT INTO')) {
                    const tableName = statement.match(/INSERT INTO `?(\w+)`?/i)?.[1];
                    console.log(`✓ 插入数据: ${tableName}`);
                }
            } catch (error) {
                // 忽略表已存在等错误
                if (error.code !== 'ER_TABLE_EXISTS_ERROR' && error.code !== 'ER_DUP_ENTRY') {
                    console.error(`✗ 执行失败: ${error.message}`);
                    console.error(`  SQL: ${statement.substring(0, 100)}...`);
                }
            }
        }
        
        console.log('\n数据库迁移完成！\n');
        
        // 验证结果
        console.log('验证迁移结果：');
        const settings = await db.query('SELECT COUNT(*) as count FROM site_settings');
        console.log(`- site_settings 表: ${settings[0].count} 条记录`);
        
        const badges = await db.query('SELECT COUNT(*) as count FROM trust_badges');
        console.log(`- trust_badges 表: ${badges[0].count} 条记录`);
        
        const pages = await db.query('SELECT COUNT(*) as count FROM info_pages');
        console.log(`- info_pages 表: ${pages[0].count} 条记录`);
        
        console.log('\n迁移成功！可以启动应用了。\n');
        process.exit(0);
        
    } catch (error) {
        console.error('迁移失败:', error);
        process.exit(1);
    }
}

// 执行迁移
runMigration();
