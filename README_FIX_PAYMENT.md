# 🚨 紧急修复：支付设置无法保存

## 问题根源

你的 `backend/routes/admin.js` 文件**第 378 行**的 `fields` 数组只包含 12 个字段，**不包含支付设置字段**！

## 🎯 一键修复（复制粘贴）

### 打开文件
`backend/routes/admin.js`

### 找到第 378 行
```javascript
const fields = ['site_name', 'site_description', ...];  // ❌ 只有 12 个字段
```

### 替换为（复制下面全部内容）
```javascript
const fields = [
    'site_name', 'site_name_en', 'page_title', 'site_description', 'footer_text', 'footer_description',
    'site_logo_url', 'favicon_url', 'theme_color', 'bg_color', 'default_product_image',
    'feature_1_title', 'feature_1_desc', 'feature_1_icon',
    'feature_2_title', 'feature_2_desc', 'feature_2_icon',
    'feature_3_title', 'feature_3_desc', 'feature_3_icon',
    'contact_email', 'contact_phone', 'contact_wechat', 'contact_qq', 'contact_qr_url', 'support_hours',
    'social_weibo', 'social_douyin', 'social_xiaohongshu', 'social_bilibili',
    'gateway_enabled', 'gateway_url', 'gateway_merchant_id', 'gateway_merchant_key', 'gateway_notify_url',
    'manual_qr_enabled', 'manual_qr_image', 'manual_qr_description',
    'withdrawal_fee_percent', 'withdrawal_min_fee'
];
```

### 保存并重启
```bash
# 保存文件（Ctrl+S）
# 重启后端
cd backend
npm start
```

### 测试
刷新管理后台 → 支付设置 → 保存

## ✅ 成功标志

后端控制台应该显示：
```
[时间] PUT /api/admin/settings
```

浏览器应该显示：
```
保存成功
```

## 📋 详细步骤

如果需要详细的分步指导，请查看：
- `FINAL_FIX_INSTRUCTIONS.md` - 完整的修改步骤
- `MANUAL_FIX_STEPS.md` - 手动修改指南
- `backend/routes/COPY_THIS_CODE.txt` - 完整的替换代码

## 🔧 数据库迁移

如果修改后还是报错，执行：
```bash
node backend/scripts/migrate.js
```

## 💡 关键点

1. **字段白名单**：必须包含 `gateway_enabled`, `manual_qr_enabled` 等
2. **类型处理**：布尔值需要转为 0/1
3. **记录检查**：确保 site_settings 表有记录

## 🆘 还是不行？

请提供：
1. 后端控制台的完整输出
2. 浏览器控制台的 "发送的数据"
3. Network 标签的请求响应

我会继续帮你解决！
