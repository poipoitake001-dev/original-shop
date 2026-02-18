-- ========================================
-- Migration: Profile - 校区、宿舍楼、班级、专业
-- Date: 2026-02-09
-- ========================================

-- 用户表 - 个人资料扩展
ALTER TABLE `users` ADD COLUMN `campus` VARCHAR(100) DEFAULT NULL COMMENT '校区';
ALTER TABLE `users` ADD COLUMN `dormitory` VARCHAR(100) DEFAULT NULL COMMENT '宿舍楼';
ALTER TABLE `users` ADD COLUMN `class_name` VARCHAR(100) DEFAULT NULL COMMENT '班级';
ALTER TABLE `users` ADD COLUMN `major` VARCHAR(100) DEFAULT NULL COMMENT '专业';
