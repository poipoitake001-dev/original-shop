/**
 * ========================================
 * 系统设置路由
 * Site Settings Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// ========== 公开接口 ==========

/**
 * 获取公开设置（前端使用）
 * GET /api/settings/public
 */
router.get('/public', async (req, res) => {
    try {
        const settings = await db.query(
            'SELECT site_name, site_name_en, page_title, favicon_url, site_logo_url, site_description, theme_color, bg_color, default_product_image, contact_qr_url, contact_wechat, contact_email, contact_phone, support_hours, footer_text, footer_description, social_links, feature_1_title, feature_1_desc, feature_1_icon, feature_2_title, feature_2_desc, feature_2_icon, feature_3_title, feature_3_desc, feature_3_icon FROM site_settings WHERE id = 1'
        );
        
        if (settings.length === 0) {
            // 返回默认值
            return res.json({
                code: 200,
                data: {
                    site_name: '星际卡密商城',
                    contact_qr_url: null
                }
            });
        }
        
        res.json({ code: 200, data: settings[0] });
    } catch (error) {
        console.error('获取设置失败:', error);
        res.status(500).json({ code: 500, message: '获取设置失败' });
    }
});

/**
 * 获取信任徽章（公开）
 * GET /api/settings/trust-badges
 */
router.get('/trust-badges', async (req, res) => {
    try {
        const badges = await db.query(
            'SELECT * FROM trust_badges WHERE is_visible = 1 ORDER BY sort_order ASC'
        );
        res.json({ code: 200, data: badges });
    } catch (error) {
        console.error('获取信任徽章失败:', error);
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

// ========== 管理员接口 ==========

/**
 * 获取完整设置（管理员）
 * GET /api/settings
 */
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const settings = await db.query('SELECT * FROM site_settings WHERE id = 1');
        
        if (settings.length === 0) {
            // 创建默认设置
            await db.query('INSERT INTO site_settings (id, site_name) VALUES (1, ?)' , ['星际卡密商城']);
            return res.json({
                code: 200,
                data: { id: 1, site_name: '星际卡密商城' }
            });
        }
        
        res.json({ code: 200, data: settings[0] });
    } catch (error) {
        console.error('获取设置失败:', error);
        res.status(500).json({ code: 500, message: '获取设置失败' });
    }
});

/**
 * 更新设置（管理员）
 * PUT /api/settings
 */
router.put('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const updateFields = [];
        const params = [];
        
        // 所有可更新的字段列表
        const allowedFields = [
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
        
        // 遍历所有允许的字段
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateFields.push(`${field} = ?`);
                // 特殊处理数值类型
                if (field === 'withdrawal_fee_percent' || field === 'withdrawal_min_fee') {
                    params.push(parseFloat(req.body[field]) || 0);
                } else if (field === 'gateway_enabled' || field === 'manual_qr_enabled') {
                    params.push(req.body[field] ? 1 : 0);
                } else {
                    params.push(req.body[field] || null);
                }
            }
        });
        
        // 处理 social_links JSON 字段
        if (req.body.social_links !== undefined) {
            updateFields.push('social_links = ?');
            params.push(typeof req.body.social_links === 'string' ? req.body.social_links : JSON.stringify(req.body.social_links));
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }
        
        // 确保设置记录存在
        const existing = await db.query('SELECT id FROM site_settings WHERE id = 1');
        if (existing.length === 0) {
            await db.query('INSERT INTO site_settings (id) VALUES (1)');
        }
        
        await db.query(
            `UPDATE site_settings SET ${updateFields.join(', ')} WHERE id = 1`,
            params
        );
        
        // 清除服务端主题缓存，下次请求将重新读取数据库
        if (req.app.clearSiteThemeCache) req.app.clearSiteThemeCache();
        
        res.json({ code: 200, message: '设置更新成功' });
    } catch (error) {
        console.error('更新设置失败:', error);
        res.status(500).json({ code: 500, message: '更新设置失败' });
    }
});

// ========== 账户管理接口 ==========

/**
 * 获取当前管理员信息
 * GET /api/settings/account
 */
router.get('/account', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await db.query(
            'SELECT id, username, email, created_at, updated_at FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        
        res.json({ code: 200, data: users[0] });
    } catch (error) {
        console.error('获取账户信息失败:', error);
        res.status(500).json({ code: 500, message: '获取账户信息失败' });
    }
});

/**
 * 修改账户信息（用户名/邮箱）
 * PUT /api/settings/account
 */
router.put('/account', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { username, email, current_password } = req.body;
        
        // 验证当前密码
        if (!current_password) {
            return res.status(400).json({ code: 400, message: '请输入当前密码以验证身份' });
        }
        
        const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        
        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '当前密码错误' });
        }
        
        const updateFields = [];
        const params = [];
        
        if (username) {
            // 检查用户名是否已被使用
            const existingUser = await db.query(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, req.user.id]
            );
            if (existingUser.length > 0) {
                return res.status(400).json({ code: 400, message: '用户名已被使用' });
            }
            updateFields.push('username = ?');
            params.push(username);
        }
        
        if (email) {
            // 检查邮箱是否已被使用
            const existingEmail = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, req.user.id]
            );
            if (existingEmail.length > 0) {
                return res.status(400).json({ code: 400, message: '邮箱已被使用' });
            }
            updateFields.push('email = ?');
            params.push(email);
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有要更新的字段' });
        }
        
        params.push(req.user.id);
        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({ code: 200, message: '账户信息更新成功' });
    } catch (error) {
        console.error('更新账户信息失败:', error);
        res.status(500).json({ code: 500, message: '更新账户信息失败' });
    }
});

/**
 * 修改密码
 * PUT /api/settings/password
 */
router.put('/password', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;
        
        // 验证输入
        if (!current_password || !new_password || !confirm_password) {
            return res.status(400).json({ code: 400, message: '请填写所有密码字段' });
        }
        
        if (new_password !== confirm_password) {
            return res.status(400).json({ code: 400, message: '两次输入的新密码不一致' });
        }
        
        if (new_password.length < 6) {
            return res.status(400).json({ code: 400, message: '新密码长度不能少于6位' });
        }
        
        // 验证当前密码
        const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        
        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '当前密码错误' });
        }
        
        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        
        // 更新密码
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);
        
        res.json({ code: 200, message: '密码修改成功，请使用新密码重新登录' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ code: 500, message: '修改密码失败' });
    }
});

// ========== 密保功能 ==========

/**
 * 获取密保状态（是否已设置）
 * GET /api/settings/security
 */
router.get('/security', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const users = await db.query(
            'SELECT security_question FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        
        const hasSecurityQuestion = !!users[0].security_question;
        
        res.json({
            code: 200,
            data: {
                has_security: hasSecurityQuestion,
                security_question: hasSecurityQuestion ? users[0].security_question : null
            }
        });
    } catch (error) {
        console.error('获取密保状态失败:', error);
        res.status(500).json({ code: 500, message: '获取密保状态失败' });
    }
});

/**
 * 设置/修改密保
 * PUT /api/settings/security
 */
router.put('/security', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { current_password, security_question, security_answer } = req.body;
        
        if (!current_password) {
            return res.status(400).json({ code: 400, message: '请输入当前密码以验证身份' });
        }
        
        if (!security_question || !security_answer) {
            return res.status(400).json({ code: 400, message: '密保问题和答案不能为空' });
        }
        
        // 验证当前密码
        const users = await db.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        
        const isMatch = await bcrypt.compare(current_password, users[0].password);
        if (!isMatch) {
            return res.status(400).json({ code: 400, message: '当前密码错误' });
        }
        
        // 加密密保答案（防止数据库泄露）
        const salt = await bcrypt.genSalt(10);
        const hashedAnswer = await bcrypt.hash(security_answer.toLowerCase().trim(), salt);
        
        // 更新密保
        await db.query(
            'UPDATE users SET security_question = ?, security_answer = ? WHERE id = ?',
            [security_question.trim(), hashedAnswer, req.user.id]
        );
        
        res.json({ code: 200, message: '密保设置成功' });
    } catch (error) {
        console.error('设置密保失败:', error);
        res.status(500).json({ code: 500, message: '设置密保失败' });
    }
});

/**
 * 获取管理员密保问题（公开接口，用于找回密码）
 * GET /api/settings/security/question
 */
router.get('/security/question', async (req, res) => {
    try {
        // 获取第一个管理员的密保问题
        const admins = await db.query(
            'SELECT id, security_question FROM users WHERE role = ? AND security_question IS NOT NULL LIMIT 1',
            ['admin']
        );
        
        if (admins.length === 0) {
            return res.status(404).json({ 
                code: 404, 
                message: '未设置密保，无法找回密码',
                data: { has_security: false }
            });
        }
        
        res.json({
            code: 200,
            data: {
                has_security: true,
                // 不暴露真实 admin_id
                security_question: admins[0].security_question
            }
        });
    } catch (error) {
        console.error('获取密保问题失败:', error.message);
        res.status(500).json({ code: 500, message: '获取密保问题失败' });
    }
});

// 密保重置失败计数器（IP 维度）
const resetAttempts = new Map();
const RESET_MAX_ATTEMPTS = 5;
const RESET_LOCK_MINUTES = 30;

// 定期清理过期记录
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of resetAttempts) {
        if (now - val.firstAttempt > RESET_LOCK_MINUTES * 60 * 1000) {
            resetAttempts.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * 通过密保重置账号密码（公开接口）
 * POST /api/settings/security/reset
 */
router.post('/security/reset', async (req, res) => {
    try {
        // 基于 IP 的失败次数锁定
        const clientIP = req.ip || 'unknown';
        const attempts = resetAttempts.get(clientIP);
        if (attempts && attempts.count >= RESET_MAX_ATTEMPTS) {
            const elapsed = Date.now() - attempts.firstAttempt;
            if (elapsed < RESET_LOCK_MINUTES * 60 * 1000) {
                const remainMin = Math.ceil((RESET_LOCK_MINUTES * 60 * 1000 - elapsed) / 60000);
                return res.status(429).json({ code: 429, message: `尝试次数过多，请 ${remainMin} 分钟后再试` });
            }
            resetAttempts.delete(clientIP);
        }

        const { security_answer, new_username, new_email, new_password } = req.body;
        
        if (!security_answer) {
            return res.status(400).json({ code: 400, message: '请提供密保答案' });
        }
        
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ code: 400, message: '新密码长度不能少于6位' });
        }
        
        // 自动查找管理员（不依赖客户端传入 admin_id）
        const admins = await db.query(
            'SELECT id, security_answer FROM users WHERE role = ? AND security_answer IS NOT NULL LIMIT 1',
            ['admin']
        );
        
        if (admins.length === 0) {
            return res.status(404).json({ code: 404, message: '管理员未设置密保' });
        }
        
        const admin = admins[0];
        
        // 验证密保答案（不区分大小写）
        const isMatch = await bcrypt.compare(
            security_answer.toLowerCase().trim(), 
            admin.security_answer
        );
        
        if (!isMatch) {
            // 记录失败次数
            const current = resetAttempts.get(clientIP) || { count: 0, firstAttempt: Date.now() };
            current.count++;
            resetAttempts.set(clientIP, current);
            const remaining = RESET_MAX_ATTEMPTS - current.count;
            return res.status(400).json({ code: 400, message: `密保答案错误，还剩 ${remaining} 次机会` });
        }
        
        // 验证通过，清除失败计数
        resetAttempts.delete(clientIP);
        
        // 构建更新语句
        const updateFields = [];
        const params = [];
        
        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);
        updateFields.push('password = ?');
        params.push(hashedPassword);
        
        // 更新用户名（如果提供）
        if (new_username && new_username.trim()) {
            const existingUser = await db.query(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [new_username.trim(), admin.id]
            );
            if (existingUser.length > 0) {
                return res.status(400).json({ code: 400, message: '用户名已被使用' });
            }
            updateFields.push('username = ?');
            params.push(new_username.trim());
        }
        
        // 更新邮箱（如果提供）
        if (new_email && new_email.trim()) {
            const existingEmail = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [new_email.trim(), admin.id]
            );
            if (existingEmail.length > 0) {
                return res.status(400).json({ code: 400, message: '邮箱已被使用' });
            }
            updateFields.push('email = ?');
            params.push(new_email.trim());
        }
        
        params.push(admin.id);
        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );
        
        res.json({ 
            code: 200, 
            message: '账号重置成功，请使用新的账号密码登录'
        });
    } catch (error) {
        console.error('重置账号失败:', error.message);
        res.status(500).json({ code: 500, message: '重置账号失败' });
    }
});

// ========== 信息页面（公开）==========

/**
 * GET /api/settings/pages/:slug
 * 获取指定页面内容（公开）
 */
router.get('/pages/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const pages = await db.query(
            'SELECT slug, title, content, updated_at FROM info_pages WHERE slug = ? AND is_published = 1',
            [slug]
        );
        if (pages.length === 0) {
            return res.status(404).json({ code: 404, message: '页面不存在' });
        }
        res.json({ code: 200, data: pages[0] });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * GET /api/settings/pages
 * 获取所有页面列表（管理员）
 */
router.get('/pages', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const pages = await db.query('SELECT * FROM info_pages ORDER BY id ASC');
        res.json({ code: 200, data: pages });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * PUT /api/settings/pages/:slug
 * 更新页面内容（管理员）
 */
router.put('/pages/:slug', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { slug } = req.params;
        const { title, content, is_published } = req.body;
        const fields = [];
        const params = [];

        if (title !== undefined) { fields.push('title = ?'); params.push(title); }
        if (content !== undefined) { fields.push('content = ?'); params.push(content); }
        if (is_published !== undefined) { fields.push('is_published = ?'); params.push(is_published ? 1 : 0); }

        if (fields.length === 0) return res.status(400).json({ code: 400, message: '没有要更新的字段' });

        params.push(slug);
        await db.query(`UPDATE info_pages SET ${fields.join(', ')} WHERE slug = ?`, params);
        res.json({ code: 200, message: '更新成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '更新失败' });
    }
});

/**
 * POST /api/settings/pages
 * 创建新页面（管理员）
 */
router.post('/pages', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { slug, title, content } = req.body;
        if (!slug || !title) return res.status(400).json({ code: 400, message: '标识和标题不能为空' });

        await db.query(
            'INSERT INTO info_pages (slug, title, content) VALUES (?, ?, ?)',
            [slug.trim().toLowerCase(), title.trim(), content || '']
        );
        res.json({ code: 200, message: '创建成功' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ code: 400, message: '页面标识已存在' });
        }
        res.status(500).json({ code: 500, message: '创建失败' });
    }
});

/**
 * DELETE /api/settings/pages/:slug
 * 删除页面（管理员）
 */
router.delete('/pages/:slug', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM info_pages WHERE slug = ?', [req.params.slug]);
        res.json({ code: 200, message: '删除成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

// ========== 信任徽章管理（管理员）==========

/**
 * GET /api/settings/trust-badges/all
 * 获取所有信任徽章（含隐藏的）
 */
router.get('/trust-badges/all', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const badges = await db.query('SELECT * FROM trust_badges ORDER BY sort_order ASC');
        res.json({ code: 200, data: badges });
    } catch (error) {
        res.status(500).json({ code: 500, message: '获取失败' });
    }
});

/**
 * POST /api/settings/trust-badges
 * 创建信任徽章
 */
router.post('/trust-badges', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { title, description, icon_url, sort_order, is_visible } = req.body;
        if (!title) return res.status(400).json({ code: 400, message: '标题不能为空' });

        const result = await db.query(
            'INSERT INTO trust_badges (title, description, icon_url, sort_order, is_visible) VALUES (?, ?, ?, ?, ?)',
            [title.trim(), description || null, icon_url || null, sort_order || 0, is_visible !== undefined ? (is_visible ? 1 : 0) : 1]
        );
        res.json({ code: 200, message: '创建成功', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ code: 500, message: '创建失败' });
    }
});

/**
 * PUT /api/settings/trust-badges/:id
 * 更新信任徽章
 */
router.put('/trust-badges/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, icon_url, sort_order, is_visible } = req.body;
        const fields = [];
        const params = [];

        if (title !== undefined) { fields.push('title = ?'); params.push(title.trim()); }
        if (description !== undefined) { fields.push('description = ?'); params.push(description || null); }
        if (icon_url !== undefined) { fields.push('icon_url = ?'); params.push(icon_url || null); }
        if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(Number(sort_order)); }
        if (is_visible !== undefined) { fields.push('is_visible = ?'); params.push(is_visible ? 1 : 0); }

        if (fields.length === 0) return res.status(400).json({ code: 400, message: '没有要更新的字段' });

        params.push(Number(id));
        await db.query(`UPDATE trust_badges SET ${fields.join(', ')} WHERE id = ?`, params);
        res.json({ code: 200, message: '更新成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '更新失败' });
    }
});

/**
 * DELETE /api/settings/trust-badges/:id
 * 删除信任徽章
 */
router.delete('/trust-badges/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM trust_badges WHERE id = ?', [Number(req.params.id)]);
        res.json({ code: 200, message: '删除成功' });
    } catch (error) {
        res.status(500).json({ code: 500, message: '删除失败' });
    }
});

module.exports = router;
