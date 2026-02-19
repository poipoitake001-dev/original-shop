-- ========================================
-- 添加支付设置字段到 site_settings 表 (MySQL 版本)
-- 执行方式: 在数据库管理工具中直接执行此 SQL
-- ========================================

-- 检查表是否存在
SELECT COUNT(*) INTO @table_exists 
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'site_settings';

-- 添加支付设置字段 - API 网关
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS gateway_enabled TINYINT(1) DEFAULT 0 COMMENT 'API网关支付开关',
ADD COLUMN IF NOT EXISTS gateway_url VARCHAR(255) DEFAULT NULL COMMENT 'API网关地址',
ADD COLUMN IF NOT EXISTS gateway_merchant_id VARCHAR(100) DEFAULT NULL COMMENT '商户ID',
ADD COLUMN IF NOT EXISTS gateway_merchant_key VARCHAR(255) DEFAULT NULL COMMENT '商户密钥',
ADD COLUMN IF NOT EXISTS gateway_notify_url VARCHAR(255) DEFAULT NULL COMMENT '异步通知地址';

-- 添加支付设置字段 - 手动二维码
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS manual_qr_enabled TINYINT(1) DEFAULT 0 COMMENT '手动二维码支付开关',
ADD COLUMN IF NOT EXISTS manual_qr_image TEXT DEFAULT NULL COMMENT '收款二维码图片',
ADD COLUMN IF NOT EXISTS manual_qr_description VARCHAR(500) DEFAULT NULL COMMENT '支付说明';

-- 添加核心优势徽章字段
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS feature_1_title VARCHAR(50) DEFAULT NULL COMMENT '优势1标题',
ADD COLUMN IF NOT EXISTS feature_1_desc VARCHAR(200) DEFAULT NULL COMMENT '优势1描述',
ADD COLUMN IF NOT EXISTS feature_1_icon TEXT DEFAULT NULL COMMENT '优势1图标',
ADD COLUMN IF NOT EXISTS feature_2_title VARCHAR(50) DEFAULT NULL COMMENT '优势2标题',
ADD COLUMN IF NOT EXISTS feature_2_desc VARCHAR(200) DEFAULT NULL COMMENT '优势2描述',
ADD COLUMN IF NOT EXISTS feature_2_icon TEXT DEFAULT NULL COMMENT '优势2图标',
ADD COLUMN IF NOT EXISTS feature_3_title VARCHAR(50) DEFAULT NULL COMMENT '优势3标题',
ADD COLUMN IF NOT EXISTS feature_3_desc VARCHAR(200) DEFAULT NULL COMMENT '优势3描述',
ADD COLUMN IF NOT EXISTS feature_3_icon TEXT DEFAULT NULL COMMENT '优势3图标';

-- 添加其他字段
ALTER TABLE site_settings 
ADD COLUMN IF NOT EXISTS site_name_en VARCHAR(100) DEFAULT NULL COMMENT '站点英文名称',
ADD COLUMN IF NOT EXISTS footer_description TEXT DEFAULT NULL COMMENT '页脚描述',
ADD COLUMN IF NOT EXISTS default_product_image TEXT DEFAULT NULL COMMENT '默认商品图片',
ADD COLUMN IF NOT EXISTS contact_qq VARCHAR(50) DEFAULT NULL COMMENT 'QQ号',
ADD COLUMN IF NOT EXISTS support_hours VARCHAR(100) DEFAULT NULL COMMENT '客服时间',
ADD COLUMN IF NOT EXISTS social_weibo VARCHAR(255) DEFAULT NULL COMMENT '微博链接',
ADD COLUMN IF NOT EXISTS social_douyin VARCHAR(255) DEFAULT NULL COMMENT '抖音链接',
ADD COLUMN IF NOT EXISTS social_xiaohongshu VARCHAR(255) DEFAULT NULL COMMENT '小红书链接',
ADD COLUMN IF NOT EXISTS social_bilibili VARCHAR(255) DEFAULT NULL COMMENT 'B站链接',
ADD COLUMN IF NOT EXISTS withdrawal_fee_percent DECIMAL(5,2) DEFAULT 0.00 COMMENT '提现手续费百分比',
ADD COLUMN IF NOT EXISTS withdrawal_min_fee DECIMAL(10,2) DEFAULT 0.00 COMMENT '最低手续费';

-- 验证关键字段
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'site_settings' 
AND COLUMN_NAME IN (
    'gateway_enabled', 
    'gateway_url', 
    'manual_qr_enabled', 
    'manual_qr_image',
    'feature_1_title',
    'feature_2_title',
    'feature_3_title'
)
ORDER BY COLUMN_NAME;

-- 完成提示
SELECT '✅ 支付设置字段添加完成！请重启后端服务。' AS status;
