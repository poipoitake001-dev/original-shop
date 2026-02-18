/**
 * admin.js 中 settings 路由的补丁
 * 
 * 使用方法：
 * 1. 打开 backend/routes/admin.js
 * 2. 找到第 375 行的 router.put('/settings', ...)
 * 3. 将整个函数（375-402行）替换为下面的代码
 */

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
