/**
 * 添加支付设置字段到 site_settings 表
 * 执行方式: node backend/scripts/add-payment-columns.js
 */

const db = require('../config/db');

async function addPaymentColumns() {
    console.log('🔧 开始添加支付设置字段...\n');
    
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
            console.log('请先创建基础表结构');
            process.exit(1);
        }
        
        console.log('✓ site_settings 表存在\n');
        
        // 要添加的列
        const columns = [
            // 支付设置 - API 网关
            { name: 'gateway_enabled', type: 'BOOLEAN', default: 'FALSE', comment: 'API网关支付开关' },
            { name: 'gateway_url', type: 'VARCHAR(255)', default: 'NULL', comment: 'API网关地址' },
            { name: 'gateway_merchant_id', type: 'VARCHAR(100)', default: 'NULL', comment: '商户ID' },
            { name: 'gateway_merchant_key', type: 'VARCHAR(255)', default: 'NULL', comment: '商户密钥' },
            { name: 'gateway_notify_url', type: 'VARCHAR(255)', default: 'NULL', comment: '异步通知地址' },
            
            // 支付设置 - 手动二维码
            { name: 'manual_qr_enabled', type: 'BOOLEAN', default: 'FALSE', comment: '手动二维码支付开关' },
            { name: 'manual_qr_image', type: 'TEXT', default: 'NULL', comment: '收款二维码图片' },
            { name: 'manual_qr_description', type: 'VARCHAR(500)', default: 'NULL', comment: '支付说明' },
            
            // 核心优势徽章
            { name: 'feature_1_title', type: 'VARCHAR(50)', default: 'NULL', comment: '优势1标题' },
            { name: 'feature_1_desc', type: 'VARCHAR(200)', default: 'NULL', comment: '优势1描述' },
            { name: 'feature_1_icon', type: 'TEXT', default: 'NULL', comment: '优势1图标' },
            { name: 'feature_2_title', type: 'VARCHAR(50)', default: 'NULL', comment: '优势2标题' },
            { name: 'feature_2_desc', type: 'VARCHAR(200)', default: 'NULL', comment: '优势2描述' },
            { name: 'feature_2_icon', type: 'TEXT', default: 'NULL', comment: '优势2图标' },
            { name: 'feature_3_title', type: 'VARCHAR(50)', default: 'NULL', comment: '优势3标题' },
            { name: 'feature_3_desc', type: 'VARCHAR(200)', default: 'NULL', comment: '优势3描述' },
            { name: 'feature_3_icon', type: 'TEXT', default: 'NULL', comment: '优势3图标' },
            
            // 其他字段
            { name: 'site_name_en', type: 'VARCHAR(100)', default: 'NULL', comment: '站点英文名称' },
            { name: 'footer_description', type: 'TEXT', default: 'NULL', comment: '页脚描述' },
            { name: 'default_product_image', type: 'TEXT', default: 'NULL', comment: '默认商品图片' },
            { name: 'contact_qq', type: 'VARCHAR(50)', default: 'NULL', comment: 'QQ号' },
            { name: 'support_hours', type: 'VARCHAR(100)', default: 'NULL', comment: '客服时间' },
            { name: 'social_weibo', type: 'VARCHAR(255)', default: 'NULL', comment: '微博链接' },
            { name: 'social_douyin', type: 'VARCHAR(255)', default: 'NULL', comment: '抖音链接' },
            { name: 'social_xiaohongshu', type: 'VARCHAR(255)', default: 'NULL', comment: '小红书链接' },
            { name: 'social_bilibili', type: 'VARCHAR(255)', default: 'NULL', comment: 'B站链接' },
            { name: 'withdrawal_fee_percent', type: 'DECIMAL(5,2)', default: '0.00', comment: '提现手续费百分比' },
            { name: 'withdrawal_min_fee', type: 'DECIMAL(10,2)', default: '0.00', comment: '最低手续费' }
        ];
        
        let addedCount = 0;
        let skippedCount = 0;
        
        for (const col of columns) {
            try {
                // 检查列是否已存在
                const columnCheck = await db.query(`
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = 'site_settings' 
                        AND column_name = $1
                    );
                `, [col.name]);
                
                if (columnCheck[0].exists) {
                    console.log(`⊘ ${col.name} - 已存在，跳过`);
                    skippedCount++;
                    continue;
                }
                
                // 添加列
                const sql = `ALTER TABLE site_settings ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`;
                await db.query(sql);
                console.log(`✓ ${col.name} - 添加成功`);
                addedCount++;
                
            } catch (error) {
                console.error(`✗ ${col.name} - 添加失败:`, error.message);
            }
        }
        
        console.log('\n========================================');
        console.log(`✅ 完成！`);
        console.log(`   新增: ${addedCount} 个字段`);
        console.log(`   跳过: ${skippedCount} 个字段`);
        console.log('========================================\n');
        
        // 验证
        console.log('验证关键字段：');
        const verifyColumns = ['gateway_enabled', 'manual_qr_enabled', 'gateway_url', 'manual_qr_image'];
        for (const colName of verifyColumns) {
            const check = await db.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'site_settings' 
                    AND column_name = $1
                );
            `, [colName]);
            console.log(`  ${check[0].exists ? '✓' : '✗'} ${colName}`);
        }
        
        console.log('\n🚀 请重启后端服务：');
        console.log('   cd backend');
        console.log('   npm start\n');
        
        process.exit(0);
        
    } catch (error) {
        console.error('❌ 执行失败:', error);
        console.error(error.stack);
        process.exit(1);
    }
}

// 执行
addPaymentColumns();
