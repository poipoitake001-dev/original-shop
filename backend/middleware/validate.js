/**
 * ========================================
 * 输入验证中间件
 * Input Validation & Sanitization
 * ========================================
 *
 * 防止 SQL 注入、XSS、类型混淆攻击：
 * - 严格类型检查
 * - 去除未知字段（strip unknown keys）
 * - HTML 实体转义
 * - 长度限制
 */

/**
 * HTML 转义 — 防止 XSS
 */
function escapeHtml(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * 深度清洗对象中的字符串值
 */
function sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'string') return escapeHtml(obj.trim());
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeObject);

    const cleaned = {};
    for (const [key, value] of Object.entries(obj)) {
        // 跳过原型污染攻击的键
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
        cleaned[key] = sanitizeObject(value);
    }
    return cleaned;
}

/**
 * Schema 定义格式：
 * {
 *   fieldName: {
 *     type: 'string' | 'number' | 'boolean' | 'email' | 'array' | 'object',
 *     required: boolean,
 *     min: number (字符串长度或数值),
 *     max: number,
 *     pattern: RegExp,
 *     sanitize: boolean (是否 HTML 转义，默认 true),
 *     allowHtml: boolean (保留原始 HTML，如 Base64 图片)
 *   }
 * }
 */
function validate(schema) {
    return (req, res, next) => {
        const errors = [];
        const cleaned = {};

        for (const [field, rules] of Object.entries(schema)) {
            let value = req.body[field];

            // Required 检查
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} 为必填字段`);
                continue;
            }

            // 可选字段且未提供
            if (value === undefined || value === null) {
                if (rules.default !== undefined) cleaned[field] = rules.default;
                continue;
            }

            // 类型检查
            switch (rules.type) {
                case 'string':
                    if (typeof value !== 'string') {
                        errors.push(`${field} 必须是字符串`);
                        continue;
                    }
                    value = value.trim();
                    if (rules.min && value.length < rules.min) {
                        errors.push(`${field} 长度不能少于 ${rules.min} 个字符`);
                        continue;
                    }
                    if (rules.max && value.length > rules.max) {
                        errors.push(`${field} 长度不能超过 ${rules.max} 个字符`);
                        continue;
                    }
                    if (rules.pattern && !rules.pattern.test(value)) {
                        errors.push(`${field} 格式不正确`);
                        continue;
                    }
                    // HTML 转义（除非明确允许 HTML）
                    if (!rules.allowHtml) {
                        value = escapeHtml(value);
                    }
                    break;

                case 'email':
                    if (typeof value !== 'string') {
                        errors.push(`${field} 必须是字符串`);
                        continue;
                    }
                    value = value.trim().toLowerCase();
                    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        errors.push(`${field} 邮箱格式不正确`);
                        continue;
                    }
                    break;

                case 'number':
                    value = Number(value);
                    if (isNaN(value)) {
                        errors.push(`${field} 必须是数字`);
                        continue;
                    }
                    if (rules.min !== undefined && value < rules.min) {
                        errors.push(`${field} 不能小于 ${rules.min}`);
                        continue;
                    }
                    if (rules.max !== undefined && value > rules.max) {
                        errors.push(`${field} 不能大于 ${rules.max}`);
                        continue;
                    }
                    break;

                case 'boolean':
                    if (typeof value !== 'boolean') {
                        value = value === 'true' || value === 1 || value === '1';
                    }
                    break;

                case 'array':
                    if (!Array.isArray(value)) {
                        errors.push(`${field} 必须是数组`);
                        continue;
                    }
                    break;

                case 'object':
                    if (typeof value !== 'object' || Array.isArray(value)) {
                        errors.push(`${field} 必须是对象`);
                        continue;
                    }
                    break;
            }

            cleaned[field] = value;
        }

        if (errors.length > 0) {
            return res.status(400).json({
                code: 400,
                message: errors[0], // 返回第一个错误
                errors: errors
            });
        }

        // 用验证后的清洁数据替换原始 body（去除未知字段）
        req.body = cleaned;
        next();
    };
}

// ========== 预定义 Schema ==========

const schemas = {
    login: {
        account: { type: 'string', required: true, min: 1, max: 100 },
        password: { type: 'string', required: true, min: 1, max: 100 },
    },

    register: {
        username: { type: 'string', required: true, min: 2, max: 20 },
        email: { type: 'email', required: true },
        password: { type: 'string', required: true, min: 6, max: 100 },
    },

    createOrder: {
        product_id: { type: 'number', required: true, min: 1 },
        quantity: { type: 'number', required: true, min: 1, max: 100 },
        email: { type: 'email', required: true },
        spec: { type: 'string', required: false, max: 100 },
    },

    createProduct: {
        title: { type: 'string', required: true, min: 1, max: 100 },
        category_id: { type: 'number', required: false, min: 1 },
        description: { type: 'string', required: false, max: 500 },
        detail: { type: 'string', required: false, max: 5000 },
        price: { type: 'number', required: true, min: 0 },
        icon: { type: 'string', required: false, max: 50 },
        image_url: { type: 'string', required: false, allowHtml: true }, // Base64 图片
    },

    sendMessage: {
        receiverId: { type: 'number', required: true, min: 1 },
        content: { type: 'string', required: true, min: 1, max: 2000 },
    },

    setPaymentPassword: {
        loginPassword: { type: 'string', required: true, min: 1, max: 100 },
        paymentPassword: { type: 'string', required: true, min: 6, max: 100 },
    },

    withdraw: {
        amount: { type: 'number', required: true, min: 1 },
        paymentMethod: { type: 'string', required: true, max: 20 },
        accountName: { type: 'string', required: true, min: 1, max: 100 },
        accountNumber: { type: 'string', required: true, min: 1, max: 100 },
        paymentPassword: { type: 'string', required: true, min: 1, max: 100 },
    },
};

/**
 * 全局 body 清洗中间件（防止原型污染 + XSS）
 */
function sanitizeBody(req, res, next) {
    if (req.body && typeof req.body === 'object') {
        // 防止原型污染
        delete req.body.__proto__;
        delete req.body.constructor;
        delete req.body.prototype;
    }
    next();
}

module.exports = {
    validate,
    schemas,
    sanitizeBody,
    escapeHtml,
    sanitizeObject
};
