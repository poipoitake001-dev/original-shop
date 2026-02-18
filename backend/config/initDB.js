/**
 * ========================================
 * 数据库自动初始化模块
 * Auto Initialize Database Tables
 * ========================================
 * 
 * 支持：
 * - 多角色用户系统（USER / SELLER / ADMIN）
 * - 商品审核机制（卖家商品需管理员审核）
 * - 卖家钱包 & 交易流水
 * - 卖家入驻申请 & 提现申请
 * - 混合市场（虚拟卡密 + 实物商品）
 * - 信任/评价系统（互评 + 用户评分）
 */

const db = require('./db');

// ========== 建表 SQL ==========
const initSQL = `
-- 用户表（支持多角色：普通用户/卖家/管理员）
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(255) DEFAULT NULL,
    role ENUM('user', 'seller', 'admin') DEFAULT 'user',
    seller_status ENUM('none', 'pending', 'approved', 'rejected') DEFAULT 'none',
    commission_rate DECIMAL(5, 4) DEFAULT 0.0500,
    security_question VARCHAR(255) DEFAULT NULL,
    security_answer VARCHAR(255) DEFAULT NULL,
    payment_password_hash VARCHAR(255) DEFAULT NULL,
    nickname VARCHAR(50) DEFAULT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    sold_count INT NOT NULL DEFAULT 0,
    bought_count INT NOT NULL DEFAULT 0,
    dispute_count INT NOT NULL DEFAULT 0,
    good_review_count INT NOT NULL DEFAULT 0,
    badge_excellent_seller TINYINT(1) NOT NULL DEFAULT 0,
    badge_excellent_buyer TINYINT(1) NOT NULL DEFAULT 0,
    status TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 商品分类表
CREATE TABLE IF NOT EXISTS categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(30) NOT NULL UNIQUE,
    description VARCHAR(255) DEFAULT NULL,
    icon VARCHAR(50) DEFAULT '📦',
    image_url VARCHAR(500) DEFAULT NULL,
    sort_order INT DEFAULT 0,
    status TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 商品表（支持卖家商品 + 审核机制 + 自动/手动发货类型）
CREATE TABLE IF NOT EXISTS products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    seller_id INT DEFAULT NULL,
    delivery_type ENUM('auto', 'manual') DEFAULT 'auto',
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500) DEFAULT NULL,
    detail TEXT,
    icon VARCHAR(50) DEFAULT '⚡',
    image_url MEDIUMTEXT DEFAULT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT DEFAULT 0,
    specs JSON,
    sales INT DEFAULT 0,
    want_count INT NOT NULL DEFAULT 0,
    view_count INT NOT NULL DEFAULT 0,
    audit_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    audit_feedback VARCHAR(500) DEFAULT NULL,
    status TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_seller_id (seller_id),
    INDEX idx_audit_status (audit_status)
);

-- 订单表（支持卖家分账）
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_no VARCHAR(32) NOT NULL UNIQUE,
    user_id INT DEFAULT NULL,
    product_id INT NOT NULL,
    seller_id INT DEFAULT NULL,
    product_title VARCHAR(100) NOT NULL,
    spec VARCHAR(50) DEFAULT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    commission_amount DECIMAL(10, 2) DEFAULT 0.00,
    seller_amount DECIMAL(10, 2) DEFAULT 0.00,
    email VARCHAR(100) NOT NULL,
    status ENUM('pending', 'paid', 'delivered', 'completed', 'cancelled') DEFAULT 'pending',
    pay_time DATETIME DEFAULT NULL,
    deliver_time DATETIME DEFAULT NULL,
    card_keys TEXT,
    remark VARCHAR(500) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_seller_id (seller_id)
);

-- 卡密表
CREATE TABLE IF NOT EXISTS card_keys (
    id INT PRIMARY KEY AUTO_INCREMENT,
    product_id INT NOT NULL,
    card_key VARCHAR(500) NOT NULL,
    status TINYINT DEFAULT 0,
    order_id INT DEFAULT NULL,
    sold_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 系统设置表（单例模式）
CREATE TABLE IF NOT EXISTS site_settings (
    id INT PRIMARY KEY DEFAULT 1,
    site_name VARCHAR(100) DEFAULT '星际卡密商城',
    site_name_en VARCHAR(100) DEFAULT 'Interstellar Card Shop',
    page_title VARCHAR(200) DEFAULT NULL,
    favicon_url MEDIUMTEXT DEFAULT NULL,
    site_logo_url MEDIUMTEXT DEFAULT NULL,
    site_description VARCHAR(500) DEFAULT NULL,
    theme_color VARCHAR(20) DEFAULT '#6366f1',
    bg_color VARCHAR(20) DEFAULT '#0f172a',
    default_product_image MEDIUMTEXT DEFAULT NULL,
    contact_qr_url MEDIUMTEXT DEFAULT NULL,
    contact_wechat VARCHAR(100) DEFAULT NULL,
    contact_email VARCHAR(100) DEFAULT NULL,
    contact_phone VARCHAR(50) DEFAULT NULL,
    support_hours VARCHAR(100) DEFAULT '7 x 24 小时',
    footer_text VARCHAR(500) DEFAULT NULL,
    footer_description VARCHAR(500) DEFAULT NULL,
    social_links JSON DEFAULT NULL,
    withdrawal_fee_percent DECIMAL(5, 2) DEFAULT 5.00,
    withdrawal_min_fee DECIMAL(10, 2) DEFAULT 2.00,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('text', 'image', 'video') DEFAULT 'text',
    content VARCHAR(500) NOT NULL,
    media_url MEDIUMTEXT DEFAULT NULL,
    link VARCHAR(255) DEFAULT NULL,
    bg_color VARCHAR(20) DEFAULT '#6366f1',
    status TINYINT DEFAULT 1,
    sort_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 信息页面表（条款/隐私/帮助等）
CREATE TABLE IF NOT EXISTS info_pages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    slug VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    content MEDIUMTEXT,
    is_published TINYINT DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 信任徽章表（动态管理）
CREATE TABLE IF NOT EXISTS trust_badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    icon_url MEDIUMTEXT DEFAULT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    sort_order INT DEFAULT 0,
    is_visible TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 站内消息表
CREATE TABLE IF NOT EXISTS messages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    content TEXT NOT NULL,
    is_read TINYINT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_sender (sender_id),
    INDEX idx_receiver (receiver_id),
    INDEX idx_conversation (sender_id, receiver_id, created_at)
);

-- 支付配置表（单例模式）
CREATE TABLE IF NOT EXISTS payment_config (
    id INT PRIMARY KEY DEFAULT 1,
    system1_enabled TINYINT DEFAULT 0,
    system1_config JSON,
    system2_enabled TINYINT DEFAULT 0,
    system2_config JSON,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT payment_single_row CHECK (id = 1)
);

-- ========== 多商户市场 新增表 ==========

-- 钱包表（每个卖家一个钱包）
CREATE TABLE IF NOT EXISTS wallets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    balance DECIMAL(12, 2) DEFAULT 0.00,
    frozen_balance DECIMAL(12, 2) DEFAULT 0.00,
    total_earned DECIMAL(12, 2) DEFAULT 0.00,
    total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    order_id INT DEFAULT NULL,
    type ENUM('sale', 'commission', 'withdrawal', 'refund', 'adjustment') NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) DEFAULT 0.00,
    description VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_order_id (order_id),
    INDEX idx_type (type)
);

-- 提现申请表
CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    fee_amount DECIMAL(12, 2) DEFAULT 0.00,
    actual_amount DECIMAL(12, 2) DEFAULT 0.00,
    payment_method ENUM('alipay', 'wechat', 'bank') NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'rejected') DEFAULT 'pending',
    admin_note VARCHAR(500) DEFAULT NULL,
    processed_at DATETIME DEFAULT NULL,
    processed_by INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- 卖家入驻申请表
CREATE TABLE IF NOT EXISTS seller_applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    real_name VARCHAR(50) NOT NULL,
    id_card_number VARCHAR(30) DEFAULT NULL,
    contact_phone VARCHAR(20) DEFAULT NULL,
    contact_wechat VARCHAR(50) DEFAULT NULL,
    shop_name VARCHAR(100) DEFAULT NULL,
    shop_description VARCHAR(500) DEFAULT NULL,
    reason VARCHAR(500) DEFAULT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    admin_note VARCHAR(500) DEFAULT NULL,
    reviewed_at DATETIME DEFAULT NULL,
    reviewed_by INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);
`;

// ========== 种子数据 ==========
const seedSQL = `
-- 检查并插入分类
INSERT IGNORE INTO categories (id, name, slug, description, icon, sort_order) VALUES
(1, '软件激活码', 'software', '各类正版软件激活码', '⚡', 1),
(2, '游戏点卡', 'game', '游戏充值卡和会员', '🎮', 2);

-- 检查并插入商品（平台商品，seller_id = NULL）
INSERT IGNORE INTO products (id, category_id, title, description, icon, price, stock, audit_status) VALUES
(1, 1, 'Cursor月卡（质保一个月）', '正版 Cursor IDE 月度会员', '⚡', 600.00, 100, 'approved'),
(2, 1, 'Cursor月卡（无质保）', 'Cursor IDE 月度会员，无质保', '📊', 300.00, 100, 'approved'),
(3, 2, 'Steam 充值卡', '全球通用，即时到账', '🎮', 100.00, 500, 'approved'),
(4, 2, 'PlayStation Plus 会员', '畅玩海量游戏', '🏆', 268.00, 200, 'approved');

-- 检查并插入管理员 (密码: admin123)
INSERT IGNORE INTO users (id, username, email, password, role, seller_status) VALUES
(1, 'admin', 'admin@spacecard.com', '$2a$10$UwrDJmOgfBN/usY2SwetDOTli3pL2ec85Ojf4AWOitagCNPGbSnTO', 'admin', 'none');

-- 插入默认公告
INSERT IGNORE INTO announcements (id, content, link, bg_color, status, sort_order) VALUES
(1, '欢迎来到星际卡密商城！新用户首单立减 10 元', NULL, '#6366f1', 1, 1);

-- 插入默认系统设置
INSERT IGNORE INTO site_settings (id, site_name) VALUES (1, '星际卡密商城');
`;

/**
 * 初始化数据库表和数据
 */
async function initDatabase() {
    try {
        console.log('正在检查数据库表...');
        
        // 分割并执行建表语句
        const statements = initSQL.split(';').filter(s => s.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                await db.query(statement);
            }
        }
        console.log('✓ 数据库表检查完成（含多商户新表）');
        
        // ========== 迁移：兼容旧数据库升级 ==========
        
        // 修改 products 表的 image_url 字段为 MEDIUMTEXT
        try {
            await db.query('ALTER TABLE products MODIFY COLUMN image_url MEDIUMTEXT DEFAULT NULL');
        } catch (e) { /* 已是 MEDIUMTEXT */ }

        // 迁移：用户表 - 扩展 role 枚举 + 新增多商户字段
        const userMigrations = [
            // 扩展 role 枚举（user -> user/seller/admin）
            "ALTER TABLE users MODIFY COLUMN role ENUM('user', 'seller', 'admin') DEFAULT 'user'",
            // 新增卖家状态
            "ALTER TABLE users ADD COLUMN seller_status ENUM('none', 'pending', 'approved', 'rejected') DEFAULT 'none' AFTER role",
            // 新增佣金比例
            "ALTER TABLE users ADD COLUMN commission_rate DECIMAL(5, 4) DEFAULT 0.0500 AFTER seller_status",
            // 密保字段（已有的迁移）
            "ALTER TABLE users ADD COLUMN security_question VARCHAR(255) DEFAULT NULL AFTER commission_rate",
            "ALTER TABLE users ADD COLUMN security_answer VARCHAR(255) DEFAULT NULL AFTER security_question",
            "ALTER TABLE users ADD COLUMN payment_password_hash VARCHAR(255) DEFAULT NULL AFTER security_answer"
        ];
        for (const sql of userMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 用户表多商户字段已就绪');

        // 迁移：商品表 - 新增卖家 & 审核字段
        const productMigrations = [
            "ALTER TABLE products ADD COLUMN seller_id INT DEFAULT NULL AFTER category_id",
            "ALTER TABLE products ADD COLUMN audit_status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' AFTER sales",
            "ALTER TABLE products ADD COLUMN audit_feedback VARCHAR(500) DEFAULT NULL AFTER audit_status",
            "ALTER TABLE products ADD INDEX idx_seller_id (seller_id)",
            "ALTER TABLE products ADD INDEX idx_audit_status (audit_status)"
        ];
        for (const sql of productMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 商品表卖家/审核字段已就绪');

        // 迁移：商品发货类型字段
        try {
            await db.query("ALTER TABLE products ADD COLUMN delivery_type ENUM('auto', 'manual') DEFAULT 'auto' AFTER seller_id");
        } catch (e) { /* 忽略已存在 */ }
        console.log('✓ 商品发货类型字段已就绪');

        // 迁移：订单表 - 新增卖家分账字段
        const orderMigrations = [
            "ALTER TABLE orders ADD COLUMN seller_id INT DEFAULT NULL AFTER product_id",
            "ALTER TABLE orders ADD COLUMN commission_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER total_price",
            "ALTER TABLE orders ADD COLUMN seller_amount DECIMAL(10, 2) DEFAULT 0.00 AFTER commission_amount",
            "ALTER TABLE orders ADD INDEX idx_seller_id (seller_id)"
        ];
        for (const sql of orderMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 订单表分账字段已就绪');

        // 迁移：支付配置表
        try {
            await db.query(`
                INSERT IGNORE INTO payment_config (id, system1_enabled, system1_config, system2_enabled, system2_config)
                VALUES (1, 0, '{"apiUrl":"","pid":"","key":"","notifyUrl":""}', 0, '{"qrCodeImageUrl":"","instructionText":"请使用微信或支付宝扫描二维码完成支付"}')
            `);
        } catch (e) { /* 忽略错误 */ }
        
        const paymentConfigMigrations = [
            "ALTER TABLE payment_config MODIFY COLUMN system1_config LONGTEXT",
            "ALTER TABLE payment_config MODIFY COLUMN system2_config LONGTEXT"
        ];
        for (const sql of paymentConfigMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 支付配置字段已升级');
        
        // 迁移：提现手续费字段
        const withdrawalFeeMigrations = [
            "ALTER TABLE site_settings ADD COLUMN withdrawal_fee_percent DECIMAL(5, 2) DEFAULT 5.00 AFTER footer_text",
            "ALTER TABLE site_settings ADD COLUMN withdrawal_min_fee DECIMAL(10, 2) DEFAULT 2.00 AFTER withdrawal_fee_percent",
            "ALTER TABLE withdrawal_requests ADD COLUMN fee_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER amount",
            "ALTER TABLE withdrawal_requests ADD COLUMN actual_amount DECIMAL(12, 2) DEFAULT 0.00 AFTER fee_amount"
        ];
        for (const sql of withdrawalFeeMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 提现手续费字段已就绪');
        
        // 迁移：站点设置新增字段
        const siteSettingsMigrations = [
            "ALTER TABLE site_settings ADD COLUMN footer_description VARCHAR(500) DEFAULT NULL AFTER footer_text",
            "ALTER TABLE site_settings ADD COLUMN social_links JSON DEFAULT NULL AFTER footer_description"
        ];
        for (const sql of siteSettingsMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 站点设置扩展字段已就绪');
        
        // 迁移：站点品牌字段
        const brandMigrations = [
            "ALTER TABLE site_settings ADD COLUMN site_name_en VARCHAR(100) DEFAULT 'Interstellar Card Shop' AFTER site_name",
            "ALTER TABLE site_settings ADD COLUMN site_logo_url MEDIUMTEXT DEFAULT NULL AFTER site_name_en",
            "ALTER TABLE site_settings ADD COLUMN theme_color VARCHAR(20) DEFAULT '#6366f1' AFTER site_description",
            "ALTER TABLE site_settings ADD COLUMN default_product_image MEDIUMTEXT DEFAULT NULL AFTER theme_color",
            "ALTER TABLE site_settings ADD COLUMN support_hours VARCHAR(100) DEFAULT '7 x 24 小时' AFTER contact_phone"
        ];
        for (const sql of brandMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略 */ }
        }
        try { await db.query("ALTER TABLE site_settings ADD COLUMN bg_color VARCHAR(20) DEFAULT '#0f172a' AFTER theme_color"); } catch(e) {}
        try { await db.query("ALTER TABLE site_settings ADD COLUMN page_title VARCHAR(200) DEFAULT NULL AFTER site_name_en"); } catch(e) {}
        try { await db.query("ALTER TABLE site_settings ADD COLUMN favicon_url MEDIUMTEXT DEFAULT NULL AFTER page_title"); } catch(e) {}
        console.log('✓ 站点品牌字段已就绪');
        
        // 迁移：插入默认信任徽章
        const defaultBadges = [
            { title: '即时发货', description: '系统自动发送卡密', icon_url: null, sort_order: 1 },
            { title: '安全支付', description: '多种支付方式保障', icon_url: null, sort_order: 2 },
            { title: '售后保障', description: '完善的售后服务体系', icon_url: null, sort_order: 3 }
        ];
        for (const badge of defaultBadges) {
            try {
                await db.query(
                    'INSERT INTO trust_badges (title, description, icon_url, sort_order) SELECT ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM trust_badges WHERE title = ?)',
                    [badge.title, badge.description, badge.icon_url, badge.sort_order, badge.title]
                );
            } catch (e) { /* 忽略错误 */ }
        }
        console.log('✓ 信任徽章已初始化');
        
        // 迁移：默认信息页面
        const defaultPages = [
            { slug: 'terms', title: '服务条款', content: '欢迎使用星际卡密商城。使用本网站即表示您同意以下条款：\n\n1. 所有商品均为虚拟数字商品，一经售出概不退换。\n2. 请在购买前仔细阅读商品说明。\n3. 严禁将购买的卡密用于任何违法用途。\n4. 我们保留随时修改服务条款的权利。' },
            { slug: 'privacy', title: '隐私政策', content: '我们重视您的隐私。以下是我们的隐私政策：\n\n1. 我们仅收集提供服务所必需的信息（邮箱地址等）。\n2. 我们不会将您的个人信息出售给第三方。\n3. 卡密信息通过加密传输。\n4. 您可以随时联系我们删除您的账户数据。' },
            { slug: 'help', title: '帮助中心', content: '常见问题：\n\n**如何购买？**\n选择商品 → 输入邮箱 → 完成支付 → 卡密自动发送到邮箱\n\n**没有收到卡密？**\n请检查垃圾邮件文件夹，或使用订单号查询。\n\n**如何联系客服？**\n点击右下角的客服按钮，或发送邮件至客服邮箱。\n\n**支持哪些支付方式？**\n支持支付宝、微信支付等主流支付方式。' }
        ];
        for (const page of defaultPages) {
            try {
                await db.query(
                    'INSERT INTO info_pages (slug, title, content) SELECT ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM info_pages WHERE slug = ?)',
                    [page.slug, page.title, page.content, page.slug]
                );
            } catch (e) { /* 忽略 */ }
        }
        console.log('✓ 信息页面已初始化');
        
        // 迁移：分类表
        const categoryMigrations = [
            "ALTER TABLE categories CHANGE COLUMN code slug VARCHAR(30) NOT NULL UNIQUE",
            "ALTER TABLE categories ADD COLUMN description VARCHAR(255) DEFAULT NULL AFTER slug",
            "ALTER TABLE categories ADD COLUMN image_url VARCHAR(500) DEFAULT NULL AFTER icon",
            "ALTER TABLE categories ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
        ];
        for (const sql of categoryMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 分类表结构已更新');
        
        // 迁移：公告表
        const announcementMigrations = [
            "ALTER TABLE announcements ADD COLUMN type ENUM('text', 'image', 'video') DEFAULT 'text' AFTER id",
            "ALTER TABLE announcements ADD COLUMN media_url MEDIUMTEXT DEFAULT NULL AFTER content",
            "ALTER TABLE announcements MODIFY COLUMN media_url MEDIUMTEXT DEFAULT NULL"
        ];
        for (const sql of announcementMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 公告表结构已更新');

        // ========== 迁移：混合市场 + 信任/评价系统 ==========
        
        // 迁移：用户表 - 学生认证 & 信任评分字段
        const userTrustMigrations = [
            "ALTER TABLE users ADD COLUMN is_student_verified TINYINT(1) NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN can_skip_audit TINYINT(1) NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN rating FLOAT NOT NULL DEFAULT 5.0",
            "ALTER TABLE users ADD COLUMN review_count INT NOT NULL DEFAULT 0"
        ];
        for (const sql of userTrustMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 用户信任/评分字段已就绪');

        // 迁移：商品表 - 混合类型（虚拟/实物）
        try {
            await db.query("ALTER TABLE products ADD COLUMN type ENUM('VIRTUAL', 'PHYSICAL') NOT NULL DEFAULT 'VIRTUAL'");
        } catch (e) { /* 忽略已存在 */ }
        try {
            await db.query("ALTER TABLE products ADD INDEX idx_product_type (type)");
        } catch (e) { /* 忽略已存在 */ }
        console.log('✓ 商品混合类型字段已就绪');

        // 迁移：商品表 - 想要/浏览计数
        const productSocialMigrations = [
            "ALTER TABLE products ADD COLUMN want_count INT NOT NULL DEFAULT 0",
            "ALTER TABLE products ADD COLUMN view_count INT NOT NULL DEFAULT 0"
        ];
        for (const sql of productSocialMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }

        // 迁移：商品想要（收藏）关联表
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS product_wants (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    product_id INT NOT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY uq_user_product (user_id, product_id),
                    INDEX idx_product_id (product_id),
                    CONSTRAINT fk_want_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT fk_want_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        } catch (e) { /* 忽略已存在 */ }
        console.log('✓ 商品社交字段（想要/浏览）已就绪');

        // 迁移：评价表（互评系统）
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS reviews (
                    id INT NOT NULL AUTO_INCREMENT,
                    order_id INT NOT NULL,
                    reviewer_id INT NOT NULL,
                    target_user_id INT NOT NULL,
                    score INT NOT NULL COMMENT '评分 1-5',
                    comment VARCHAR(1000) DEFAULT NULL COMMENT '评价内容',
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    UNIQUE KEY uq_order_reviewer (order_id, reviewer_id),
                    INDEX idx_target_user_id (target_user_id),
                    CONSTRAINT fk_review_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
                    CONSTRAINT fk_review_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
                    CONSTRAINT fk_review_target FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        } catch (e) { /* 忽略已存在 */ }
        console.log('✓ 评价表（互评系统）已就绪');

        // 迁移：订单状态枚举 - 新增 awaiting_delivery（实物商品待发货状态）
        try {
            await db.query("ALTER TABLE orders MODIFY COLUMN status ENUM('pending', 'paid', 'awaiting_delivery', 'delivered', 'completed', 'cancelled') DEFAULT 'pending'");
        } catch (e) { /* 忽略已存在 */ }
        console.log('✓ 订单状态枚举已更新（含 awaiting_delivery）');

        // 迁移：用户表 - 个人资料 & 信誉统计 & 徽章字段
        const userProfileMigrations = [
            "ALTER TABLE users ADD COLUMN nickname VARCHAR(50) DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500) DEFAULT NULL",
            "ALTER TABLE users ADD COLUMN sold_count INT NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN bought_count INT NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN dispute_count INT NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN good_review_count INT NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN badge_excellent_seller TINYINT(1) NOT NULL DEFAULT 0",
            "ALTER TABLE users ADD COLUMN badge_excellent_buyer TINYINT(1) NOT NULL DEFAULT 0"
        ];
        for (const sql of userProfileMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 用户个人资料/信誉统计/徽章字段已就绪');

        // 迁移：用户表 - 校区、宿舍楼、班级、专业
        const userProfileExtMigrations = [
            "ALTER TABLE users ADD COLUMN campus VARCHAR(100) DEFAULT NULL COMMENT '校区'",
            "ALTER TABLE users ADD COLUMN dormitory VARCHAR(100) DEFAULT NULL COMMENT '宿舍楼'",
            "ALTER TABLE users ADD COLUMN class_name VARCHAR(100) DEFAULT NULL COMMENT '班级'",
            "ALTER TABLE users ADD COLUMN major VARCHAR(100) DEFAULT NULL COMMENT '专业'"
        ];
        for (const sql of userProfileExtMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 用户个人资料扩展（校区/宿舍楼/班级/专业）已就绪');

        // 迁移：学生认证申请表 - 新增 real_name, student_id_number 字段
        const studentVerifyMigrations = [
            "ALTER TABLE student_verifications ADD COLUMN real_name VARCHAR(50) DEFAULT NULL AFTER user_id",
            "ALTER TABLE student_verifications ADD COLUMN student_id_number VARCHAR(50) DEFAULT NULL AFTER real_name"
        ];
        for (const sql of studentVerifyMigrations) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在错误 */ }
        }
        console.log('✓ 学生认证表扩展字段已就绪');

        // 迁移：学生认证申请表
        try {
            await db.query(`
                CREATE TABLE IF NOT EXISTS student_verifications (
                    id INT NOT NULL AUTO_INCREMENT,
                    user_id INT NOT NULL,
                    real_name VARCHAR(50) DEFAULT NULL COMMENT '真实姓名',
                    student_id_number VARCHAR(50) DEFAULT NULL COMMENT '学号/身份证号',
                    id_photo_url MEDIUMTEXT NOT NULL COMMENT '学生证/身份证照片(Base64或URL)',
                    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                    admin_note VARCHAR(500) DEFAULT NULL,
                    reviewed_at DATETIME DEFAULT NULL,
                    reviewed_by INT DEFAULT NULL,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    PRIMARY KEY (id),
                    INDEX idx_user_id (user_id),
                    INDEX idx_status (status)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            `);
        } catch (e) { /* 忽略已存在 */ }
        console.log('✓ 学生认证申请表已就绪');
        
        // 执行种子数据
        const seedStatements = seedSQL.split(';').filter(s => s.trim());
        for (const statement of seedStatements) {
            if (statement.trim()) {
                try {
                    await db.query(statement);
                } catch (e) {
                    // 忽略重复插入错误
                }
            }
        }
        console.log('✓ 初始数据检查完成');
        
        console.log('========================================');
        console.log('  数据库初始化完成（混合市场 + 信任系统 + 信誉徽章）');
        console.log('  新增字段: users.nickname, users.avatar_url,');
        console.log('           users.sold_count, users.bought_count,');
        console.log('           users.dispute_count, users.good_review_count,');
        console.log('           users.badge_excellent_seller,');
        console.log('           users.badge_excellent_buyer');
        console.log('========================================');
        
        return true;
    } catch (error) {
        console.error('数据库初始化失败:', error.message);
        return false;
    }
}

module.exports = { initDatabase };
