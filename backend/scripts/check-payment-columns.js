/**
 * 检查支付设置字段是否存在
 * 执行方式: node backend/scripts/check-payment-columns.js
 */

const db = require('../config/db');

async function checkColumns() {
    console.log('🔍 检查支付设置字段...\n');
    
    try {
        // 检查表是否存在
        const tableCheck = await db.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'site_settings'
            );
        `);
        
        if (!tableCheck[0].exists) {
            console.log('❌ site_settings 表不存在');
            process.exit(1);
        }
        
        console.log('✓ site_settings 表存在\n');
        
        // 需要检查的字段
        const requiredColumns = [
            'gateway_enabled',
            'gateway_url',
            'gateway_merchant_id',
            'gateway_merchant_key',
            'gateway_notify_url',
            'manual_qr_enabled',
            'manual_qr_image',
            'manual_qr_description',
            'feature_1_title',
            'feature_2_title',
            'feature_3_title'
        ];
        
        let existingCount = 0;
        let missingCount = 0;
        const missingColumns = [];
        
        console.log('检查关键字段：\n');
        
        for (const colName of requiredColumns) {
            const check = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'site_settings' 
                    AND column_name = $1
                );
            `, [colName]);
            
            if (check[0].exists) {
                console.log(`  ✓ ${colName}`);
                existingCount++;
            } else {
                console.log(`  ✗ ${colName} - 缺失`);
                missingCount++;
                missingColumns.push(colName);
            }
        }
        
        console.log('\n========================================');
        console.log(`检查完成：`);
        console.log(`  存在: ${existingCount} 个字段`);
        console.log(`  缺失: ${missingCount} 个字段`);
        console.log('========================================\n');
        
        if (missingCount > 0) {
            console.log('❌ 发现缺失字段，需要执行数据库迁移！\n');
            console.log('请执行以下命令：');
            console.log('  node backend/scripts/add-payment-columns.js\n');
            console.log('或者在数据库管理工具中执行：');
            console.log('  ADD_PAYMENT_COLUMNS.sql (PostgreSQL)');
            console.log('  ADD_PAYMENT_COLUMNS_MYSQL.sql (MySQL)\n');
            process.exit(1);
        } else {
            console.log('✅ 所有字段都已存在！\n');
            console.log('如果保存仍然失败，请检查：');
            console.log('  1. 后端服务是否已重启');
            console.log('  2. 浏览器控制台是否有错误');
            console.log('  3. 后端日志输出\n');
            process.exit(0);
        }
        
    } catch (error) {
        console.error('❌ 检查失败:', error.message);
        console.error('\n可能的原因：');
        console.error('  1. 数据库连接失败 - 检查 backend/.env 中的 DATABASE_URL');
        console.error('  2. 数据库类型不匹配 - 确认是 PostgreSQL 还是 MySQL');
        console.error('  3. 权限不足 - 确认数据库用户有查询权限\n');
        process.exit(1);
    }
}

// 执行
checkColumns();
