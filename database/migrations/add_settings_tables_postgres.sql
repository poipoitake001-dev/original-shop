-- ========================================
-- 添加站点设置和信任徽章表 (PostgreSQL版本)
-- ========================================

-- ========================================
-- 站点设置表
-- ========================================
CREATE TABLE IF NOT EXISTS site_settings (
    id INT PRIMARY KEY DEFAULT 1,
    -- 基本信息
    site_name VARCHAR(100) DEFAULT '星际卡密商城',
    site_name_en VARCHAR(100) DEFAULT NULL,
    page_title VARCHAR(100) DEFAULT NULL,
    site_description VARCHAR(500) DEFAULT NULL,
    footer_text VARCHAR(200) DEFAULT NULL,
    footer_description TEXT DEFAULT NULL,
    
    -- 外观设置
    site_logo_url TEXT DEFAULT NULL,
    favicon_url TEXT DEFAULT NULL,
    theme_color VARCHAR(20) DEFAULT '#6366f1',
    bg_color VARCHAR(20) DEFAULT '#0f172a',
    default_product_image TEXT DEFAULT NULL,
    
    -- 核心优势徽章（3个）
    feature_1_title VARCHAR(50) DEFAULT NULL,
    feature_1_desc VARCHAR(200) DEFAULT NULL,
    feature_1_icon TEXT DEFAULT NULL,
    feature_2_title VARCHAR(50) DEFAULT NULL,
    feature_2_desc VARCHAR(200) DEFAULT NULL,
    feature_2_icon TEXT DEFAULT NULL,
    feature_3_title VARCHAR(50) DEFAULT NULL,
    feature_3_desc VARCHAR(200) DEFAULT NULL,
    feature_3_icon TEXT DEFAULT NULL,
    
    -- 联系方式
    contact_email VARCHAR(100) DEFAULT NULL,
    contact_phone VARCHAR(50) DEFAULT NULL,
    contact_wechat VARCHAR(50) DEFAULT NULL,
    contact_qq VARCHAR(50) DEFAULT NULL,
    contact_qr_url TEXT DEFAULT NULL,
    support_hours VARCHAR(100) DEFAULT NULL,
    
    -- 社交账号
    social_weibo VARCHAR(255) DEFAULT NULL,
    social_douyin VARCHAR(255) DEFAULT NULL,
    social_xiaohongshu VARCHAR(255) DEFAULT NULL,
    social_bilibili VARCHAR(255) DEFAULT NULL,
    social_links JSONB DEFAULT NULL,
    
    -- 支付设置
    gateway_enabled SMALLINT DEFAULT 0,
    gateway_url VARCHAR(255) DEFAULT NULL,
    gateway_merchant_id VARCHAR(100) DEFAULT NULL,
    gateway_merchant_key VARCHAR(255) DEFAULT NULL,
    gateway_notify_url VARCHAR(255) DEFAULT NULL,
    manual_qr_enabled SMALLINT DEFAULT 0,
    manual_qr_image TEXT DEFAULT NULL,
    manual_qr_description VARCHAR(500) DEFAULT NULL,
    
    -- 财务设置
    withdrawal_fee_percent DECIMAL(5, 2) DEFAULT 0.00,
    withdrawal_min_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认设置
INSERT INTO site_settings (id, site_name, page_title, site_description, footer_text) VALUES
(1, '星际卡密商城', '星际卡密商城 - 安全可靠的数字商品交易平台', '提供各类软件激活码、游戏点卡等数字商品', '© 2026 星际卡密商城')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 信任徽章表（用于前端展示核心优势）
-- ========================================
CREATE TABLE IF NOT EXISTS trust_badges (
    id SERIAL PRIMARY KEY,
    title VARCHAR(50) NOT NULL,
    description VARCHAR(200) DEFAULT NULL,
    icon_url TEXT DEFAULT NULL,
    sort_order INT DEFAULT 0,
    is_visible SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认徽章（对应前端三个方框）
INSERT INTO trust_badges (title, description, icon_url, sort_order, is_visible) VALUES
('本平台仅在线支付', '仅通过二手品或虚拟卡，不支持任何线下转账交易', NULL, 1, 1),
('诚信交易，真假自辨', '中途达成交易，提供完整的聊天记录，不干涉个人交易自由', NULL, 2, 1),
('触达校园与新专台', '不干涉校园生活与学习，非营业性质的校园广告平台', NULL, 3, 1)
ON CONFLICT DO NOTHING;

-- ========================================
-- 信息页面表（用于服务条款、隐私政策等）
-- ========================================
CREATE TABLE IF NOT EXISTS info_pages (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(100) NOT NULL,
    content TEXT DEFAULT NULL,
    is_published SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认页面
INSERT INTO info_pages (slug, title, content, is_published) VALUES
('terms', '服务条款', '# 服务条款

请在此编辑服务条款内容...', 1),
('privacy', '隐私政策', '# 隐私政策

请在此编辑隐私政策内容...', 1),
('about', '关于我们', '# 关于我们

请在此编辑关于我们的内容...', 1)
ON CONFLICT (slug) DO NOTHING;
