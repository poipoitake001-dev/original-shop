-- ========================================
-- 添加站点设置和信任徽章表
-- ========================================

USE space_card_shop;

-- ========================================
-- 站点设置表
-- ========================================
CREATE TABLE IF NOT EXISTS site_settings (
    id INT PRIMARY KEY DEFAULT 1 COMMENT '设置ID（固定为1）',
    -- 基本信息
    site_name VARCHAR(100) DEFAULT '星际卡密商城' COMMENT '站点名称',
    site_name_en VARCHAR(100) DEFAULT NULL COMMENT '站点英文名称',
    page_title VARCHAR(100) DEFAULT NULL COMMENT '页面标题',
    site_description VARCHAR(500) DEFAULT NULL COMMENT '站点描述',
    footer_text VARCHAR(200) DEFAULT NULL COMMENT '页脚文字',
    footer_description TEXT DEFAULT NULL COMMENT '页脚描述',
    
    -- 外观设置
    site_logo_url TEXT DEFAULT NULL COMMENT '网站Logo（Base64或URL）',
    favicon_url TEXT DEFAULT NULL COMMENT 'Favicon图标（Base64或URL）',
    theme_color VARCHAR(20) DEFAULT '#6366f1' COMMENT '主题颜色',
    bg_color VARCHAR(20) DEFAULT '#0f172a' COMMENT '背景颜色',
    default_product_image TEXT DEFAULT NULL COMMENT '默认商品图片',
    
    -- 核心优势徽章（3个）
    feature_1_title VARCHAR(50) DEFAULT NULL COMMENT '优势1标题',
    feature_1_desc VARCHAR(200) DEFAULT NULL COMMENT '优势1描述',
    feature_1_icon TEXT DEFAULT NULL COMMENT '优势1图标（Base64或URL）',
    feature_2_title VARCHAR(50) DEFAULT NULL COMMENT '优势2标题',
    feature_2_desc VARCHAR(200) DEFAULT NULL COMMENT '优势2描述',
    feature_2_icon TEXT DEFAULT NULL COMMENT '优势2图标（Base64或URL）',
    feature_3_title VARCHAR(50) DEFAULT NULL COMMENT '优势3标题',
    feature_3_desc VARCHAR(200) DEFAULT NULL COMMENT '优势3描述',
    feature_3_icon TEXT DEFAULT NULL COMMENT '优势3图标（Base64或URL）',
    
    -- 联系方式
    contact_email VARCHAR(100) DEFAULT NULL COMMENT '联系邮箱',
    contact_phone VARCHAR(50) DEFAULT NULL COMMENT '联系电话',
    contact_wechat VARCHAR(50) DEFAULT NULL COMMENT '微信号',
    contact_qq VARCHAR(50) DEFAULT NULL COMMENT 'QQ号',
    contact_qr_url TEXT DEFAULT NULL COMMENT '客服二维码（Base64或URL）',
    support_hours VARCHAR(100) DEFAULT NULL COMMENT '客服时间',
    
    -- 社交账号
    social_weibo VARCHAR(255) DEFAULT NULL COMMENT '微博链接',
    social_douyin VARCHAR(255) DEFAULT NULL COMMENT '抖音链接',
    social_xiaohongshu VARCHAR(255) DEFAULT NULL COMMENT '小红书链接',
    social_bilibili VARCHAR(255) DEFAULT NULL COMMENT 'B站链接',
    social_links JSON DEFAULT NULL COMMENT '其他社交链接（JSON格式）',
    
    -- 支付设置
    gateway_enabled TINYINT DEFAULT 0 COMMENT 'API网关支付开关：1-启用 0-禁用',
    gateway_url VARCHAR(255) DEFAULT NULL COMMENT 'API网关地址',
    gateway_merchant_id VARCHAR(100) DEFAULT NULL COMMENT '商户ID',
    gateway_merchant_key VARCHAR(255) DEFAULT NULL COMMENT '商户密钥',
    gateway_notify_url VARCHAR(255) DEFAULT NULL COMMENT '异步通知地址',
    manual_qr_enabled TINYINT DEFAULT 0 COMMENT '手动二维码支付开关：1-启用 0-禁用',
    manual_qr_image TEXT DEFAULT NULL COMMENT '收款二维码（Base64或URL）',
    manual_qr_description VARCHAR(500) DEFAULT NULL COMMENT '支付说明',
    
    -- 财务设置
    withdrawal_fee_percent DECIMAL(5, 2) DEFAULT 0.00 COMMENT '提现手续费百分比',
    withdrawal_min_fee DECIMAL(10, 2) DEFAULT 0.00 COMMENT '最低手续费',
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB COMMENT='站点设置表';

-- 插入默认设置
INSERT INTO site_settings (id, site_name, page_title, site_description, footer_text) VALUES
(1, '星际卡密商城', '星际卡密商城 - 安全可靠的数字商品交易平台', '提供各类软件激活码、游戏点卡等数字商品', '© 2026 星际卡密商城')
ON DUPLICATE KEY UPDATE id=id;

-- ========================================
-- 信任徽章表（用于前端展示核心优势）
-- ========================================
CREATE TABLE IF NOT EXISTS trust_badges (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '徽章ID',
    title VARCHAR(50) NOT NULL COMMENT '标题',
    description VARCHAR(200) DEFAULT NULL COMMENT '描述',
    icon_url TEXT DEFAULT NULL COMMENT '图标URL或Base64',
    sort_order INT DEFAULT 0 COMMENT '排序',
    is_visible TINYINT DEFAULT 1 COMMENT '是否显示：1-显示 0-隐藏',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB COMMENT='信任徽章表';

-- 插入默认徽章（对应前端三个方框）
INSERT INTO trust_badges (title, description, icon_url, sort_order, is_visible) VALUES
('本平台仅在线支付', '仅通过二手品或虚拟卡，不支持任何线下转账交易', NULL, 1, 1),
('诚信交易，真假自辨', '中途达成交易，提供完整的聊天记录，不干涉个人交易自由', NULL, 2, 1),
('触达校园与新专台', '不干涉校园生活与学习，非营业性质的校园广告平台', NULL, 3, 1)
ON DUPLICATE KEY UPDATE id=id;

-- ========================================
-- 信息页面表（用于服务条款、隐私政策等）
-- ========================================
CREATE TABLE IF NOT EXISTS info_pages (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '页面ID',
    slug VARCHAR(50) NOT NULL UNIQUE COMMENT '页面标识（URL路径）',
    title VARCHAR(100) NOT NULL COMMENT '页面标题',
    content TEXT DEFAULT NULL COMMENT '页面内容（Markdown或HTML）',
    is_published TINYINT DEFAULT 1 COMMENT '是否发布：1-发布 0-草稿',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB COMMENT='信息页面表';

-- 插入默认页面
INSERT INTO info_pages (slug, title, content, is_published) VALUES
('terms', '服务条款', '# 服务条款\n\n请在此编辑服务条款内容...', 1),
('privacy', '隐私政策', '# 隐私政策\n\n请在此编辑隐私政策内容...', 1),
('about', '关于我们', '# 关于我们\n\n请在此编辑关于我们的内容...', 1)
ON DUPLICATE KEY UPDATE slug=slug;

-- ========================================
-- 查看创建结果
-- ========================================
SELECT '========================================' AS '';
SELECT '站点设置表创建完成！' AS message;
SELECT '========================================' AS '';
SELECT CONCAT('站点设置: ', COUNT(*), ' 条') AS info FROM site_settings;
SELECT CONCAT('信任徽章: ', COUNT(*), ' 条') AS info FROM trust_badges;
SELECT CONCAT('信息页面: ', COUNT(*), ' 条') AS info FROM info_pages;
SELECT '========================================' AS '';
