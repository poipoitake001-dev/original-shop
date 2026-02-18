/**
 * ========================================
 * 速率限制中间件（内存滑动窗口）
 * Rate Limiting Middleware
 * ========================================
 *
 * 无需 Redis，使用内存 Map 实现滑动窗口限速。
 * 适用于单实例部署（Railway 等）。
 *
 * 规则：
 * - 全局：每个 IP 10秒内最多 20 次请求（防爬虫）
 * - 认证路由：每个 IP 每分钟最多 5 次（防暴力破解）
 * - 订单路由：每个 IP 每分钟最多 10 次（防库存锁定攻击）
 */

// 滑动窗口限速器
class SlidingWindowLimiter {
    constructor() {
        this.windows = new Map(); // key -> { count, resetAt }
        // 每 60 秒清理过期条目，防止内存泄漏
        this.cleanupTimer = setInterval(() => this.cleanup(), 60000);
    }

    /**
     * 检查请求是否被限制
     * @param {string} key - 限速键（通常是 IP 或 IP+路径）
     * @param {number} limit - 窗口内最大请求数
     * @param {number} windowMs - 窗口时间（毫秒）
     * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
     */
    check(key, limit, windowMs) {
        const now = Date.now();
        let entry = this.windows.get(key);

        if (!entry || now > entry.resetAt) {
            // 窗口已过期或不存在，创建新窗口
            entry = { count: 1, resetAt: now + windowMs };
            this.windows.set(key, entry);
            return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
        }

        entry.count++;

        if (entry.count > limit) {
            return { allowed: false, remaining: 0, resetAt: entry.resetAt };
        }

        return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
    }

    cleanup() {
        const now = Date.now();
        for (const [key, entry] of this.windows) {
            if (now > entry.resetAt) {
                this.windows.delete(key);
            }
        }
    }
}

const limiter = new SlidingWindowLimiter();

/**
 * 获取客户端真实 IP
 * 注意：仅在信任反向代理时使用 x-forwarded-for
 */
function getClientIP(req) {
    // 优先使用 Express 的 req.ip（受 trust proxy 设置控制）
    // 如果配置了 trust proxy，req.ip 会正确解析 x-forwarded-for
    // 如果没配置，req.ip 返回直连 IP，防止伪造
    return req.ip || 
           req.connection?.remoteAddress ||
           'unknown';
}

/**
 * 创建限速中间件
 * @param {number} limit - 窗口内最大请求数
 * @param {number} windowSeconds - 窗口时间（秒）
 * @param {string} prefix - 键前缀（区分不同规则）
 */
function createRateLimiter(limit, windowSeconds, prefix = 'general') {
    const windowMs = windowSeconds * 1000;

    return (req, res, next) => {
        const ip = getClientIP(req);
        const key = `${prefix}:${ip}`;
        const result = limiter.check(key, limit, windowMs);

        // 设置限速响应头
        res.setHeader('X-RateLimit-Limit', limit);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, result.remaining));
        res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000));

        if (!result.allowed) {
            console.warn(`[RateLimit] ${prefix} 限制触发: IP=${ip}, 路径=${req.path}`);
            return res.status(429).json({
                code: 429,
                error: 'Too many requests, please try again later.',
                message: '请求过于频繁，请稍后再试',
                retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
            });
        }

        next();
    };
}

// ========== 预设规则 ==========

// 规则 1：全局限速 — 每个 IP 10秒内最多 20 次请求
const globalLimiter = createRateLimiter(20, 10, 'global');

// 规则 2：认证路由 — 每个 IP 每分钟最多 5 次（防暴力破解）
const authLimiter = createRateLimiter(5, 60, 'auth');

// 规则 3：订单路由 — 每个 IP 每分钟最多 10 次（防库存锁定）
const orderLimiter = createRateLimiter(10, 60, 'order');

// 规则 4：消息发送 — 每个 IP 每分钟最多 15 次
const messageLimiter = createRateLimiter(15, 60, 'message');

module.exports = {
    globalLimiter,
    authLimiter,
    orderLimiter,
    messageLimiter,
    createRateLimiter
};
