# 支付设置功能修复指南

## 问题诊断

当前问题：前端保存支付设置时收到 **400 错误："没有要更新的字段"**

根本原因：数据库 `site_settings` 表中缺少支付设置相关的字段列

## 解决方案

### 步骤 1: 确认数据库类型

首先需要确认你的数据库是 **PostgreSQL** 还是 **MySQL**：

```bash
# 查看 backend/.env 文件中的 DATABASE_URL
# PostgreSQL 格式: postgresql://user:pass@host:port/dbname
# MySQL 格式: mysql://user:pass@host:port/dbname
```

### 步骤 2: 执行数据库迁移

#### 方案 A: 如果是 PostgreSQL (推荐)

1. 打开你的数据库管理工具（如 pgAdmin、DBeaver、或 Neon 控制台）
2. 连接到你的数据库
3. 执行 `ADD_PAYMENT_COLUMNS.sql` 文件中的所有 SQL 语句

或者，如果数据库连接正常，运行：
```bash
cd backend
node scripts/add-payment-columns.js
```

#### 方案 B: 如果是 MySQL

1. 打开你的数据库管理工具（如 phpMyAdmin、MySQL Workbench、Navicat）
2. 连接到你的数据库
3. 执行 `ADD_PAYMENT_COLUMNS_MYSQL.sql` 文件中的所有 SQL 语句

### 步骤 3: 验证字段是否添加成功

在数据库管理工具中执行以下查询：

```sql
-- PostgreSQL
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'site_settings' 
AND column_name LIKE '%gateway%' OR column_name LIKE '%manual_qr%';

-- MySQL
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'site_settings' 
AND (COLUMN_NAME LIKE '%gateway%' OR COLUMN_NAME LIKE '%manual_qr%');
```

应该看到以下字段：
- `gateway_enabled`
- `gateway_url`
- `gateway_merchant_id`
- `gateway_merchant_key`
- `gateway_notify_url`
- `manual_qr_enabled`
- `manual_qr_image`
- `manual_qr_description`

### 步骤 4: 重启后端服务

```bash
cd backend
npm start
```

或者如果使用 PM2：
```bash
pm2 restart backend
```

### 步骤 5: 测试保存功能

1. 打开管理后台：`http://your-domain/admin`
2. 登录后进入"支付设置"页面
3. 修改任意设置（如开启 API 网关支付）
4. 点击"保存设置"按钮
5. 应该看到"保存成功"提示

## 已完成的修改

### 1. 后端路由更新 ✅

文件：`backend/routes/admin.js`

- 已在字段白名单中添加所有支付设置字段
- 已添加详细的日志输出用于调试
- 已正确处理布尔值转换（0/1）

### 2. 前端页面完成 ✅

文件：`admin/src/pages/PaymentSettingsPage.jsx`

- API 网关支付配置区域
- 手动二维码支付配置区域
- 图片上传功能（自动转 Base64）
- 完整的表单验证和错误处理

### 3. 路由配置完成 ✅

文件：`admin/src/App.jsx`

- 已添加 `/payment-settings` 路由
- 位置在"店铺装修"和"用户管理"之间

## 调试技巧

如果保存后仍然失败，请检查：

### 1. 查看后端日志

后端现在会输出详细日志：
```
=== 收到设置更新请求 ===
请求体字段: [...]
匹配到的字段数: X
更新字段: [...]
```

### 2. 查看浏览器控制台

前端会输出：
```
=== 保存支付设置 ===
发送的数据: {...}
数据类型检查: {...}
服务器响应: {...}
```

### 3. 常见错误

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| "没有要更新的字段" | 数据库字段不存在 | 执行步骤 2 的 SQL 迁移 |
| "column 'xxx' does not exist" | 数据库字段缺失 | 执行步骤 2 的 SQL 迁移 |
| "ECONNREFUSED" | 数据库连接失败 | 检查 backend/.env 中的 DATABASE_URL |
| 500 错误 | 后端代码错误 | 查看后端日志，检查错误堆栈 |

## 需要添加的数据库字段清单

### 支付设置（8 个字段）
- `gateway_enabled` - API 网关开关
- `gateway_url` - API 网关地址
- `gateway_merchant_id` - 商户 ID
- `gateway_merchant_key` - 商户密钥
- `gateway_notify_url` - 异步通知地址
- `manual_qr_enabled` - 手动二维码开关
- `manual_qr_image` - 收款二维码图片
- `manual_qr_description` - 支付说明

### 核心优势徽章（9 个字段）
- `feature_1_title`, `feature_1_desc`, `feature_1_icon`
- `feature_2_title`, `feature_2_desc`, `feature_2_icon`
- `feature_3_title`, `feature_3_desc`, `feature_3_icon`

### 其他字段（10 个字段）
- `site_name_en` - 英文站点名称
- `footer_description` - 页脚描述
- `default_product_image` - 默认商品图片
- `contact_qq` - QQ 号
- `support_hours` - 客服时间
- `social_weibo` - 微博链接
- `social_douyin` - 抖音链接
- `social_xiaohongshu` - 小红书链接
- `social_bilibili` - B站链接
- `withdrawal_fee_percent` - 提现手续费百分比
- `withdrawal_min_fee` - 最低手续费

**总计：27 个新字段**

## 联系支持

如果按照以上步骤操作后仍然无法解决问题，请提供：
1. 数据库类型（PostgreSQL 或 MySQL）
2. 后端日志输出
3. 浏览器控制台错误信息
4. 数据库字段验证查询结果
