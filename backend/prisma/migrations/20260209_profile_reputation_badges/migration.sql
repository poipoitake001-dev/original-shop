-- ========================================
-- Migration: Profile, Reputation Stats & Badges
-- Date: 2026-02-09
-- ========================================

-- 用户表 - 个人资料字段
ALTER TABLE `users` ADD COLUMN `nickname` VARCHAR(50) DEFAULT NULL;
ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(500) DEFAULT NULL;

-- 用户表 - 信誉统计字段
ALTER TABLE `users` ADD COLUMN `sold_count` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `bought_count` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `dispute_count` INT NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `good_review_count` INT NOT NULL DEFAULT 0;

-- 用户表 - 自动徽章字段
ALTER TABLE `users` ADD COLUMN `badge_excellent_seller` TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `badge_excellent_buyer` TINYINT(1) NOT NULL DEFAULT 0;
