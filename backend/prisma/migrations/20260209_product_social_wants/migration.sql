-- ========================================
-- Migration: Product Social Features (Want/View counts)
-- Date: 2026-02-09
-- ========================================

-- 商品表 - 添加想要/浏览计数
ALTER TABLE `products` ADD COLUMN `want_count` INT NOT NULL DEFAULT 0;
ALTER TABLE `products` ADD COLUMN `view_count` INT NOT NULL DEFAULT 0;

-- 商品想要（收藏）关联表
CREATE TABLE IF NOT EXISTS `product_wants` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `user_id` INT NOT NULL,
    `product_id` INT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_product` (`user_id`, `product_id`),
    INDEX `idx_product_id` (`product_id`),
    CONSTRAINT `fk_want_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_want_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
