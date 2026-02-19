# 支付设置修复 - 快速步骤

## 🎯 核心问题
数据库 `site_settings` 表缺少支付设置字段，导致保存时报错 "没有要更新的字段"

## ⚡ 快速修复（3 步）

### 1️⃣ 执行数据库迁移

**选择你的数据库类型：**

#### PostgreSQL (Neon 云数据库)
在数据库管理工具中执行 `ADD_PAYMENT_COLUMNS.sql`

#### MySQL (本地数据库)
在数据库管理工具中执行 `ADD_PAYMENT_COLUMNS_MYSQL.sql`

### 2️⃣ 重启后端服务

```bash
cd backend
npm start
```

### 3️⃣ 测试保存功能

1. 打开管理后台
2. 进入"支付设置"页面
3. 修改任意设置
4. 点击"保存设置"
5. 应该看到"保存成功"✅

## 🔍 验证是否成功

运行检查脚本：
```bash
node backend/scripts/check-payment-columns.js
```

如果看到 "✅ 所有字段都已存在！" 说明迁移成功。

## 📋 已完成的工作

✅ 前端页面：`admin/src/pages/PaymentSettingsPage.jsx`
✅ 后端路由：`backend/routes/admin.js` (已添加字段白名单)
✅ 路由配置：`admin/src/App.jsx`
✅ 数据库迁移脚本：`ADD_PAYMENT_COLUMNS.sql` 和 `ADD_PAYMENT_COLUMNS_MYSQL.sql`

## ❓ 如果还是失败

查看详细指南：`PAYMENT_SETTINGS_FIX_GUIDE.md`

检查：
- 后端日志（会显示 "=== 收到设置更新请求 ===" 等信息）
- 浏览器控制台（会显示发送的数据和响应）
- 数据库连接是否正常
