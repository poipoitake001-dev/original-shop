-- ========================================
-- 添加支付设置字段到 site_settings 表
-- 执行方式: 在数据库管理工具中直接执行此 SQL
-- ========================================

-- 检查表是否存在
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'site_settings') THEN
        RAISE EXCEPTION 'site_settings 表不存在，请先创建基础表结构';
    END IF;
END $$;

-- 添加支付设置字段 - API 网关
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gateway_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gateway_url VARCHAR(255) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gateway_merchant_id VARCHAR(100) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gateway_merchant_key VARCHAR(255) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gateway_notify_url VARCHAR(255) DEFAULT NULL;

-- 添加支付设置字段 - 手动二维码
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS manual_qr_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS manual_qr_image TEXT DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS manual_qr_description VARCHAR(500) DEFAULT NULL;

-- 添加核心优势徽章字段
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_1_title VARCHAR(50) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_1_desc VARCHAR(200) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_1_icon TEXT DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_2_title VARCHAR(50) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_2_desc VARCHAR(200) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_2_icon TEXT DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_3_title VARCHAR(50) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_3_desc VARCHAR(200) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS feature_3_icon TEXT DEFAULT NULL;

-- 添加其他字段
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS site_name_en VARCHAR(100) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS footer_description TEXT DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS default_product_image TEXT DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS contact_qq VARCHAR(50) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS support_hours VARCHAR(100) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_weibo VARCHAR(255) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_douyin VARCHAR(255) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_xiaohongshu VARCHAR(255) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS social_bilibili VARCHAR(255) DEFAULT NULL;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS withdrawal_fee_percent DECIMAL(5,2) DEFAULT 0.00;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS withdrawal_min_fee DECIMAL(10,2) DEFAULT 0.00;

-- 验证关键字段
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'site_settings' 
AND column_name IN (
    'gateway_enabled', 
    'gateway_url', 
    'manual_qr_enabled', 
    'manual_qr_image',
    'feature_1_title',
    'feature_2_title',
    'feature_3_title'
)
ORDER BY column_name;

-- 完成提示
SELECT '✅ 支付设置字段添加完成！请重启后端服务。' AS status;
