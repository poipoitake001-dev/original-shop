-- ========================================
-- 太空主题电商发卡网 - 数据库初始化脚本
-- Space Card Shop - Database Init SQL
-- ========================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS space_card_shop 
    DEFAULT CHARACTER SET utf8mb4 
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE space_card_shop;

-- ========================================
-- 删除已存在的表（按外键依赖顺序）
-- ========================================
DROP TABLE IF EXISTS card_keys;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;

-- ========================================
-- 用户表
-- ========================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '用户ID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
    password VARCHAR(255) NOT NULL COMMENT '密码（加密存储）',
    avatar VARCHAR(255) DEFAULT NULL COMMENT '头像URL',
    role ENUM('user', 'admin') DEFAULT 'user' COMMENT '用户角色',
    status TINYINT DEFAULT 1 COMMENT '状态：1-正常 0-禁用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB COMMENT='用户表';

-- ========================================
-- 商品分类表
-- ========================================
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '分类ID',
    name VARCHAR(50) NOT NULL COMMENT '分类名称',
    code VARCHAR(30) NOT NULL UNIQUE COMMENT '分类编码',
    icon VARCHAR(50) DEFAULT '📦' COMMENT '分类图标',
    sort_order INT DEFAULT 0 COMMENT '排序',
    status TINYINT DEFAULT 1 COMMENT '状态：1-启用 0-禁用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB COMMENT='商品分类表';

-- ========================================
-- 商品表
-- ========================================
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '商品ID',
    category_id INT NOT NULL COMMENT '分类ID',
    title VARCHAR(100) NOT NULL COMMENT '商品标题',
    description VARCHAR(500) DEFAULT NULL COMMENT '简短描述',
    detail TEXT COMMENT '详细描述',
    icon VARCHAR(50) DEFAULT '⚡' COMMENT '商品图标（emoji）',
    image_url VARCHAR(255) DEFAULT NULL COMMENT '商品图片URL',
    price DECIMAL(10, 2) NOT NULL COMMENT '单价',
    stock INT DEFAULT 0 COMMENT '库存数量',
    specs JSON COMMENT '规格选项，JSON数组格式',
    sales INT DEFAULT 0 COMMENT '销量',
    status TINYINT DEFAULT 1 COMMENT '状态：1-上架 0-下架',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='商品表';

-- ========================================
-- 订单表
-- ========================================
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '订单ID',
    order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单编号',
    user_id INT DEFAULT NULL COMMENT '用户ID（可为空，支持游客购买）',
    product_id INT NOT NULL COMMENT '商品ID',
    product_title VARCHAR(100) NOT NULL COMMENT '商品标题（冗余存储）',
    spec VARCHAR(50) DEFAULT NULL COMMENT '购买规格',
    quantity INT NOT NULL DEFAULT 1 COMMENT '购买数量',
    unit_price DECIMAL(10, 2) NOT NULL COMMENT '单价',
    total_price DECIMAL(10, 2) NOT NULL COMMENT '总价',
    email VARCHAR(100) NOT NULL COMMENT '接收邮箱',
    status ENUM('pending', 'paid', 'delivered', 'completed', 'cancelled') DEFAULT 'pending' COMMENT '订单状态',
    pay_time DATETIME DEFAULT NULL COMMENT '支付时间',
    deliver_time DATETIME DEFAULT NULL COMMENT '发货时间',
    card_keys TEXT COMMENT '卡密信息（JSON格式）',
    remark VARCHAR(500) DEFAULT NULL COMMENT '备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_order_no (order_no),
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_email (email),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='订单表';

-- ========================================
-- 卡密库存表
-- ========================================
CREATE TABLE card_keys (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '卡密ID',
    product_id INT NOT NULL COMMENT '商品ID',
    card_key VARCHAR(500) NOT NULL COMMENT '卡密内容',
    status TINYINT DEFAULT 0 COMMENT '状态：0-未售出 1-已售出',
    order_id INT DEFAULT NULL COMMENT '关联订单ID',
    sold_at DATETIME DEFAULT NULL COMMENT '售出时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    INDEX idx_product (product_id),
    INDEX idx_status (status),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='卡密库存表';

-- ========================================
-- 初始化分类数据
-- ========================================
INSERT INTO categories (name, code, icon, sort_order) VALUES
('软件激活码', 'software', '⚡', 1),
('游戏点卡', 'game', '🎮', 2);

-- ========================================
-- 初始化商品数据
-- ========================================
INSERT INTO products (category_id, title, description, detail, icon, price, stock, specs) VALUES
-- 软件激活码类
(1, 'Windows 11 专业版', '正版永久激活码，支持在线激活', 
 '微软官方正版授权，永久有效。支持重装系统后重新激活，提供售后技术支持。', 
 '⚡', 128.00, 999, '["家庭版", "专业版", "企业版"]'),
 
(1, 'Office 365 家庭版', '包含Word、Excel、PPT等全套办公软件', 
 '包含 Word、Excel、PowerPoint、Outlook 等全套办公软件，支持5台设备同时使用。', 
 '📊', 298.00, 567, '["个人版", "家庭版", "商业版"]'),
 
(1, 'Adobe CC 全家桶', 'Photoshop、Premiere等创意软件套装', 
 '包含 Photoshop、Illustrator、Premiere Pro、After Effects 等 20+ 创意应用程序。', 
 '🎨', 599.00, 234, '["单APP订阅", "摄影计划", "全家桶"]'),
 
(1, '1Password 密码管理器', '安全存储所有密码，跨设备同步', 
 '军事级加密保护，支持自动填充密码，跨平台同步，保护您的数字生活安全。', 
 '🔐', 168.00, 432, '["个人版", "家庭版", "团队版"]'),

-- 游戏点卡类
(2, 'Steam 充值卡', '全球通用，即时到账', 
 'Steam 平台官方充值卡，支持全球区服，购买游戏、DLC、创意工坊物品等。', 
 '🎮', 100.00, 1888, '["50元", "100元", "200元", "500元"]'),
 
(2, 'PlayStation Plus 会员', '畅玩海量游戏，每月免费游戏', 
 'PS Plus 会员资格，享受在线多人游戏、每月免费游戏、独家折扣等特权。', 
 '🏆', 268.00, 756, '["1个月", "3个月", "12个月"]'),
 
(2, 'Xbox Game Pass', '超100款游戏随心玩', 
 '访问超过100款高质量游戏，包括首发新作，支持云游戏和 EA Play。', 
 '🎯', 78.00, 543, '["PC版", "主机版", "终极版"]'),
 
(2, 'Nintendo eShop 点卡', '任天堂商店充值卡', 
 '任天堂 eShop 官方充值卡，可购买 Switch 游戏、DLC、会员等数字内容。', 
 '⭐', 150.00, 321, '["日区", "美区", "港区", "欧区"]');

-- ========================================
-- 创建管理员账户
-- 密码: admin123 (使用bcrypt加密)
-- 这个hash是使用bcryptjs生成的，cost factor = 10
-- ========================================
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@spacecard.com', '$2a$10$UwrDJmOgfBN/usY2SwetDOTli3pL2ec85Ojf4AWOitagCNPGbSnTO', 'admin');

-- ========================================
-- 查看创建结果
-- ========================================
SELECT '========================================' AS '';
SELECT '数据库初始化完成！' AS message;
SELECT '========================================' AS '';
SELECT CONCAT('分类数量: ', COUNT(*)) AS info FROM categories;
SELECT CONCAT('商品数量: ', COUNT(*)) AS info FROM products;
SELECT CONCAT('用户数量: ', COUNT(*)) AS info FROM users;
SELECT '========================================' AS '';
SELECT '管理员账号: admin' AS info;
SELECT '管理员密码: admin123' AS info;
SELECT '========================================' AS '';
