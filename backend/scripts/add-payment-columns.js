/**
 * 直接添加支付设置字段到 site_settings 表
 * Add payment settings columns directly
 */

const { Pool } = require('pg');
require('dotenv').config();

async function addPaymentColumns() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('neon') ? { rejectUnauthorized: false } : false,
    });

    try {
        console.log('🔄 开始添加支付设置字段...\n');

        // 定义要添加的列
        const columns = [
            { name: 'gateway_enabled', type: 'SMALLINT', default: '0' },
            { name: 'gateway_url', type: 'VARCHAR(255)', default: 'NULL' },
            { name: 'gateway_merchant_id', type: 'VARCHAR(100)', default: 'NULL' },
            { name: 'gateway_merchant_key', type: 'VARCHAR(255)', default: 'NULL' },
            { name: 'gateway_notify_url', type: 'VARCHAR(255)', default: 'NULL' },
            { name: 'manual_qr_enabled', type: 'SMALLINT', default: '0' },
            { name: 'manual_qr_image', type: 'TEXT', default: 'NULL' },
            { name: 'manual_qr_description', type: 'VARCHAR(500)', default: 'NULL' },
        ];

        // 逐个添加列
        for (const col of columns) {
            try {
                const sql = `ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} DEFAULT ${col.default}`;
                console.log(`添加字段: ${col.name}...`);
                await pool.query(sql);
                console.log(`✓ ${col.name} 添加成功`);
            } catch (error) {
                if (error.message.includes('already exists') || error.message.includes('duplicate')) {
                    console.log(`⚠ ${col.name} 已存在，跳过`);
                } else {
                    console.error(`✗ ${col.name} 添加失败:`, error.message);
                }
            }
        }

        // 验证字段是否存在
        console.log('\n📋 验证字段...');
        const result = await pool.query(`
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'site_settings' 
            AND column_name IN ('gateway_enabled', 'gateway_url', 'gateway_merchant_id', 'gateway_merchant_key', 'gateway_notify_url', 'manual_qr_enabled', 'manual_qr_image', 'manual_qr_description')
            ORDER BY column_name
        `);

        if (result.rows.length > 0) {
            console.log('✓ 以下支付设置字段已存在:');
            result.rows.forEach(row => {
                console.log(`  - ${row.column_name} (${row.data_type})`);
            });
            console.log(`\n✅ 共 ${result.rows.length} 个字段`);
        } else {
            console.log('⚠ 未找到支付设置字段');
        }

        console.log('\n✅ 完成！现在可以保存支付设置了。');

    } catch (error) {
        console.error('\n❌ 操作失败:', error.message);
        console.error(error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addPaymentColumns();
