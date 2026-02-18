// ==========================================
// 将此代码复制到 backend/routes/admin.js 第 375-402 行
// 替换整个 router.put('/settings', ...) 函数
// ==========================================

router.put('/settings', verifyToken, verifyAdmin, async (req, res) => {
    try {
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
        const updateFields = [];
        const params = [];
        let paramIndex = 1;

        console.log('=== 收到更新设置请求 ===');
        console.log('请求体字段:', Object.keys(req.body));

        fields.forEach(f => {
            if (req.body[f] !== undefined) {
                updateFields.push(`${f} = ${paramIndex++}`);
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
