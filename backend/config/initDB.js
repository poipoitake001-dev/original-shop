/**
 * ========================================
 * 数据库自动初始化模块 (PostgreSQL 版本)
 * Auto Initialize Database Tables
 * ========================================
 */

const db = require('./db');

/**
 * 初始化数据库表和数据
 */
async function initDatabase() {
    try {
        console.log('正在检查数据库表 (PostgreSQL)...');
        
        // ========== 创建表 ==========
        
        // 用户表
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                avatar VARCHAR(255) DEFAULT NULL,
                role VARCHAR(20) DEFAULT 'user',
                seller_status VARCHAR(20) DEFAULT 'none',
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
                badge_excellent_seller SMALLINT NOT NULL DEFAULT 0,
                badge_excellent_buyer SMALLINT NOT NULL DEFAULT 0,
                is_student_verified SMALLINT NOT NULL DEFAULT 0,
                can_skip_audit SMALLINT NOT NULL DEFAULT 0,
                rating FLOAT NOT NULL DEFAULT 5.0,
                review_count INT NOT NULL DEFAULT 0,
                campus VARCHAR(100) DEFAULT NULL,
                dormitory VARCHAR(100) DEFAULT NULL,
                class_name VARCHAR(100) DEFAULT NULL,
                major VARCHAR(100) DEFAULT NULL,
                status SMALLINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ users 表已就绪');

        // 商品分类表
        await db.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                slug VARCHAR(30) NOT NULL UNIQUE,
                description VARCHAR(255) DEFAULT NULL,
                icon VARCHAR(50) DEFAULT '📦',
                image_url VARCHAR(500) DEFAULT NULL,
                sort_order INT DEFAULT 0,
                status SMALLINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✓ categories 表已就绪');

        // 商品表
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                category_id INT NOT NULL,
                seller_id INT DEFAULT NULL,
                delivery_type VARCHAR(20) DEFAULT 'auto',
                type VARCHAR(20) NOT NULL DEFAULT 'VIRTUAL',
                title VARCHAR(100) NOT NULL,
                description VARCHAR(500) DEFAULT NULL,
                detail TEXT,
                icon VARCHAR(50) DEFAULT '⚡',
                image_url TEXT DEFAULT NULL,
                price DECIMAL(10, 2) NOT NULL,
                stock INT DEFAULT 0,
                specs JSONB,
                sales INT DEFAULT 0,
                want_count INT NOT NULL DEFAULT 0,
                view_count INT NOT NULL DEFAULT 0,
                audit_status VARCHAR(20) DEFAULT 'approved',
                audit_feedback VARCHAR(500) DEFAULT NULL,
                status SMALLINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ products 表已就绪');

        // 订单表
        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                id SERIAL PRIMARY KEY,
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
                status VARCHAR(30) DEFAULT 'pending',
                pay_time TIMESTAMP DEFAULT NULL,
                deliver_time TIMESTAMP DEFAULT NULL,
                card_keys TEXT,
                remark VARCHAR(500) DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ orders 表已就绪');

        // 卡密表
        await db.query(`
            CREATE TABLE IF NOT EXISTS card_keys (
                id SERIAL PRIMARY KEY,
                product_id INT NOT NULL,
                card_key VARCHAR(500) NOT NULL,
                status SMALLINT DEFAULT 0,
                order_id INT DEFAULT NULL,
                sold_at TIMESTAMP DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ card_keys 表已就绪');

        // 系统设置表
        await db.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                id INT PRIMARY KEY DEFAULT 1,
                site_name VARCHAR(100) DEFAULT '星际卡密商城',
                site_name_en VARCHAR(100) DEFAULT 'Interstellar Card Shop',
                page_title VARCHAR(200) DEFAULT NULL,
                favicon_url TEXT DEFAULT NULL,
                site_logo_url TEXT DEFAULT NULL,
                site_description VARCHAR(500) DEFAULT NULL,
                theme_color VARCHAR(20) DEFAULT '#6366f1',
                bg_color VARCHAR(20) DEFAULT '#0f172a',
                default_product_image TEXT DEFAULT NULL,
                contact_qr_url TEXT DEFAULT NULL,
                contact_wechat VARCHAR(100) DEFAULT NULL,
                contact_email VARCHAR(100) DEFAULT NULL,
                contact_phone VARCHAR(50) DEFAULT NULL,
                support_hours VARCHAR(100) DEFAULT '7 x 24 小时',
                footer_text VARCHAR(500) DEFAULT NULL,
                footer_description VARCHAR(500) DEFAULT NULL,
                social_links JSONB DEFAULT NULL,
                withdrawal_fee_percent DECIMAL(5, 2) DEFAULT 5.00,
                withdrawal_min_fee DECIMAL(10, 2) DEFAULT 2.00,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT single_row CHECK (id = 1)
            )
        `);
        console.log('✓ site_settings 表已就绪');

        // 公告表
        await db.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                type VARCHAR(20) DEFAULT 'text',
                content VARCHAR(500) NOT NULL,
                media_url TEXT DEFAULT NULL,
                link VARCHAR(255) DEFAULT NULL,
                bg_color VARCHAR(20) DEFAULT '#6366f1',
                status SMALLINT DEFAULT 1,
                sort_order INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ announcements 表已就绪');

        // 信息页面表
        await db.query(`
            CREATE TABLE IF NOT EXISTS info_pages (
                id SERIAL PRIMARY KEY,
                slug VARCHAR(50) NOT NULL UNIQUE,
                title VARCHAR(200) NOT NULL,
                content TEXT,
                is_published SMALLINT DEFAULT 1,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ info_pages 表已就绪');

        // 信任徽章表
        await db.query(`
            CREATE TABLE IF NOT EXISTS trust_badges (
                id SERIAL PRIMARY KEY,
                icon_url TEXT DEFAULT NULL,
                title VARCHAR(100) NOT NULL,
                description VARCHAR(255) DEFAULT NULL,
                sort_order INT DEFAULT 0,
                is_visible SMALLINT DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ trust_badges 表已就绪');

        // 站内消息表
        await db.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id SERIAL PRIMARY KEY,
                sender_id INT NOT NULL,
                receiver_id INT NOT NULL,
                content TEXT NOT NULL,
                is_read SMALLINT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ messages 表已就绪');

        // 支付配置表
        await db.query(`
            CREATE TABLE IF NOT EXISTS payment_config (
                id INT PRIMARY KEY DEFAULT 1,
                system1_enabled SMALLINT DEFAULT 0,
                system1_config JSONB,
                system2_enabled SMALLINT DEFAULT 0,
                system2_config JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT payment_single_row CHECK (id = 1)
            )
        `);
        console.log('✓ payment_config 表已就绪');

        // 钱包表
        await db.query(`
            CREATE TABLE IF NOT EXISTS wallets (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL UNIQUE,
                balance DECIMAL(12, 2) DEFAULT 0.00,
                frozen_balance DECIMAL(12, 2) DEFAULT 0.00,
                total_earned DECIMAL(12, 2) DEFAULT 0.00,
                total_withdrawn DECIMAL(12, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ wallets 表已就绪');

        // 交易记录表
        await db.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                order_id INT DEFAULT NULL,
                type VARCHAR(30) NOT NULL,
                amount DECIMAL(12, 2) NOT NULL,
                balance_after DECIMAL(12, 2) DEFAULT 0.00,
                description VARCHAR(500) DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'completed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ transactions 表已就绪');

        // 提现申请表
        await db.query(`
            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(12, 2) NOT NULL,
                fee_amount DECIMAL(12, 2) DEFAULT 0.00,
                actual_amount DECIMAL(12, 2) DEFAULT 0.00,
                payment_method VARCHAR(20) NOT NULL,
                account_name VARCHAR(100) NOT NULL,
                account_number VARCHAR(100) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                admin_note VARCHAR(500) DEFAULT NULL,
                processed_at TIMESTAMP DEFAULT NULL,
                processed_by INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ withdrawal_requests 表已就绪');

        // 卖家入驻申请表
        await db.query(`
            CREATE TABLE IF NOT EXISTS seller_applications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                real_name VARCHAR(50) NOT NULL,
                id_card_number VARCHAR(30) DEFAULT NULL,
                contact_phone VARCHAR(20) DEFAULT NULL,
                contact_wechat VARCHAR(50) DEFAULT NULL,
                shop_name VARCHAR(100) DEFAULT NULL,
                shop_description VARCHAR(500) DEFAULT NULL,
                reason VARCHAR(500) DEFAULT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                admin_note VARCHAR(500) DEFAULT NULL,
                reviewed_at TIMESTAMP DEFAULT NULL,
                reviewed_by INT DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ seller_applications 表已就绪');

        // 商品想要表
        await db.query(`
            CREATE TABLE IF NOT EXISTS product_wants (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (user_id, product_id)
            )
        `);
        console.log('✓ product_wants 表已就绪');

        // 评价表
        await db.query(`
            CREATE TABLE IF NOT EXISTS reviews (
                id SERIAL PRIMARY KEY,
                order_id INT NOT NULL,
                reviewer_id INT NOT NULL,
                target_user_id INT NOT NULL,
                score INT NOT NULL,
                comment VARCHAR(1000) DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE (order_id, reviewer_id)
            )
        `);
        console.log('✓ reviews 表已就绪');

        // 学生认证申请表
        await db.query(`
            CREATE TABLE IF NOT EXISTS student_verifications (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                real_name VARCHAR(50) DEFAULT NULL,
                student_id_number VARCHAR(50) DEFAULT NULL,
                id_photo_url TEXT NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                admin_note VARCHAR(500) DEFAULT NULL,
                reviewed_at TIMESTAMP DEFAULT NULL,
                reviewed_by INT DEFAULT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✓ student_verifications 表已就绪');

        // ========== 修复列默认值（兼容已存在的表）==========
        const alterDefaults = [
            "ALTER TABLE categories ALTER COLUMN updated_at SET DEFAULT NOW()",
            "ALTER TABLE categories ALTER COLUMN created_at SET DEFAULT NOW()",
            "ALTER TABLE products ALTER COLUMN updated_at SET DEFAULT NOW()",
            "ALTER TABLE products ALTER COLUMN created_at SET DEFAULT NOW()",
            "ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW()",
            "ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW()",
            "ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT NOW()",
            "ALTER TABLE orders ALTER COLUMN created_at SET DEFAULT NOW()",
            "ALTER TABLE announcements ALTER COLUMN updated_at SET DEFAULT NOW()",
            "ALTER TABLE announcements ALTER COLUMN created_at SET DEFAULT NOW()"
        ];
        for (const sql of alterDefaults) {
            try { await db.query(sql); } catch (e) { /* 忽略错误 */ }
        }
        console.log('✓ 列默认值已修复');

        // ========== 创建索引 ==========
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id)',
            'CREATE INDEX IF NOT EXISTS idx_products_audit_status ON products(audit_status)',
            'CREATE INDEX IF NOT EXISTS idx_products_type ON products(type)',
            'CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id)',
            'CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)',
            'CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)',
            'CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id)',
            'CREATE INDEX IF NOT EXISTS idx_withdrawal_user_id ON withdrawal_requests(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status)',
            'CREATE INDEX IF NOT EXISTS idx_seller_app_user_id ON seller_applications(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_seller_app_status ON seller_applications(status)',
            'CREATE INDEX IF NOT EXISTS idx_product_wants_product ON product_wants(product_id)',
            'CREATE INDEX IF NOT EXISTS idx_reviews_target ON reviews(target_user_id)',
            'CREATE INDEX IF NOT EXISTS idx_student_verify_user ON student_verifications(user_id)',
            'CREATE INDEX IF NOT EXISTS idx_student_verify_status ON student_verifications(status)',
            'CREATE INDEX IF NOT EXISTS idx_card_keys_product ON card_keys(product_id)',
            'CREATE INDEX IF NOT EXISTS idx_card_keys_status ON card_keys(status)'
        ];
        for (const sql of indexes) {
            try { await db.query(sql); } catch (e) { /* 忽略已存在 */ }
        }
        console.log('✓ 索引已创建');

        // ========== 插入种子数据（使用 try-catch 忽略重复错误）==========
        
        // 插入默认分类
        try {
            await db.query(`
                INSERT INTO categories (name, slug, description, icon, sort_order)
                VALUES ('软件激活码', 'software', '各类正版软件激活码', '⚡', 1)
                ON CONFLICT (slug) DO NOTHING
            `);
            await db.query(`
                INSERT INTO categories (name, slug, description, icon, sort_order)
                VALUES ('游戏点卡', 'game', '游戏充值卡和会员', '🎮', 2)
                ON CONFLICT (slug) DO NOTHING
            `);
            console.log('✓ 默认分类已插入');
        } catch (e) { console.log('分类已存在，跳过'); }

        // 获取分类ID用于插入商品
        let softwareCatId = 1, gameCatId = 2;
        try {
            const cats = await db.query(`SELECT id, slug FROM categories WHERE slug IN ('software', 'game')`);
            for (const cat of cats) {
                if (cat.slug === 'software') softwareCatId = cat.id;
                if (cat.slug === 'game') gameCatId = cat.id;
            }
        } catch (e) { /* 使用默认值 */ }

        // 插入默认商品
        try {
            const productExists = await db.query(`SELECT COUNT(*) as cnt FROM products`);
            if (parseInt(productExists[0]?.cnt || 0) === 0) {
                await db.query(`
                    INSERT INTO products (category_id, title, description, icon, price, stock, audit_status)
                    VALUES ($1, 'Cursor月卡（质保一个月）', '正版 Cursor IDE 月度会员', '⚡', 600.00, 100, 'approved')
                `, [softwareCatId]);
                await db.query(`
                    INSERT INTO products (category_id, title, description, icon, price, stock, audit_status)
                    VALUES ($1, 'Cursor月卡（无质保）', 'Cursor IDE 月度会员，无质保', '📊', 300.00, 100, 'approved')
                `, [softwareCatId]);
                await db.query(`
                    INSERT INTO products (category_id, title, description, icon, price, stock, audit_status)
                    VALUES ($1, 'Steam 充值卡', '全球通用，即时到账', '🎮', 100.00, 500, 'approved')
                `, [gameCatId]);
                await db.query(`
                    INSERT INTO products (category_id, title, description, icon, price, stock, audit_status)
                    VALUES ($1, 'PlayStation Plus 会员', '畅玩海量游戏', '🏆', 268.00, 200, 'approved')
                `, [gameCatId]);
                console.log('✓ 默认商品已插入');
            } else {
                console.log('✓ 商品已存在，跳过');
            }
        } catch (e) { console.log('商品插入跳过:', e.message); }

        // 插入管理员 (密码: admin123)
        try {
            const adminExists = await db.query(`SELECT id FROM users WHERE username = 'admin' OR email = 'admin@spacecard.com'`);
            if (adminExists.length === 0) {
                await db.query(`
                    INSERT INTO users (username, email, password, role, seller_status)
                    VALUES ('admin', 'admin@spacecard.com', '$2a$10$UwrDJmOgfBN/usY2SwetDOTli3pL2ec85Ojf4AWOitagCNPGbSnTO', 'admin', 'none')
                `);
                console.log('✓ 管理员账户已创建');
            } else {
                console.log('✓ 管理员已存在，跳过');
            }
        } catch (e) { console.log('管理员创建跳过:', e.message); }

        // 插入默认公告
        try {
            const annExists = await db.query(`SELECT COUNT(*) as cnt FROM announcements`);
            if (parseInt(annExists[0]?.cnt || 0) === 0) {
                await db.query(`
                    INSERT INTO announcements (content, link, bg_color, status, sort_order)
                    VALUES ('欢迎来到星际卡密商城！新用户首单立减 10 元', NULL, '#6366f1', 1, 1)
                `);
                console.log('✓ 默认公告已插入');
            } else {
                console.log('✓ 公告已存在，跳过');
            }
        } catch (e) { console.log('公告插入跳过:', e.message); }

        // 插入默认系统设置
        try {
            await db.query(`
                INSERT INTO site_settings (id, site_name)
                VALUES (1, '星际卡密商城')
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ 默认系统设置已插入');
        } catch (e) { console.log('系统设置跳过:', e.message); }

        // 插入默认支付配置
        try {
            await db.query(`
                INSERT INTO payment_config (id, system1_enabled, system1_config, system2_enabled, system2_config)
                VALUES (1, 0, '{"apiUrl":"","pid":"","key":"","notifyUrl":""}', 0, '{"qrCodeImageUrl":"","instructionText":"请使用微信或支付宝扫描二维码完成支付"}')
                ON CONFLICT (id) DO NOTHING
            `);
            console.log('✓ 默认支付配置已插入');
        } catch (e) { console.log('支付配置跳过:', e.message); }

        // 插入默认信任徽章
        try {
            const badgeExists = await db.query(`SELECT COUNT(*) as cnt FROM trust_badges`);
            if (parseInt(badgeExists[0]?.cnt || 0) === 0) {
                await db.query(`INSERT INTO trust_badges (title, description, sort_order) VALUES ('即时发货', '系统自动发送卡密', 1)`);
                await db.query(`INSERT INTO trust_badges (title, description, sort_order) VALUES ('安全支付', '多种支付方式保障', 2)`);
                await db.query(`INSERT INTO trust_badges (title, description, sort_order) VALUES ('售后保障', '完善的售后服务体系', 3)`);
                console.log('✓ 信任徽章已初始化');
            } else {
                console.log('✓ 信任徽章已存在，跳过');
            }
        } catch (e) { console.log('信任徽章跳过:', e.message); }

        // 插入默认信息页面
        try {
            const pagesExist = await db.query(`SELECT COUNT(*) as cnt FROM info_pages`);
            if (parseInt(pagesExist[0]?.cnt || 0) === 0) {
                await db.query(`INSERT INTO info_pages (slug, title, content) VALUES ('terms', '服务条款', '欢迎使用星际卡密商城。')`);
                await db.query(`INSERT INTO info_pages (slug, title, content) VALUES ('privacy', '隐私政策', '我们重视您的隐私。')`);
                await db.query(`INSERT INTO info_pages (slug, title, content) VALUES ('help', '帮助中心', '常见问题解答。')`);
                console.log('✓ 信息页面已初始化');
            } else {
                console.log('✓ 信息页面已存在，跳过');
            }
        } catch (e) { console.log('信息页面跳过:', e.message); }

        // 重置序列（确保自增ID正确）
        const sequences = [
            "SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))",
            "SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1))",
            "SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1))",
            "SELECT setval('orders_id_seq', COALESCE((SELECT MAX(id) FROM orders), 1))",
            "SELECT setval('announcements_id_seq', COALESCE((SELECT MAX(id) FROM announcements), 1))"
        ];
        for (const sql of sequences) {
            try { await db.query(sql); } catch (e) { /* 忽略错误 */ }
        }

        console.log('========================================');
        console.log('  数据库初始化完成 (PostgreSQL)');
        console.log('========================================');
        
        return true;
    } catch (error) {
        console.error('数据库初始化失败:', error.message);
        console.error(error.stack);
        return false;
    }
}

module.exports = { initDatabase };
