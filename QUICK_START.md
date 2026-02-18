# 🚀 快速部署指南

## 问题修复说明

本次更新修复了以下问题：
1. ✅ 后端支付设置无法保存 - 已添加数据库表和字段支持
2. ✅ 店铺装修无法保存 - 已添加所有新字段的后端支持
3. ✅ 核心优势徽章配置 - 现在可以在管理后台直接修改前端显示的三个方框内容

## 一键部署（3步完成）

### 步骤 1：执行数据库迁移

在项目根目录执行：

```bash
node backend/scripts/migrate.js
```

看到以下输出表示成功：
```
✓ 创建表: site_settings
✓ 创建表: trust_badges
✓ 创建表: info_pages
✓ 插入数据: site_settings
✓ 插入数据: trust_badges
✓ 插入数据: info_pages

数据库迁移完成！
```

### 步骤 2：重启后端服务

```bash
cd backend
npm start
```

### 步骤 3：重启前端服务

```bash
# 管理后台
cd admin
npm run dev

# 用户前端（可选）
cd frontend
npm run dev
```

## 验证功能

### 1. 测试支付设置
1. 访问管理后台：http://localhost:5173
2. 登录后点击左侧"支付设置"菜单
3. 开启"手动二维码支付"
4. 点击"点击上传图片"上传一张二维码图片
5. 填写支付说明
6. 点击"保存设置"
7. 看到"保存成功"提示即可

### 2. 测试店铺装修
1. 点击左侧"店铺装修"菜单
2. 向下滚动到"核心优势徽章"区域
3. 修改"优势 1"的标题为"极速发货"
4. 修改描述为"下单后5分钟内自动发货"
5. 点击"保存设置"
6. 访问前端页面查看三个方框是否更新

### 3. 验证前端显示
1. 访问前端页面：http://localhost:5174
2. 向下滚动到核心优势区域
3. 应该看到三个方框显示你在管理后台配置的内容

## 常见问题

### Q: 执行迁移脚本时报错 "Cannot find module '../config/db'"

**A:** 确保在项目根目录执行命令，不要在 backend 目录下执行

### Q: 保存设置时提示"更新设置失败"

**A:** 检查数据库迁移是否成功执行：
```sql
USE space_card_shop;
SHOW TABLES LIKE 'site_settings';
SELECT * FROM site_settings;
```

### Q: 前端核心优势不显示

**A:** 
1. 在管理后台"店铺装修"页面配置核心优势徽章
2. 确保至少填写了标题字段
3. 刷新前端页面

### Q: 图片上传后显示不出来

**A:** 
1. 检查图片格式（仅支持 JPG、PNG）
2. 确认图片大小不超过 2MB
3. 查看浏览器控制台是否有错误

## 默认配置

数据库迁移会自动创建以下默认配置：

**核心优势徽章（前端三个方框）：**
1. 本平台仅在线支付 - 仅通过二手品或虚拟卡，不支持任何线下转账交易
2. 诚信交易，真假自辨 - 中途达成交易，提供完整的聊天记录，不干涉个人交易自由
3. 触达校园与新专台 - 不干涉校园生活与学习，非营业性质的校园广告平台

你可以在管理后台"店铺装修"页面修改这些内容。

## 技术支持

如遇到其他问题，请查看：
- `admin/UPGRADE_NOTES.md` - 详细升级说明
- `database/migrations/README.md` - 数据库迁移说明
- 后端控制台日志
- 浏览器开发者工具控制台

## 文件清单

本次更新涉及的文件：

**新增文件：**
- `database/migrations/add_settings_tables.sql` - 数据库迁移脚本
- `database/migrations/README.md` - 迁移说明
- `backend/scripts/migrate.js` - 迁移执行脚本
- `admin/UPGRADE_NOTES.md` - 升级说明
- `QUICK_START.md` - 本文件

**修改文件：**
- `admin/src/pages/PaymentSettingsPage.jsx` - 新增支付设置页面
- `admin/src/pages/ShopDesignPage.jsx` - 重构店铺装修页面
- `admin/src/App.jsx` - 更新路由配置
- `backend/routes/settings.js` - 支持所有新字段
- `frontend/src/components/CoreFeatures.jsx` - 从数据库读取配置

祝使用愉快！🎉
