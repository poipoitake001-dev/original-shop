/**
 * 检查数据库状态
 * 执行方式: node backend/scripts/check-db.js
 */

const db = require('../config/db');

async function checkDatabase() {
    console.log('🔍 检查数据库状态...\n');
    
    try {
        // 1. 测试数据库连接
        console.log('1️⃣ 测试数据库连接...');
        await db.query('SELECT 1');
        console.log('   ✓ 数据库连接正常\n');
        
        // 2. 检查表是否存在
        console.log('2️⃣ 检查必要的表...');
        const tables = ['site_settings', 'trust_badges', 'info_pages'];
        
        for (const table of tables) {
            try {
                const result = await db.query(`SHOW TABLES LIKE '${table}'`);
                if (result.length > 0) {
                    console.log(`   ✓ ${table} 表存在`);
                } else {
                    console.log(`   ✗ ${table} 表不存在 - 需要执行迁移`);
                }
            } catch (error) {
                console.log(`   ✗ 检查 ${table} 失败: ${error.message}`);
            }
        }
        console.log('');
        
        // 3. 检查 site_settings 表结构
        console.log('3️⃣ 检查 site_settings 表结构...');
        try {
            const columns = await db.query('SHOW COLUMNS FROM site_settings');
            const requiredFields = [
                'gateway_enabled',
                'gateway_url',
                'gateway_merchant_id',
                'gateway_merchant_key',
                'manual_qr_enabled',
                'manual_qr_image',
                'manual_qr_description',
                'feature_1_title',
                'feature_2_title',
                'feature_3_title'
            ];
            
            const existingFields = columns.map(col => col.Field);
            
            for (const field of requiredFields) {
                if (existingFields.includes(field)) {
                    console.log(`   ✓ ${field} 字段存在`);
                } else {
                    console.log(`   ✗ ${field} 字段不存在 - 需要执行迁移`);
                }
            }
        } catch (error) {
            console.log(`   ✗ 无法检查表结构: ${error.message}`);
            console.log(`   提示: 可能是 site_settings 表不存在，请执行迁移脚本`);
        }
        console.log('');
        
        // 4. 检查数据
        console.log('4️⃣ 检查数据...');
        try {
            const settings = await db.query('SELECT * FROM site_settings WHERE id = 1');
            if (settings.length > 0) {
                console.log(`   ✓ site_settings 有 ${settings.length} 条记录`);
                console.log(`   站点名称: ${settings[0].site_name || '未设置'}`);
            } else {
                console.log(`   ⚠️  site_settings 表为空 - 需要执行迁移`);
            }
            
            const badges = await db.query('SELECT COUNT(*) as count FROM trust_badges');
            console.log(`   ✓ trust_badges 有 ${badges[0].count} 条记录`);
            
            const pages = await db.query('SELECT COUNT(*) as count FROM info_pages');
            console.log(`   ✓ info_pages 有 ${pages[0].count} 条记录`);
        } catch (error) {
            console.log(`   ✗ 无法查询数据: ${error.message}`);
        }
        console.log('');
        
        // 5. 总结
        console.log('📋 检查总结:');
        console.log('─'.repeat(50));
        
        try {
            const tablesCheck = await db.query("SHOW TABLES LIKE 'site_settings'");
            if (tablesCheck.length === 0) {
                console.log('❌ 数据库未初始化');
                console.log('');
                console.log('请执行以下命令进行初始化：');
                console.log('  node backend/scripts/migrate.js');
            } else {
                const columns = await db.query('SHOW COLUMNS FROM site_settings');
                const hasNewFields = columns.some(col => col.Field === 'gateway_enabled');
                
                if (!hasNewFields) {
                    console.log('⚠️  数据库需要更新');
                    console.log('');
                    console.log('请执行以下命令更新数据库：');
                    console.log('  node backend/scripts/migrate.js');
                } else {
                    console.log('✅ 数据库状态正常，可以使用！');
                }
            }
        } catch (error) {
            console.log('❌ 检查失败:', error.message);
        }
        
        console.log('');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 检查过程出错:', error);
        console.log('');
        console.log('可能的原因：');
        console.log('1. 数据库未启动');
        console.log('2. 数据库配置错误（检查 backend/.env）');
        console.log('3. 数据库权限不足');
        process.exit(1);
    }
}

// 执行检查
checkDatabase();
