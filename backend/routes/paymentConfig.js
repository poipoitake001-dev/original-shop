/**
 * ========================================
 * 支付配置路由
 * Payment Configuration Routes
 * ========================================
 * 
 * 包含：
 * - 获取支付配置
 * - 更新支付配置（需要支付密码验证令牌）
 * 
 * 支付系统：
 * - System 1: API 网关支付（如易支付、彩虹易支付等）
 * - System 2: 手动二维码支付
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { verifyPaymentToken } = require('./adminSecurity');

/**
 * GET /
 * 获取支付配置
 * 敏感信息（如 key）会被掩码处理
 * 禁用缓存以确保获取最新数据
 */
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
    // 禁用缓存
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    try {
        console.log('[GET /payment-config] 获取支付配置...');
        
        let configs = await db.query('SELECT * FROM payment_config WHERE id = 1');
        console.log('[GET /payment-config] 查询结果:', configs ? configs.length : 0, '条记录');

        if (!configs || configs.length === 0) {
            console.log('[GET /payment-config] 配置不存在，创建默认配置...');
            // 如果不存在，插入默认配置
            await db.query(`
                INSERT INTO payment_config (id, system1_enabled, system1_config, system2_enabled, system2_config)
                VALUES (1, 0, '{"apiUrl":"","pid":"","key":"","notifyUrl":""}', 0, '{"qrCodeImageUrl":"","instructionText":"请使用微信或支付宝扫描二维码完成支付"}')
            `);

            return res.json({
                code: 200,
                data: {
                    system1_enabled: false,
                    system1_config: {
                        apiUrl: '',
                        pid: '',
                        key: '',
                        notifyUrl: ''
                    },
                    system2_enabled: false,
                    system2_config: {
                        qrCodeImageUrl: '',
                        instructionText: '请使用微信或支付宝扫描二维码完成支付'
                    }
                }
            });
        }

        const config = configs[0];

        // 解析 JSON 配置
        let system1Config = {};
        let system2Config = {};

        try {
            system1Config = typeof config.system1_config === 'string' 
                ? JSON.parse(config.system1_config) 
                : (config.system1_config || {});
        } catch (e) {
            console.error('[GET /payment-config] 解析 system1_config 失败:', e.message);
            system1Config = { apiUrl: '', pid: '', key: '', notifyUrl: '' };
        }

        try {
            system2Config = typeof config.system2_config === 'string' 
                ? JSON.parse(config.system2_config) 
                : (config.system2_config || {});
        } catch (e) {
            console.error('[GET /payment-config] 解析 system2_config 失败:', e.message);
            system2Config = { qrCodeImageUrl: '', instructionText: '' };
        }

        // 掩码处理敏感的 key
        const maskedKey = system1Config.key 
            ? system1Config.key.substring(0, 4) + '****' + system1Config.key.substring(system1Config.key.length - 4)
            : '';

        console.log('[GET /payment-config] 返回配置:', {
            system1_enabled: !!config.system1_enabled,
            system2_enabled: !!config.system2_enabled,
            hasQrCode: !!system2Config.qrCodeImageUrl
        });

        res.json({
            code: 200,
            data: {
                system1_enabled: !!config.system1_enabled,
                system1_config: {
                    apiUrl: system1Config.apiUrl || '',
                    pid: system1Config.pid || '',
                    key: maskedKey,
                    keySet: !!system1Config.key,
                    notifyUrl: system1Config.notifyUrl || ''
                },
                system2_enabled: !!config.system2_enabled,
                system2_config: {
                    qrCodeImageUrl: system2Config.qrCodeImageUrl || '',
                    instructionText: system2Config.instructionText || '请使用微信或支付宝扫描二维码完成支付'
                },
                updated_at: config.updated_at
            }
        });

    } catch (error) {
        console.error('[GET /payment-config] 错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误: ' + error.message
        });
    }
});

/**
 * GET /full
 * 获取完整支付配置（包含未掩码的敏感信息）
 * 需要支付密码验证令牌
 */
router.get('/full', verifyToken, verifyAdmin, verifyPaymentToken, async (req, res) => {
    try {
        const configs = await db.query('SELECT * FROM payment_config WHERE id = 1');

        if (!configs || configs.length === 0) {
            return res.json({
                code: 200,
                data: {
                    system1_enabled: false,
                    system1_config: {
                        apiUrl: '',
                        pid: '',
                        key: '',
                        notifyUrl: ''
                    },
                    system2_enabled: false,
                    system2_config: {
                        qrCodeImageUrl: '',
                        instructionText: '请使用微信或支付宝扫描二维码完成支付'
                    }
                }
            });
        }

        const config = configs[0];

        // 解析 JSON 配置
        let system1Config = {};
        let system2Config = {};

        try {
            system1Config = typeof config.system1_config === 'string' 
                ? JSON.parse(config.system1_config) 
                : (config.system1_config || {});
        } catch (e) {
            system1Config = { apiUrl: '', pid: '', key: '', notifyUrl: '' };
        }

        try {
            system2Config = typeof config.system2_config === 'string' 
                ? JSON.parse(config.system2_config) 
                : (config.system2_config || {});
        } catch (e) {
            system2Config = { qrCodeImageUrl: '', instructionText: '' };
        }

        res.json({
            code: 200,
            data: {
                system1_enabled: !!config.system1_enabled,
                system1_config: system1Config,
                system2_enabled: !!config.system2_enabled,
                system2_config: system2Config,
                updated_at: config.updated_at
            }
        });

    } catch (error) {
        console.error('获取完整支付配置失败:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

/**
 * PUT /
 * 更新支付配置
 * 需要支付密码验证令牌
 * 使用 MySQL UPSERT (INSERT ... ON DUPLICATE KEY UPDATE) 确保数据持久化
 */
router.put('/', verifyToken, verifyAdmin, verifyPaymentToken, async (req, res) => {
    console.log('========== [PUT /payment-config] 开始 ==========');
    
    try {
        // 1. 验证 X-Payment-Token（已由 verifyPaymentToken 中间件处理）
        console.log('[PUT] 支付令牌验证通过');
        console.log('[PUT] 请求用户 ID:', req.user?.id);
        
        const { 
            system1_enabled, 
            system1_config, 
            system2_enabled, 
            system2_config 
        } = req.body;

        console.log('[PUT] 接收到的数据:', {
            system1_enabled,
            system2_enabled,
            system1_config: system1_config ? '存在' : '不存在',
            system2_config: system2_config ? '存在' : '不存在',
            system2_qrCodeLength: system2_config?.qrCodeImageUrl?.length || 0
        });

        // 2. 验证输入数据结构
        if (system1_config !== undefined && typeof system1_config !== 'object') {
            console.error('[PUT] system1_config 类型错误');
            return res.status(400).json({
                code: 400,
                message: 'system1_config 必须是对象'
            });
        }

        if (system2_config !== undefined && typeof system2_config !== 'object') {
            console.error('[PUT] system2_config 类型错误');
            return res.status(400).json({
                code: 400,
                message: 'system2_config 必须是对象'
            });
        }

        // 3. 获取当前配置以进行合并
        console.log('[PUT] 获取当前配置...');
        const currentConfigs = await db.query('SELECT * FROM payment_config WHERE id = 1');
        console.log('[PUT] 当前配置存在:', currentConfigs && currentConfigs.length > 0);
        
        let currentSystem1Config = {};
        let currentSystem2Config = {};

        if (currentConfigs && currentConfigs.length > 0) {
            try {
                currentSystem1Config = typeof currentConfigs[0].system1_config === 'string'
                    ? JSON.parse(currentConfigs[0].system1_config)
                    : (currentConfigs[0].system1_config || {});
            } catch (e) {
                console.warn('[PUT] 解析当前 system1_config 失败:', e.message);
                currentSystem1Config = {};
            }

            try {
                currentSystem2Config = typeof currentConfigs[0].system2_config === 'string'
                    ? JSON.parse(currentConfigs[0].system2_config)
                    : (currentConfigs[0].system2_config || {});
            } catch (e) {
                console.warn('[PUT] 解析当前 system2_config 失败:', e.message);
                currentSystem2Config = {};
            }
        }

        // 4. 合并配置（只更新提供的字段）
        const newSystem1Config = system1_config 
            ? { ...currentSystem1Config, ...system1_config }
            : currentSystem1Config;

        const newSystem2Config = system2_config 
            ? { ...currentSystem2Config, ...system2_config }
            : currentSystem2Config;

        // 如果 key 为空字符串或未提供，保留原有 key
        if (system1_config && (system1_config.key === '' || system1_config.key === undefined)) {
            newSystem1Config.key = currentSystem1Config.key || '';
        }

        // 5. 序列化配置
        const system1ConfigStr = JSON.stringify(newSystem1Config);
        const system2ConfigStr = JSON.stringify(newSystem2Config);
        
        // 确定最终的 enabled 状态
        const finalSystem1Enabled = system1_enabled !== undefined 
            ? (system1_enabled ? 1 : 0) 
            : (currentConfigs && currentConfigs.length > 0 ? currentConfigs[0].system1_enabled : 0);
        
        const finalSystem2Enabled = system2_enabled !== undefined 
            ? (system2_enabled ? 1 : 0) 
            : (currentConfigs && currentConfigs.length > 0 ? currentConfigs[0].system2_enabled : 0);

        console.log('[PUT] 准备保存:', {
            system1_enabled: finalSystem1Enabled,
            system2_enabled: finalSystem2Enabled,
            system1_config_length: system1ConfigStr.length,
            system2_config_length: system2ConfigStr.length
        });

        // 6. 使用 MySQL UPSERT 语法 - INSERT ... ON DUPLICATE KEY UPDATE
        // 这确保了无论记录是否存在，都能正确保存
        const upsertSQL = `
            INSERT INTO payment_config (id, system1_enabled, system1_config, system2_enabled, system2_config, updated_at)
            VALUES (1, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                system1_enabled = VALUES(system1_enabled),
                system1_config = VALUES(system1_config),
                system2_enabled = VALUES(system2_enabled),
                system2_config = VALUES(system2_config),
                updated_at = NOW()
        `;

        console.log('[PUT] 执行 UPSERT SQL...');
        const result = await db.query(upsertSQL, [
            finalSystem1Enabled,
            system1ConfigStr,
            finalSystem2Enabled,
            system2ConfigStr
        ]);
        
        console.log('[PUT] SQL 执行结果:', {
            affectedRows: result?.affectedRows,
            insertId: result?.insertId,
            changedRows: result?.changedRows
        });

        // 7. 验证保存结果
        console.log('[PUT] 验证保存结果...');
        const verifyResult = await db.query('SELECT id, system1_enabled, system2_enabled, updated_at FROM payment_config WHERE id = 1');
        
        if (!verifyResult || verifyResult.length === 0) {
            console.error('[PUT] 验证失败：保存后无法找到记录');
            return res.status(500).json({
                code: 500,
                message: '保存验证失败：记录未找到'
            });
        }
        
        console.log('[PUT] 验证成功:', {
            system1_enabled: verifyResult[0].system1_enabled,
            system2_enabled: verifyResult[0].system2_enabled,
            updated_at: verifyResult[0].updated_at
        });

        console.log('========== [PUT /payment-config] 保存成功 ==========');

        // 8. 返回成功响应
        res.json({
            code: 200,
            message: '支付配置更新成功',
            data: {
                system1_enabled: !!verifyResult[0].system1_enabled,
                system2_enabled: !!verifyResult[0].system2_enabled,
                updated_at: verifyResult[0].updated_at
            }
        });

    } catch (error) {
        console.error('========== [PUT /payment-config] 错误 ==========');
        console.error('[PUT] 错误类型:', error.name);
        console.error('[PUT] 错误消息:', error.message);
        console.error('[PUT] 错误堆栈:', error.stack);
        
        res.status(500).json({
            code: 500,
            message: '服务器错误: ' + error.message
        });
    }
});

/**
 * GET /public
 * 获取公开的支付配置（用于前端结账页面）
 * 不需要管理员权限
 * 禁用缓存以确保获取最新配置
 */
router.get('/public', async (req, res) => {
    // 禁用缓存 - 确保前端每次都获取最新配置
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    });
    
    try {
        console.log('[GET /payment-config/public] 获取公开支付配置...');
        
        const configs = await db.query('SELECT * FROM payment_config WHERE id = 1');

        if (!configs || configs.length === 0) {
            console.log('[GET /payment-config/public] 配置不存在，返回默认值');
            return res.json({
                code: 200,
                data: {
                    system1Available: false,
                    system2Available: false
                }
            });
        }

        const config = configs[0];

        // 解析 system2 配置获取二维码信息
        let system2Config = {};
        try {
            system2Config = typeof config.system2_config === 'string'
                ? JSON.parse(config.system2_config)
                : (config.system2_config || {});
        } catch (e) {
            console.error('[GET /payment-config/public] 解析 system2_config 失败:', e.message);
            system2Config = {};
        }

        console.log('[GET /payment-config/public] 返回配置:', {
            system1Available: !!config.system1_enabled,
            system2Available: !!config.system2_enabled,
            hasQrCode: !!system2Config.qrCodeImageUrl,
            qrCodeLength: system2Config.qrCodeImageUrl?.length || 0
        });

        res.json({
            code: 200,
            data: {
                system1Available: !!config.system1_enabled,
                system2Available: !!config.system2_enabled,
                // 只暴露二维码支付的公开信息
                system2: config.system2_enabled ? {
                    qrCodeImageUrl: system2Config.qrCodeImageUrl || '',
                    instructionText: system2Config.instructionText || '请使用微信或支付宝扫描二维码完成支付'
                } : null
            }
        });

    } catch (error) {
        console.error('[GET /payment-config/public] 错误:', error);
        res.status(500).json({
            code: 500,
            message: '服务器错误'
        });
    }
});

module.exports = router;
