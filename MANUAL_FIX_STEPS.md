# 手动修复支付设置保存问题

## 问题确认

从截图可以看到：
- 前端发送了支付设置字段（gateway_enabled, manual_qr_enabled 等）
- 后端返回 400 错误："没有要更新的字段"
- 原因：`backend/routes/admin.js` 第 378 行的 `fields` 数组只包含 12 个基础字段

## 立即修复（3 分钟完成）

### 步骤 1：打开文件

用编辑器打开：`backend/routes/admin.js`

### 步骤 2：找到第 378 行

找到这段代码：
```javascript
const fields = ['site_name', 'site_description', 'contact_email', 'contact_phone', 'contact_wechat', 
    'contact_qr_url', 'footer_text', 'theme_color', 'bg_color', 'site_logo_url', 'favicon_url', 'page_title'];
```

### 步骤 3：替换为完整字段列表

将上面的代码替换为：

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

### 步骤 4：找到第 384 行

找到这段代码：
```javascript
params.push(req.body[f] || null);
```

### 步骤 5：替换为类型处理代码

将上面的代码替换为：

```javascript
// 特殊类型处理
if (f === 'withdrawal_fee_percent' || f === 'withdrawal_min_fee') {
    // 数值类型
    params.push(parseFloat(req.body[f]) || 0);
} else if (f === 'gateway_enabled' || f === 'manual_qr_enabled') {
    // 布尔类型转为 0/1
    params.push(req.body[f] ? 1 : 0);
} else {
    // 字符串类型
    params.push(req.body[f] || null);
}
```

### 步骤 6：添加调试日志（可选）

在第 390 行（`if (updateFields.length === 0)`）之后，将：
```javascript
return res.status(400).json({ code: 400, message: '没有要更新的字段' });
```

替换为：
```javascript
console.log('收到的请求体:', req.body);
console.log('支持的字段:', fields);
return res.status(400).json({ 
    code: 400, 
    message: '没有要更新的字段',
    debug: {
        receivedFields: Object.keys(req.body),
        supportedFields: fields
    }
});
```

### 步骤 7：添加记录检查（可选但推荐）

在第 390 行之前（`if (updateFields.length === 0)` 之前），添加：

```javascript
// 确保设置记录存在
const existing = await db.query('SELECT id FROM site_settings WHERE id = 1');
if (existing.length === 0) {
    console.log('创建默认设置记录');
    await db.query('INSERT INTO site_settings (id) VALUES (1)');
}
```

### 步骤 8：保存文件

保存 `backend/routes/admin.js`

### 步骤 9：重启后端

```bash
# 停止后端（Ctrl+C）
cd backend
npm start
```

### 步骤 10：测试

1. 刷新管理后台页面
2. 进入支付设置
3. 开启手动二维码支付
4. 点击保存
5. 应该看到"保存成功"

## 完整的修改后代码

修改后，第 375-402 行应该是这样的：

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

        if (updateFields.length === 0) {
            console.log('收到的请求体:', req.body);
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }

        // 确保设置记录存在
        const existing = await db.query('SELECT id FROM site_settings WHERE id = 1');
        if (existing.length === 0) {
            await db.query('INSERT INTO site_settings (id) VALUES (1)');
        }

        params.push(1);
        await db.query(`UPDATE site_settings SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ${paramIndex}`, params);
        res.json({ code: 200, message: '设置已更新' });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ code: 500, message: '更新失败', error: error.message });
    }
});
```

## 验证修改

修改完成后，检查：

1. ✅ `fields` 数组包含 `gateway_enabled`, `manual_qr_enabled` 等支付字段
2. ✅ 有类型处理代码（布尔值转 0/1）
3. ✅ 有记录存在检查
4. ✅ 文件保存成功
5. ✅ 后端重启成功

## 如果还是不行

### 检查数据库

```bash
node backend/scripts/check-db.js
```

如果提示字段不存在，执行：

```bash
node backend/scripts/migrate.js
```

### 查看后端日志

重启后端后，应该看到：
```
[2026-02-18 16:00:00] PUT /api/admin/settings
收到的请求体: { gateway_enabled: false, manual_qr_enabled: true, ... }
设置更新成功
```

如果看到错误，请告诉我具体的错误信息。

## 快速检查清单

- [ ] 打开 `backend/routes/admin.js`
- [ ] 找到第 378 行
- [ ] 替换 `fields` 数组（添加支付字段）
- [ ] 找到第 384 行
- [ ] 替换为类型处理代码
- [ ] 添加记录检查代码（可选）
- [ ] 保存文件
- [ ] 重启后端
- [ ] 测试保存功能

完成这些步骤后，支付设置就能正常保存了！
