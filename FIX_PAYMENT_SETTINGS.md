# 修复支付设置无法保存的问题

## 问题原因

前端调用的是 `/api/admin/settings`，但 `backend/routes/admin.js` 中的这个路由只支持有限的字段，不包括支付设置相关的字段（`gateway_enabled`, `manual_qr_enabled` 等）。

## 解决方案

需要更新 `backend/routes/admin.js` 文件中的 settings PUT 路由。

### 方法一：手动修改（推荐）

1. 打开文件：`backend/routes/admin.js`

2. 找到第 375 行附近的代码：
```javascript
router.put('/settings', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const fields = ['site_name', 'site_description', 'contact_email', 'contact_phone', 'contact_wechat', 
            'contact_qr_url', 'footer_text', 'theme_color', 'bg_color', 'site_logo_url', 'favicon_url', 'page_title'];
```

3. 将 `const fields = [...]` 这一行替换为：
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
            // 支付设置
            'gateway_enabled', 'gateway_url', 'gateway_merchant_id', 'gateway_merchant_key', 'gateway_notify_url',
            'manual_qr_enabled', 'manual_qr_image', 'manual_qr_description',
            // 财务设置
            'withdrawal_fee_percent', 'withdrawal_min_fee'
        ];
```

4. 找到这一行：
```javascript
                params.push(req.body[f] || null);
```

5. 将它替换为：
```javascript
                // 特殊处理数值和布尔类型
                if (f === 'withdrawal_fee_percent' || f === 'withdrawal_min_fee') {
                    params.push(parseFloat(req.body[f]) || 0);
                } else if (f === 'gateway_enabled' || f === 'manual_qr_enabled') {
                    params.push(req.body[f] ? 1 : 0);
                } else {
                    params.push(req.body[f] || null);
                }
```

6. 在 `if (updateFields.length === 0)` 这个判断之后，添加以下代码：
```javascript
        // 确保设置记录存在
        const existing = await db.query('SELECT id FROM site_settings WHERE id = 1');
        if (existing.length === 0) {
            await db.query('INSERT INTO site_settings (id) VALUES (1)');
        }
```

7. 保存文件

### 方法二：复制完整代码

打开 `backend/routes/admin-settings-patch.js` 文件，复制全部内容，然后：

1. 打开 `backend/routes/admin.js`
2. 找到第 375 行的 `router.put('/settings', ...)`
3. 删除整个函数（到第 402 行的 `});`）
4. 粘贴复制的代码

## 验证修改

修改完成后，检查代码是否正确：

1. 确保 `fields` 数组包含了所有支付设置字段
2. 确保有特殊类型处理的代码
3. 确保有检查设置记录是否存在的代码

## 执行数据库迁移

如果还没有执行，需要先执行数据库迁移：

```bash
node backend/scripts/migrate.js
```

## 重启服务

```bash
# 停止后端服务（Ctrl+C）
# 重新启动
cd backend
npm start
```

## 测试

1. 访问管理后台
2. 进入"支付设置"页面
3. 开启"手动二维码支付"
4. 点击"保存设置"
5. 应该看到"保存成功"提示
6. 刷新页面，设置应该保留

## 调试

如果还是无法保存，打开浏览器开发者工具（F12）：

1. 切换到 Network 标签
2. 点击"保存设置"
3. 找到 `settings` 请求
4. 查看响应：
   - 如果是 200：成功
   - 如果是 400：检查请求体是否正确
   - 如果是 500：查看后端控制台的错误日志

## 常见错误

### 错误 1：Unknown column 'gateway_enabled'

**原因**：数据库表没有这个字段

**解决**：执行数据库迁移
```bash
node backend/scripts/migrate.js
```

### 错误 2：Table 'site_settings' doesn't exist

**原因**：数据库表不存在

**解决**：执行数据库迁移
```bash
node backend/scripts/migrate.js
```

### 错误 3：语法错误

**原因**：代码修改不正确

**解决**：
1. 检查是否有遗漏的逗号、括号
2. 使用方法二重新复制完整代码
3. 或者使用 Git 恢复文件后重新修改

## 完整的修改后代码示例

修改后的 `router.put('/settings', ...)` 函数应该是这样的：

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
            // 支付设置
            'gateway_enabled', 'gateway_url', 'gateway_merchant_id', 'gateway_merchant_key', 'gateway_notify_url',
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
                // 特殊处理数值和布尔类型
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

## 总结

修改完成后，你应该能够：
1. ✅ 保存支付设置
2. ✅ 保存店铺装修设置
3. ✅ 保存核心优势徽章配置
4. ✅ 刷新后设置保留

如果还有问题，请提供：
- 浏览器控制台的错误信息
- 后端控制台的错误日志
- Network 标签中的请求响应
