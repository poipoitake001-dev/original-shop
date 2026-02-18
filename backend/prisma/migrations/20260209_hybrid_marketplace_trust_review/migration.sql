-- ========================================
-- Migration: Hybrid Marketplace + Trust/Review System
-- Date: 2026-02-09
-- Description:
--   1. User model: Add student verification, trust scoring fields
--   2. Product model: Add product type (VIRTUAL/PHYSICAL) for hybrid marketplace
--   3. New Review table: Mutual evaluation system (Buyer <-> Seller)
-- ========================================

-- ==========================================
-- 1. UPDATE users TABLE - Trust & Permissions
-- ==========================================

-- 学生认证标识
ALTER TABLE `users` ADD COLUMN `is_student_verified` TINYINT(1) NOT NULL DEFAULT 0;

-- 跳过审核权限（信任卖家的商品可直接上架）
ALTER TABLE `users` ADD COLUMN `can_skip_audit` TINYINT(1) NOT NULL DEFAULT 0;

-- 用户评分（评价均分，默认5.0满分）
ALTER TABLE `users` ADD COLUMN `rating` FLOAT NOT NULL DEFAULT 5.0;

-- 评价计数
ALTER TABLE `users` ADD COLUMN `review_count` INT NOT NULL DEFAULT 0;

-- ==========================================
-- 2. UPDATE products TABLE - Hybrid Type
-- ==========================================

-- 商品类型: VIRTUAL(虚拟卡密) / PHYSICAL(实物商品)
-- 默认 VIRTUAL 保证已有数据兼容
ALTER TABLE `products` ADD COLUMN `type` ENUM('VIRTUAL', 'PHYSICAL') NOT NULL DEFAULT 'VIRTUAL';

-- 添加索引以支持按类型查询
ALTER TABLE `products` ADD INDEX `idx_product_type` (`type`);

-- ==========================================
-- 3. CREATE reviews TABLE - Mutual Evaluation
-- ==========================================

CREATE TABLE IF NOT EXISTS `reviews` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `order_id` INT NOT NULL,
    `reviewer_id` INT NOT NULL,
    `target_user_id` INT NOT NULL,
    `score` INT NOT NULL COMMENT '评分 1-5',
    `comment` VARCHAR(1000) DEFAULT NULL COMMENT '评价内容',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),

    -- 每个用户对每个订单只能评价一次
    UNIQUE KEY `uq_order_reviewer` (`order_id`, `reviewer_id`),

    -- 索引：按被评价人查询
    INDEX `idx_target_user_id` (`target_user_id`),

    -- 外键约束
    CONSTRAINT `fk_review_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_review_reviewer` FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_review_target` FOREIGN KEY (`target_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. UPDATE orders STATUS ENUM - Add awaiting_delivery
-- ==========================================

-- 实物商品支付后进入"待发货"状态
ALTER TABLE `orders` MODIFY COLUMN `status` ENUM('pending', 'paid', 'awaiting_delivery', 'delivered', 'completed', 'cancelled') DEFAULT 'pending';

-- ==========================================
-- 5. CREATE student_verifications TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS `student_verifications` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `id_photo_url` MEDIUMTEXT NOT NULL COMMENT '学生证/身份证照片(Base64或URL)',
    `status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    `admin_note` VARCHAR(500) DEFAULT NULL,
    `reviewed_at` DATETIME DEFAULT NULL,
    `reviewed_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    INDEX `idx_user_id` (`user_id`),
    INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
