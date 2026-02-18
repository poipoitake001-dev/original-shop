# 🔥 最终修复指南 - 支付设置保存问题

## ⚠️ 重要提示

你的 `backend/routes/admin.js` 文件**还没有被修改**！代码还是旧的，只包含 12 个字段。

## 📝 手动修改步骤（5 分钟完成）

### 第 1 步：打开文件

用你的代码编辑器打开：`backend/routes/admin.js`

### 第 2 步：定位到第 378 行

按 Ctrl+G（或 Cmd+G），输入 378，跳转到第 378 行。

你应该看到：
```javascript
const fields = ['site_name', 'site_description', 'contact_email', 'contact_phone', 'contact_wechat', 
    'contact_qr_url', 'footer_text', 'theme_color', 'bg_color', 'site_logo_url', 'favicon_url', 'page_title'];
```

### 第 3 步：删除这两行

选中并删除第 378-379 行（上面的两行代码）

### 第 4 步：粘贴新代码

在删除的位置粘贴以下代码：

```javascript
const fields = [
    // 基本信息
    'site_name', 'site_name_en', 'page_title', 'site_description', 'footer_text', 'footer_description',
    // 外观设置
    'site_logo_url', 'favicon_url', 'theme_color', 'bg_color', 'default_product_image',
    // 核心优势徽章
    'feature_1_title', 'feature_1_desc', 'feature_1_icon',
    'feature_2_title', 'feature_2_desc', 'feature_2_icon',
    'feature_3_title', 'feature_3_desc', 'feature_3_icon',
    // 联系方式
    'contact_email', 'contact_phone', 'contact_wechat', 'contact_qq', 'contact_qr_url', 'support_hours',
    // 社交账号
    'social_weibo', 'social_douyin', 'social_xiaohongshu', 'social_bilibili',
    // 支付设置 - API 网关
    'gateway_enabled', 'gateway_url', 'gateway_merchant_id', 'gateway_merchant_key', 'gateway_notify_url',
    // 支付设置 - 手动二维码
    'manual_qr_enabled', 'manual_qr_image', 'manual_qr_description',
    // 财务设置
    'withdrawal_fee_percent', 'withdrawal_min_fee'
];
```

### 第 5 步：添加调试日志

在第 383 行（`let paramIndex = 1;` 之后），添加：

```javascript
console.log('=== 收到更新设置请求 ===');
console.log('请求体字段:', Object.keys(req.body));
```

### 第 6 步：修改类型处理

找到第 387 行：
```javascript
params.push(req.body[f] || null);
```

替换为：
```javascript
// 特殊类型处理
if (f === 'withdrawal_fee_percent' || f === 'withdrawal_min_fee') {
    params.push(parseFloat(req.body[f]) || 0);
} else if (f === 'gateway_enabled' || f === 'manual_qr_enabled') {
    params.push(req.body[f] ? 1 : 0);
} else {
    params.push(req.body[f] || null);
}
```

### 第 7 步：添加更多调试日志

在第 392 行（`if (updateFields.length === 0)` 之前），添加：

```javascript
console.log('匹配到的字段数量:', updateFields.length);
```

在第 393 行（`return res.status(400)...` 之前），添加：

```javascript
console.log('❌ 没有匹配到任何字段');
```

### 第 8 步：添加记录检查

在第 392 行（`if (updateFields.length === 0)` 之后，`params.push(1);` 之前），添加：

```javascript
// 确保设置记录存在
const existing = await db.query('SELECT id FROM site_settings WHERE id = 1');
if (existing.length === 0) {
    console.log('创建默认设置记录');
    await db.query('INSERT INTO site_settings (id) VALUES (1)');
}
```

### 第 9 步：添加成功日志

在第 397 行（`res.json({ code: 200, message: '设置已更新' });` 之前），添加：

```javascript
console.log('✅ 设置更新成功');
```

### 第 10 步：保存文件

按 Ctrl+S（或 Cmd+S）保存文件

### 第 11 步：重启后端

```bash
# 停止后端（Ctrl+C）
cd backend
npm start
```

### 第 12 步：测试

1. 刷新管理后台页面（Ctrl+Shift+R 硬刷新）
2. 打开开发者工具（F12）
3. 进入支付设置页面
4. 开启手动二维码支付
5. 点击保存设置

**查看后端控制台，应该看到：**
```
=== 收到更新设置请求 ===
请求体字段: [ 'gateway_enabled', 'gateway_url', ... ]
匹配到的字段数量: 8
✅ 设置更新成功
```

## 🎯 完整的修改后代码

修改完成后，第 375-402 行应该是这样的：

```javascript
router.put('/settings', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const fields = [
            // 基本信息
            'site_name', 'site_name_en', 'page_title', 'site_description', 'footer_text', 'footer_description',
            // 外观设置
            'site_logo_url', 'favicon_url', 'theme_color', 'bg_color', 'default_product_image',
            // 核心优势徽章
            'feature_1_title', 'feature_1_desc', 'feature_1_icon',
            'feature_2_title', 'feature_2_desc', 'feature_2_icon',
            'feature_3_title', 'feature_3_desc', 'feature_3_icon',
            // 联系方式
            'contact_email', 'contact_phone', 'contact_wechat', 'contact_qq', 'contact_qr_url', 'support_hours',
            // 社交账号
            'social_weibo', 'social_douyin', 'social_xiaohongshu', 'social_bilibili',
            // 支付设置 - API 网关
            'gateway_enabled', 'gateway_url', 'gateway_merchant_id', 'gateway_merchant_key', 'gateway_notify_url',
            // 支付设置 - 手动二维码
            'manual_qr_enabled', 'manual_qr_image', 'manual_qr_description',
            // 财务设置
            'withdrawal_fee_percent', 'withdrawal_min_fee'
        ];
        const updateFields = [];
        const params = [];
        let paramIndex = 1;

        console.log('=== 收到更新设置请求 ===');
        console.log('请求体字段:', Object.keys(req.body));

        fields.forEach(f => {
            if (req.body[f] !== undefined) {
                updateFields.push(`${f} = ${paramIndex++}`);
                // 特殊类型处理
                if (f === 'withdrawal_fee_percent' || f === 'withdrawal_min_fee') {
                    params.push(parseFloat(req.body[f]) || 0);
                } else if (f === 'gateway_enabled' || f === 'manual_qr_enabled') {
                    params.push(req.body[f] ? 1 : 0);
                } else {
                    params.push(req.body[f] || null);
                }
            }
        });

        console.log('匹配到的字段数量:', updateFields.length);

        if (updateFields.length === 0) {
            console.log('❌ 没有匹配到任何字段');
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }

        // 确保设置记录存在
        const existing = await db.query('SELECT id FROM site_settings WHERE id = 1');
        if (existing.length === 0) {
            console.log('创建默认设置记录');
            await db.query('INSERT INTO site_settings (id) VALUES (1)');
        }

        params.push(1);
        await db.query(`UPDATE site_settings SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ${paramIndex}`, params);
        console.log('✅ 设置更新成功');
        res.json({ code: 200, message: '设置已更新' });
    } catch (error) {
        console.error('❌ Update settings error:', error);
        res.status(500).json({ code: 500, message: '更新失败', error: error.message });
    }
});
```

## ✅ 验证清单

修改完成后，检查：

- [ ] `fields` 数组包含 30+ 个字段
- [ ] 包含 `gateway_enabled`, `gateway_url`, `gateway_merchant_id`, `gateway_merchant_key`, `gateway_notify_url`
- [ ] 包含 `manual_qr_enabled`, `manual_qr_image`, `manual_qr_description`
- [ ] 有类型处理代码（布尔值转 0/1）
- [ ] 有调试日志
- [ ] 有记录存在检查
- [ ] 文件已保存
- [ ] 后端已重启

## 🔍 如果还是不行

### 检查数据库

```bash
node backend/scripts/check-db.js
```

如果提示字段不存在，执行：

```bash
node backend/scripts/migrate.js
```

### 查看后端日志

重启后端后，点击保存，应该看到：

```
=== 收到更新设置请求 ===
请求体字段: [ 'gateway_enabled', 'gateway_url', 'gateway_merchant_id', 'gateway_merchant_key', 'gateway_notify_url', 'manual_qr_enabled', 'manual_qr_image', 'manual_qr_description' ]
匹配到的字段数量: 8
✅ 设置更新成功
```

如果看到：
```
匹配到的字段数量: 0
❌ 没有匹配到任何字段
```

说明字段名不匹配，请告诉我前端发送的字段名是什么。

## 📸 截图验证

修改完成后，请提供：

1. **后端控制台的输出**（包含 "收到更新设置请求" 的日志）
2. **浏览器控制台的输出**（包含 "发送的数据" 的日志）
3. **Network 标签的请求详情**

这样我就能确认问题是否解决！
