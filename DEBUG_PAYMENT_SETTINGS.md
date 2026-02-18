# 调试支付设置保存问题

## 问题现象

- 点击"保存设置"按钮
- 控制台报错：`PUT /api/admin/settings 400 (Bad Request)`
- 弹窗提示："没有要更新的字段"

## 调试步骤

### 第一步：查看前端发送的数据

1. 打开管理后台
2. 按 F12 打开开发者工具
3. 切换到 Console 标签
4. 进入"支付设置"页面
5. 修改任意设置（如开启手动二维码支付）
6. 点击"保存设置"
7. 查看控制台输出

**应该看到：**
```
=== 保存支付设置 ===
发送的数据: {
  gateway_enabled: false,
  gateway_url: "",
  gateway_merchant_id: "",
  gateway_merchant_key: "",
  gateway_notify_url: "...",
  manual_qr_enabled: true,  // 你刚才开启的
  manual_qr_image: "",
  manual_qr_description: "..."
}
数据类型检查: {
  gateway_enabled: "boolean",
  manual_qr_enabled: "boolean",
  gateway_url: "string",
  manual_qr_image: "未设置"
}
```

### 第二步：查看 Network 请求详情

1. 切换到 Network 标签
2. 点击"保存设置"
3. 找到 `settings` 请求（红色的那个）
4. 点击查看详情

**检查以下内容：**

#### Request URL
```
http://localhost:3000/api/admin/settings
```

#### Request Method
```
PUT
```

#### Request Headers
```
Content-Type: application/json
Authorization: Bearer eyJhbGc...（你的 token）
```

#### Request Payload（请求体）
```json
{
  "gateway_enabled": false,
  "gateway_url": "",
  "gateway_merchant_id": "",
  "gateway_merchant_key": "",
  "gateway_notify_url": "http://localhost:3000/api/payment/notify",
  "manual_qr_enabled": true,
  "manual_qr_image": "",
  "manual_qr_description": "请扫描二维码完成支付，支付后请联系客服确认订单"
}
```

#### Response（响应）
```json
{
  "code": 400,
  "message": "没有要更新的字段"
}
```

### 第三步：检查后端日志

在后端控制台（运行 `npm start` 的终端）查看输出：

**正常情况应该看到：**
```
[2026-02-18 15:30:45] PUT /api/admin/settings
```

**如果有错误会看到：**
```
Update settings error: Error: Unknown column 'gateway_enabled' in 'field list'
```

或者：
```
Update settings error: Error: Table 'space_card_shop.site_settings' doesn't exist
```

## 常见问题诊断

### 问题 1：后端返回 "没有要更新的字段"

**原因：** 后端的 `fields` 数组中没有包含你发送的字段

**解决方案：**

1. 打开 `backend/routes/admin.js`
2. 找到第 375 行的 `router.put('/settings', ...)`
3. 检查 `const fields = [...]` 数组
4. 确认包含以下字段：
```javascript
'gateway_enabled', 'gateway_url', 'gateway_merchant_id', 
'gateway_merchant_key', 'gateway_notify_url',
'manual_qr_enabled', 'manual_qr_image', 'manual_qr_description'
```

5. 如果没有，按照 `FIX_PAYMENT_SETTINGS.md` 修改

### 问题 2：数据库字段不存在

**错误信息：** `Unknown column 'gateway_enabled' in 'field list'`

**解决方案：**

执行数据库迁移：
```bash
node backend/scripts/migrate.js
```

验证表结构：
```bash
node backend/scripts/check-db.js
```

### 问题 3：数据库表不存在

**错误信息：** `Table 'space_card_shop.site_settings' doesn't exist`

**解决方案：**

执行数据库迁移：
```bash
node backend/scripts/migrate.js
```

### 问题 4：Token 无效

**错误信息：** `401 Unauthorized`

**解决方案：**

1. 退出登录
2. 重新登录
3. 再次尝试保存

### 问题 5：数据格式错误

**前端发送的数据中有 `undefined` 或 `null` 值**

**解决方案：**

检查前端代码，确保所有字段都有默认值：
```javascript
gateway_enabled: data.gateway_enabled || false,  // 不要用 undefined
gateway_url: data.gateway_url || '',             // 空字符串而不是 null
```

## 完整的调试流程

### 1. 检查前端代码

打开 `admin/src/pages/PaymentSettingsPage.jsx`，确认：

- `loadSettings` 函数正确加载数据
- `handleSave` 函数正确发送数据
- 所有字段都有默认值

### 2. 检查后端代码

打开 `backend/routes/admin.js`，确认：

- `router.put('/settings', ...)` 包含所有支付设置字段
- 有特殊类型处理（布尔值、数值）
- 有检查设置记录是否存在的代码

### 3. 检查数据库

```bash
# 检查数据库状态
node backend/scripts/check-db.js

# 如果需要，执行迁移
node backend/scripts/migrate.js
```

### 4. 重启服务

```bash
# 停止后端（Ctrl+C）
cd backend
npm start

# 刷新前端页面
```

### 5. 测试保存

1. 打开管理后台
2. F12 打开开发者工具
3. 进入支付设置页面
4. 修改设置
5. 点击保存
6. 查看控制台和 Network 输出

## 预期的正确输出

### 前端控制台
```
=== 保存支付设置 ===
发送的数据: {...}
数据类型检查: {...}
服务器响应: {code: 200, message: "设置已更新"}
```

### Network 标签
```
Status: 200 OK
Response: {"code":200,"message":"设置已更新"}
```

### 后端控制台
```
[2026-02-18 15:30:45] PUT /api/admin/settings
```

## 如果还是无法解决

请提供以下信息：

1. **前端控制台的完整输出**（包括 "发送的数据" 和 "服务器响应"）
2. **Network 标签中的请求详情**（Request Payload 和 Response）
3. **后端控制台的错误日志**
4. **数据库检查结果**（`node backend/scripts/check-db.js` 的输出）

有了这些信息，我就能准确定位问题所在！

## 快速检查清单

- [ ] 前端代码已更新（包含调试日志）
- [ ] 后端代码已更新（包含所有支付字段）
- [ ] 数据库迁移已执行
- [ ] 后端服务已重启
- [ ] 前端页面已刷新
- [ ] 浏览器开发者工具已打开
- [ ] 已查看控制台输出
- [ ] 已查看 Network 请求详情
- [ ] 已查看后端日志

全部完成后再测试保存功能！
