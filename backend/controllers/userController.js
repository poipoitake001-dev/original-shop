/**
 * ========================================
 * 用户控制器
 * User Controller
 * ========================================
 */

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../middleware/auth');

/**
 * 用户注册
 * POST /api/users/register
 */
async function register(req, res) {
    try {
        const { username, email, password } = req.body;
        
        // 参数验证
        if (!username || !email || !password) {
            return res.status(400).json({
                code: 400,
                message: '用户名、邮箱和密码不能为空'
            });
        }
        
        // 用户名长度验证
        if (username.length < 3 || username.length > 20) {
            return res.status(400).json({
                code: 400,
                message: '用户名长度需要在3-20个字符之间'
            });
        }
        
        // 邮箱格式验证
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                code: 400,
                message: '邮箱格式不正确'
            });
        }
        
        // 密码长度验证
        if (password.length < 6) {
            return res.status(400).json({
                code: 400,
                message: '密码长度不能少于6位'
            });
        }
        
        // 检查用户名是否已存在
        const existingUsername = await db.query(
            'SELECT id FROM users WHERE username = ?',
            [String(username)]
        );
        if (existingUsername.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '用户名已被注册'
            });
        }
        
        // 检查邮箱是否已存在
        const existingEmail = await db.query(
            'SELECT id FROM users WHERE email = ?',
            [String(email)]
        );
        if (existingEmail.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '邮箱已被注册'
            });
        }
        
        // 密码加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // 插入用户
        const userId = await db.insert(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [String(username), String(email), hashedPassword]
        );
        
        // 生成token
        const token = generateToken({
            id: userId,
            username: username,
            email: email,
            role: 'user'
        });
        
        res.status(201).json({
            code: 200,
            message: '注册成功',
            data: {
                token: token,
                user: {
                    id: userId,
                    username: username,
                    email: email,
                    role: 'user'
                }
            }
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({
            code: 500,
            message: '注册失败：' + error.message
        });
    }
}

/**
 * 用户登录
 * POST /api/users/login
 */
async function login(req, res) {
    try {
        const { account, password } = req.body;
        
        // 参数验证
        if (!account || !password) {
            return res.status(400).json({
                code: 400,
                message: '账号和密码不能为空'
            });
        }
        
        // 查找用户（支持用户名或邮箱登录）
        const users = await db.query(
            'SELECT id, username, email, password, avatar, role, seller_status, status FROM users WHERE username = ? OR email = ?',
            [String(account), String(account)]
        );
        
        if (users.length === 0) {
            return res.status(401).json({
                code: 401,
                message: '账号或密码错误'
            });
        }
        
        const user = users[0];
        
        // 检查账户状态
        if (user.status === 0) {
            return res.status(403).json({
                code: 403,
                message: '账户已被禁用'
            });
        }
        
        // 验证密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                code: 401,
                message: '账号或密码错误'
            });
        }
        
        // 生成token（包含卖家状态）
        const token = generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            sellerStatus: user.seller_status || 'none'
        });
        
        res.json({
            code: 200,
            message: '登录成功',
            data: {
                token: token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    avatar: user.avatar,
                    role: user.role,
                    sellerStatus: user.seller_status || 'none'
                }
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({
            code: 500,
            message: '登录失败：' + error.message
        });
    }
}

/**
 * 获取当前用户信息
 * GET /api/users/profile
 */
async function getProfile(req, res) {
    try {
        const userId = req.user.id;
        
        const users = await db.query(
            `SELECT id, username, email, avatar, role, seller_status, commission_rate,
                    is_student_verified, can_skip_audit, rating, review_count,
                    nickname, avatar_url, campus, dormitory, class_name, major,
                    sold_count, bought_count, dispute_count,
                    good_review_count, badge_excellent_seller, badge_excellent_buyer,
                    created_at
             FROM users WHERE id = ?`,
            [Number(userId)]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        const userData = users[0];
        
        // 如果是卖家，查询钱包信息
        let wallet = null;
        if (userData.role === 'seller' || userData.role === 'admin') {
            const wallets = await db.query(
                'SELECT balance, frozen_balance, total_earned, total_withdrawn FROM wallets WHERE user_id = ?',
                [Number(userId)]
            );
            if (wallets.length > 0) {
                wallet = wallets[0];
            }
        }
        
        // 显示名称 fallback: nickname -> username -> 邮箱脱敏
        const maskedEmail = userData.email ? userData.email.replace(/^(.{2})(.*)(@.*)$/, '$1***$3') : '';
        const displayName = userData.nickname || userData.username || maskedEmail;

        res.json({
            code: 200,
            message: 'success',
            data: {
                ...userData,
                displayName,
                nickname: userData.nickname || null,
                avatarUrl: userData.avatar_url || userData.avatar || null,
                sellerStatus: userData.seller_status || 'none',
                commissionRate: userData.commission_rate || 0.05,
                isStudentVerified: !!userData.is_student_verified,
                canSkipAudit: !!userData.can_skip_audit,
                rating: userData.rating || 5.0,
                reviewCount: userData.review_count || 0,
                soldCount: userData.sold_count || 0,
                boughtCount: userData.bought_count || 0,
                disputeCount: userData.dispute_count || 0,
                goodReviewCount: userData.good_review_count || 0,
                badgeExcellentSeller: !!userData.badge_excellent_seller,
                badgeExcellentBuyer: !!userData.badge_excellent_buyer,
                campus: userData.campus || null,
                dormitory: userData.dormitory || null,
                className: userData.class_name || null,
                major: userData.major || null,
                wallet: wallet
            }
        });
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取用户信息失败：' + error.message
        });
    }
}

/**
 * 修改密码
 * PUT /api/users/password
 */
async function changePassword(req, res) {
    try {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
        
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                code: 400,
                message: '原密码和新密码不能为空'
            });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({
                code: 400,
                message: '新密码长度不能少于6位'
            });
        }
        
        // 获取用户当前密码
        const users = await db.query(
            'SELECT password FROM users WHERE id = ?',
            [Number(userId)]
        );
        
        if (users.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '用户不存在'
            });
        }
        
        // 验证原密码
        const isMatch = await bcrypt.compare(oldPassword, users[0].password);
        if (!isMatch) {
            return res.status(400).json({
                code: 400,
                message: '原密码错误'
            });
        }
        
        // 加密新密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // 更新密码
        await db.update(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, Number(userId)]
        );
        
        res.json({
            code: 200,
            message: '密码修改成功'
        });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({
            code: 500,
            message: '修改密码失败：' + error.message
        });
    }
}

/**
 * 提交学生认证申请
 * POST /api/user/verify-student
 * 
 * 用户上传学生证/身份证照片，管理员后台审核
 * 审核通过后 is_student_verified = true
 */
async function submitStudentVerification(req, res) {
    try {
        const userId = req.user.id;
        const { id_photo_url, real_name, student_id_number } = req.body;

        if (!id_photo_url) {
            return res.status(400).json({
                code: 400,
                message: '请上传学生证或身份证照片'
            });
        }

        // 检查用户是否已通过认证
        const users = await db.query(
            'SELECT is_student_verified FROM users WHERE id = ?',
            [Number(userId)]
        );
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }
        if (users[0].is_student_verified) {
            return res.status(400).json({ code: 400, message: '您已通过学生认证，无需重复提交' });
        }

        // 检查是否有待审核的申请
        const pendingApps = await db.query(
            "SELECT id FROM student_verifications WHERE user_id = ? AND status = 'pending'",
            [Number(userId)]
        );
        if (pendingApps.length > 0) {
            return res.status(400).json({ code: 400, message: '您已有一个待审核的认证申请，请耐心等待' });
        }

        // 创建认证申请
        await db.insert(
            'INSERT INTO student_verifications (user_id, real_name, student_id_number, id_photo_url) VALUES (?, ?, ?, ?)',
            [Number(userId), real_name || null, student_id_number || null, id_photo_url]
        );

        res.status(201).json({
            code: 200,
            message: '学生认证申请已提交，请等待管理员审核'
        });
    } catch (error) {
        console.error('提交学生认证失败:', error);
        res.status(500).json({
            code: 500,
            message: '提交学生认证失败：' + error.message
        });
    }
}

/**
 * 获取学生认证状态
 * GET /api/user/verify-student/status
 */
async function getStudentVerificationStatus(req, res) {
    try {
        const userId = req.user.id;

        const users = await db.query(
            'SELECT is_student_verified FROM users WHERE id = ?',
            [Number(userId)]
        );
        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        // 获取最近一条申请
        const apps = await db.query(
            'SELECT id, real_name, student_id_number, id_photo_url, status, admin_note, created_at, reviewed_at FROM student_verifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
            [Number(userId)]
        );

        res.json({
            code: 200,
            data: {
                isStudentVerified: !!users[0].is_student_verified,
                application: apps.length > 0 ? apps[0] : null
            }
        });
    } catch (error) {
        console.error('获取学生认证状态失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取学生认证状态失败：' + error.message
        });
    }
}

/**
 * 更新个人资料
 * PATCH /api/users/profile
 * body: { nickname, avatarUrl, campus, dormitory, className, major }
 * 校区（campus）为必填。
 */
async function updateProfile(req, res) {
    try {
        const userId = req.user.id;
        const { nickname, avatarUrl, campus, dormitory, className, major } = req.body;

        const updateFields = [];
        const params = [];

        if (nickname !== undefined) {
            if (nickname && (nickname.length < 1 || nickname.length > 50)) {
                return res.status(400).json({ code: 400, message: '昵称长度需要在1-50个字符之间' });
            }
            updateFields.push('nickname = ?');
            params.push(nickname || null);
        }

        if (avatarUrl !== undefined) {
            if (avatarUrl && avatarUrl.length > 500) {
                return res.status(400).json({ code: 400, message: '头像URL长度不能超过500个字符' });
            }
            updateFields.push('avatar_url = ?');
            params.push(avatarUrl || null);
        }

        if (campus !== undefined) {
            const campusStr = typeof campus === 'string' ? campus.trim() : '';
            if (!campusStr) {
                return res.status(400).json({ code: 400, message: '校区为必填项' });
            }
            if (campusStr.length > 100) {
                return res.status(400).json({ code: 400, message: '校区长度不能超过100个字符' });
            }
            updateFields.push('campus = ?');
            params.push(campusStr);
        }

        if (dormitory !== undefined) {
            const val = (dormitory && String(dormitory).trim()) || null;
            if (val && val.length > 100) {
                return res.status(400).json({ code: 400, message: '宿舍楼长度不能超过100个字符' });
            }
            updateFields.push('dormitory = ?');
            params.push(val);
        }

        if (className !== undefined) {
            const val = (className && String(className).trim()) || null;
            if (val && val.length > 100) {
                return res.status(400).json({ code: 400, message: '班级长度不能超过100个字符' });
            }
            updateFields.push('class_name = ?');
            params.push(val);
        }

        if (major !== undefined) {
            const val = (major && String(major).trim()) || null;
            if (val && val.length > 100) {
                return res.status(400).json({ code: 400, message: '专业长度不能超过100个字符' });
            }
            updateFields.push('major = ?');
            params.push(val);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ code: 400, message: '没有可更新的字段' });
        }

        params.push(Number(userId));
        await db.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            params
        );

        res.json({
            code: 200,
            message: '个人资料更新成功'
        });
    } catch (error) {
        console.error('更新个人资料失败:', error);
        res.status(500).json({
            code: 500,
            message: '更新个人资料失败：' + error.message
        });
    }
}

/**
 * 获取用户公开信息
 * GET /api/users/:id/public
 * 返回安全信息：nickname, avatar, stats, verification status, active products
 */
async function getPublicProfile(req, res) {
    try {
        const { id } = req.params;

        const users = await db.query(
            `SELECT id, username, nickname, avatar, avatar_url,
                    is_student_verified, can_skip_audit, rating, review_count,
                    sold_count, bought_count, good_review_count,
                    badge_excellent_seller, badge_excellent_buyer,
                    created_at
             FROM users WHERE id = ? AND status = 1`,
            [Number(id)]
        );

        if (users.length === 0) {
            return res.status(404).json({ code: 404, message: '用户不存在' });
        }

        const user = users[0];

        // 显示名称 fallback: nickname -> username
        const displayName = user.nickname || user.username;
        const avatarUrl = user.avatar_url || user.avatar || null;

        // 查询该用户的在售商品（仅审核通过的）
        const products = await db.query(
            `SELECT id, title, description, price, image_url, type, stock, sales, want_count, view_count, delivery_type, created_at
             FROM products
             WHERE seller_id = ? AND audit_status = 'approved' AND status = 1
             ORDER BY created_at DESC LIMIT 20`,
            [Number(id)]
        );

        res.json({
            code: 200,
            data: {
                id: user.id,
                displayName,
                avatarUrl,
                isStudentVerified: !!user.is_student_verified,
                rating: user.rating || 5.0,
                reviewCount: user.review_count || 0,
                soldCount: user.sold_count || 0,
                boughtCount: user.bought_count || 0,
                goodReviewCount: user.good_review_count || 0,
                badgeExcellentSeller: !!user.badge_excellent_seller,
                badgeExcellentBuyer: !!user.badge_excellent_buyer,
                joinedAt: user.created_at,
                products,
            }
        });
    } catch (error) {
        console.error('获取用户公开信息失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取用户公开信息失败：' + error.message
        });
    }
}

module.exports = {
    register,
    login,
    getProfile,
    changePassword,
    updateProfile,
    getPublicProfile,
    submitStudentVerification,
    getStudentVerificationStatus
};
