/**
 * ========================================
 * 太空主题电商发卡网 - 后端服务入口
 * Space Card Shop - Backend Server
 * Updated: 2026-02-05
 * ========================================
 */

const express = require('express');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const { initDatabase } = require('./config/initDB');

// 导入路由
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const authRoutes = require('./routes/auth');
const announcementRoutes = require('./routes/announcements');
const categoryRoutes = require('./routes/categories');
const settingsRoutes = require('./routes/settings');
const customerRoutes = require('./routes/customer');
const paymentRoutes = require('./routes/payment');
const cardkeysRoutes = require('./routes/cardkeys');
const adminSecurityRoutes = require('./routes/adminSecurity');
const paymentConfigRoutes = require('./routes/paymentConfig');
const sellerRoutes = require('./routes/seller');
const adminSellerRoutes = require('./routes/adminSeller');
const userSecurityRoutes = require('./routes/userSecurity');
const messageRoutes = require('./routes/messages');
const cronRoutes = require('./routes/cron');
const seoRoutes = require('./routes/seo');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const seoMetaMiddleware = require('./middleware/seoMeta');
const { verifyToken, verifyAdmin } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ========== CORS 配置 - 必须放在最前面 ==========

// 处理所有 OPTIONS 预检请求（最高优先级）
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Payment-Token');
    res.header('Access-Control-Max-Age', '86400');
    res.sendStatus(204);
});

// 所有请求添加 CORS 头
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Payment-Token');
    next();
});

// JSON 解析（增加限制以支持 Base64 图片上传）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== 安全头 (Helmet) ==========
const helmet = require('helmet');
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdnjs.cloudflare.com", "https://www.googletagmanager.com", "https://hm.baidu.com"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            connectSrc: ["'self'", "https:", "wss:"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
        }
    },
    crossOriginEmbedderPolicy: false,  // 允许加载跨域图片
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'origin-when-cross-origin' },
}));

// ========== 输入清洗 ==========
const { sanitizeBody } = require('./middleware/validate');
app.use(sanitizeBody);

// ========== 速率限制 ==========
const { globalLimiter, authLimiter, orderLimiter, messageLimiter } = require('./middleware/rateLimit');

// 全局限速：所有 API 请求（10秒/20次）
app.use('/api', globalLimiter);

// 认证路由加强限速（每分钟/5次）
app.use('/api/auth/login', authLimiter);
app.use('/api/customer/login', authLimiter);
app.use('/api/customer/register', authLimiter);
app.use('/api/user/security/verify-security-question', authLimiter);
app.use('/api/user/security/reset-password-via-security', authLimiter);

// 订单路由限速（每分钟/10次）
app.use('/api/orders', orderLimiter);

// 消息发送限速（每分钟/15次）
app.use('/api/messages/send', messageLimiter);

// 静态文件服务（仅用于生产环境的 dist 目录）
const distPath = path.join(__dirname, '../frontend/dist');
const fs = require('fs');

// 检查是否存在编译后的前端文件
const hasBuiltFrontend = fs.existsSync(distPath);

if (hasBuiltFrontend) {
    // assets/ 目录下是 Vite 打包的带 hash 文件名，可以长缓存
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
        maxAge: '1y',
        immutable: true
    }));
    app.use(express.static(distPath));
}

// 请求日志
app.use((req, res, next) => {
    const time = new Date().toLocaleString('zh-CN');
    console.log(`[${time}] ${req.method} ${req.url}`);
    next();
});

// ========== SEO 路由（sitemap.xml, robots.txt）==========

app.use('/', seoRoutes);

// ========== API 路由 ==========

app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/cardkeys', cardkeysRoutes);
app.use('/api/admin/security', adminSecurityRoutes);
app.use('/api/admin/payment-config', paymentConfigRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/admin/seller', adminSellerRoutes);
app.use('/api/user/security', userSecurityRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);

// 管理后台统计（管理员）
app.get('/api/system/status', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const [p] = await db.query('SELECT COUNT(*) AS count FROM products');
        const [o] = await db.query('SELECT COUNT(*) AS count FROM orders');
        const [u] = await db.query("SELECT COUNT(*) AS count FROM users WHERE role != 'admin'");
        
        // 计算已支付订单的总收入
        const revenueResult = await db.query(
            "SELECT COALESCE(SUM(total_price), 0) AS total FROM orders WHERE status IN ('paid', 'delivered', 'completed')"
        );
        const totalRevenue = revenueResult[0]?.total ?? 0;
        
        // 获取低库存商品（库存 < 5）
        const lowStockProducts = await db.query(
            'SELECT id, title, stock FROM products WHERE stock < 5 AND status = 1 ORDER BY stock ASC LIMIT 10'
        );
        
        // 待处理计数
        const [pendingWithdrawals] = await db.query("SELECT COUNT(*) AS c FROM withdrawal_requests WHERE status IN ('pending','processing')").catch(() => [{ c: 0 }]);
        const [pendingSellers] = await db.query("SELECT COUNT(*) AS c FROM seller_applications WHERE status = 'pending'").catch(() => [{ c: 0 }]);
        const [pendingProducts] = await db.query("SELECT COUNT(*) AS c FROM products WHERE audit_status = 'pending' AND seller_id IS NOT NULL").catch(() => [{ c: 0 }]);
        const [pendingOrders] = await db.query("SELECT COUNT(*) AS c FROM orders WHERE status = 'pending'").catch(() => [{ c: 0 }]);
        const [unreadMsgs] = await db.query("SELECT COUNT(*) AS c FROM messages WHERE receiver_id = ? AND is_read = 0", [req.user.id]).catch(() => [{ c: 0 }]);
        const [pendingStudentVerify] = await db.query("SELECT COUNT(*) AS c FROM student_verifications WHERE status = 'pending'").catch(() => [{ c: 0 }]);

        // 7天收入趋势
        const revenueTrend = await db.query(
            "SELECT DATE(pay_time) AS day, COALESCE(SUM(total_price), 0) AS revenue, COUNT(*) AS orders FROM orders WHERE status IN ('paid','delivered','completed') AND pay_time >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(pay_time) ORDER BY day ASC"
        ).catch(() => []);

        // 7天新用户
        const userGrowth = await db.query(
            "SELECT DATE(created_at) AS day, COUNT(*) AS count FROM users WHERE role != 'admin' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY day ASC"
        ).catch(() => []);

        // 今日统计
        const [todayRevenue] = await db.query(
            "SELECT COALESCE(SUM(total_price), 0) AS total, COUNT(*) AS cnt FROM orders WHERE status IN ('paid','delivered','completed') AND pay_time >= CURDATE()"
        ).catch(() => [{ total: 0, cnt: 0 }]);

        res.json({
            code: 200,
            data: {
                products: p?.count ?? 0,
                orders: o?.count ?? 0,
                users: u?.count ?? 0,
                totalRevenue: parseFloat(totalRevenue) || 0,
                lowStockProducts: lowStockProducts || [],
                pending: {
                    withdrawals: pendingWithdrawals?.c || 0,
                    sellers: pendingSellers?.c || 0,
                    products: pendingProducts?.c || 0,
                    orders: pendingOrders?.c || 0,
                    messages: unreadMsgs?.c || 0,
                    studentVerify: pendingStudentVerify?.c || 0
                },
                today: {
                    revenue: parseFloat(todayRevenue?.total) || 0,
                    orders: todayRevenue?.cnt || 0
                },
                revenueTrend: revenueTrend || [],
                userGrowth: userGrowth || []
            }
        });
    } catch (err) {
        console.error('system/status:', err);
        res.status(500).json({ code: 500, message: '获取统计失败' });
    }
});

// API 根路径
app.get('/api', (req, res) => {
    res.json({
        code: 200,
        message: 'Space Card Shop API',
        version: '1.0.0',
        endpoints: {
            users: '/api/users',
            products: '/api/products',
            categories: '/api/categories',
            orders: '/api/orders'
        }
    });
});

// ========== 管理后台（内嵌 HTML，无需外部文件）==========
const adminHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>管理后台 - 星际卡密商城</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; min-height: 100vh; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .admin-layout { display: flex; min-height: 100vh; }
    
    /* 侧边栏 */
    .sidebar { width: 250px; background: rgba(15,23,42,0.95); backdrop-filter: blur(20px); border-right: 1px solid #1e293b; position: fixed; top: 0; left: 0; bottom: 0; z-index: 100; display: flex; flex-direction: column; overflow-y: auto; transition: transform 0.3s ease; }
    .sidebar-logo { padding: 20px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; gap: 12px; }
    .sidebar-logo .icon { width: 36px; height: 36px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 18px; }
    .sidebar-logo .text { font-size: 14px; font-weight: 700; color: white; }
    .sidebar-logo .sub { font-size: 11px; color: #64748b; }
    .sidebar-group { padding: 12px 12px 4px; }
    .sidebar-group-title { font-size: 10px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; padding: 0 8px 8px; }
    .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; color: #94a3b8; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; border: none; background: none; width: 100%; text-align: left; }
    .sidebar-item:hover { background: #1e293b; color: #e2e8f0; }
    .sidebar-item.active { background: rgba(99,102,241,0.15); color: #818cf8; }
    .sidebar-item .emoji { width: 20px; text-align: center; font-size: 14px; }
    .sidebar-bottom { margin-top: auto; padding: 12px; border-top: 1px solid #1e293b; }
    
    /* 主内容区 */
    .main-content { flex: 1; margin-left: 250px; min-height: 100vh; }
    .main-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 24px; background: rgba(15,23,42,0.8); backdrop-filter: blur(10px); border-bottom: 1px solid #1e293b; position: sticky; top: 0; z-index: 50; }
    .main-header .title { font-size: 16px; font-weight: 600; color: white; }
    .main-body { padding: 24px; }
    
    /* 移动端侧边栏 */
    .sidebar-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99; }
    .mobile-menu-btn { display: none; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 22px; padding: 4px; }
    
    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .sidebar-overlay.open { display: block; }
      .main-content { margin-left: 0; }
      .mobile-menu-btn { display: block; }
      .main-body { padding: 16px; }
    }
    
    h1, h2 { margin-bottom: 16px; }
    .card { background: #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #334155; border-radius: 8px; background: #0f172a; color: #e2e8f0; font-size: 14px; margin-bottom: 12px; }
    input:focus, select:focus, textarea:focus { outline: none; border-color: #6366f1; }
    button { padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #6366f1; color: white; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-secondary { background: #334155; color: #e2e8f0; }
    .btn-secondary:hover { background: #475569; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-success { background: #16a34a; color: white; }
    .btn-success:hover { background: #15803d; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }
    .hidden { display: none !important; }
    .error { color: #f87171; font-size: 14px; margin-top: 8px; }
    .tabs { display: none; }
    .tab { display: none; }
    .settings-sub-tab { background: transparent; color: #64748b; }
    .settings-sub-tab:hover { color: #e2e8f0; background: #1e293b; }
    .settings-sub-tab.active { background: #6366f1; color: white; }
    .grid { display: grid; gap: 16px; }
    .grid-2 { grid-template-columns: 1fr 1fr; }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #334155; }
    th { color: #94a3b8; font-weight: 500; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; }
    .badge-green { background: #22c55e18; color: #4ade80; border: 1px solid #22c55e30; }
    .badge-yellow { background: #eab30818; color: #fbbf24; border: 1px solid #eab30830; }
    .badge-red { background: #ef444418; color: #f87171; border: 1px solid #ef444430; }
    .badge-blue { background: #3b82f618; color: #60a5fa; border: 1px solid #3b82f630; }
    .badge-purple { background: #8b5cf618; color: #a78bfa; border: 1px solid #8b5cf630; }
    /* Toast 通知样式 */
    .toast-container { position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px; }
    .toast { padding: 14px 20px; border-radius: 10px; color: white; font-size: 14px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); animation: slideIn 0.3s ease; max-width: 350px; display: flex; align-items: center; gap: 10px; }
    .toast-success { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
    .toast-error { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
    .toast-info { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
    .toast-icon { font-size: 18px; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
    @media (max-width: 768px) { .stats { grid-template-columns: repeat(2, 1fr); } }
    .actions { display: flex; gap: 6px; flex-wrap: wrap; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    @media (max-width: 640px) { .form-row { grid-template-columns: 1fr; } }
    /* .nav 已替换为侧边栏 */
    .search-bar { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
    .search-bar input, .search-bar select { margin-bottom: 0; width: auto; min-width: 200px; }
    .batch-bar { display: flex; gap: 8px; align-items: center; padding: 12px 16px; background: #334155; border-radius: 8px; margin-bottom: 16px; }
    .batch-bar span { color: #94a3b8; font-size: 13px; }
    .checkbox { width: 18px; height: 18px; margin: 0; cursor: pointer; }
    .img-preview { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #334155; }
    .img-preview-lg { width: 100%; max-width: 200px; height: 120px; object-fit: cover; border-radius: 8px; border: 1px solid #334155; margin-bottom: 12px; }
    .upload-zone { border: 2px dashed #334155; border-radius: 12px; padding: 24px; text-align: center; cursor: pointer; transition: all 0.3s; margin-bottom: 12px; }
    .upload-zone:hover, .upload-zone.dragover { border-color: #6366f1; background: #6366f110; }
    .upload-zone input { display: none; }
    .upload-zone .icon { font-size: 2rem; margin-bottom: 8px; }
    .upload-zone p { color: #94a3b8; font-size: 13px; margin: 0; }
    .upload-zone small { color: #64748b; font-size: 11px; }
    .upload-preview { position: relative; display: inline-block; margin-bottom: 12px; }
    .upload-preview img { max-width: 200px; max-height: 150px; border-radius: 8px; border: 1px solid #334155; }
    .upload-preview .remove-btn { position: absolute; top: -8px; right: -8px; width: 24px; height: 24px; background: #dc2626; color: white; border: none; border-radius: 50%; cursor: pointer; font-size: 14px; line-height: 24px; }
    .product-item { display: flex; align-items: center; gap: 12px; padding: 16px; background: #0f172a; border-radius: 10px; margin-bottom: 10px; }
    .product-item img { width: 50px; height: 50px; object-fit: cover; border-radius: 8px; }
    .product-info { flex: 1; min-width: 0; }
    .product-info h4 { font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .product-info p { font-size: 12px; color: #94a3b8; }
    .ann-item { display: flex; align-items: center; gap: 12px; padding: 12px; background: #0f172a; border-radius: 8px; margin-bottom: 8px; }
    .ann-color { width: 24px; height: 24px; border-radius: 4px; flex-shrink: 0; }
    .ann-content { flex: 1; font-size: 14px; }
    .switch { position: relative; width: 44px; height: 24px; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .switch .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #334155; border-radius: 24px; transition: 0.3s; }
    .switch .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
    .switch input:checked + .slider { background: #6366f1; }
    .switch input:checked + .slider:before { transform: translateX(20px); }
    .type-selector { display: flex; gap: 8px; }
    .type-btn { flex: 1; padding: 12px 16px; background: #0f172a; border: 2px solid #334155; border-radius: 10px; color: #94a3b8; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .type-btn:hover { border-color: #6366f1; color: #e2e8f0; }
    .type-btn.active { background: #6366f120; border-color: #6366f1; color: #6366f1; }
    .media-preview-box { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 12px; padding: 20px; text-align: center; }
    /* Toggle Switch 开关样式 */
    .toggle-switch { position: relative; display: inline-block; width: 52px; height: 28px; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #334155; transition: .3s; border-radius: 28px; }
    .toggle-slider:before { position: absolute; content: ""; height: 22px; width: 22px; left: 3px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; }
    .toggle-switch input:checked + .toggle-slider { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); }
    .toggle-switch input:checked + .toggle-slider:before { transform: translateX(24px); }
    /* 模态框样式 */
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); z-index: 10000; display: flex; align-items: center; justify-content: center; opacity: 0; visibility: hidden; transition: all 0.3s ease; }
    .modal-overlay.active { opacity: 1; visibility: visible; }
    .modal-box { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 20px; padding: 32px; max-width: 420px; width: 90%; transform: scale(0.9); transition: transform 0.3s ease; }
    .modal-overlay.active .modal-box { transform: scale(1); }
    .modal-title { font-size: 1.25rem; font-weight: 700; margin-bottom: 8px; display: flex; align-items: center; gap: 10px; }
    .modal-subtitle { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
    .modal-actions { display: flex; gap: 12px; margin-top: 24px; }
    .modal-actions button { flex: 1; }
    .modal-error { background: #ef444420; border: 1px solid #ef4444; color: #fca5a5; padding: 12px 16px; border-radius: 10px; font-size: 13px; margin-top: 16px; display: none; }
    .modal-error.show { display: block; }
    .modal-link { color: #6366f1; font-size: 13px; text-decoration: none; cursor: pointer; }
    .modal-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <!-- Toast 通知容器 -->
  <div id="toast-container" class="toast-container"></div>
  
  <!-- 支付密码验证模态框 -->
  <div id="payment-verify-modal" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-title">🔐 安全验证</div>
      <div class="modal-subtitle">请输入支付密码以继续操作</div>
      
      <form id="payment-verify-form">
        <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">支付密码</label>
        <input type="password" id="verify-payment-pwd" placeholder="输入支付密码" required autofocus />
        
        <div id="verify-error" class="modal-error"></div>
        
        <div class="modal-actions">
          <button type="button" id="cancel-verify" class="btn-secondary">取消</button>
          <button type="submit" class="btn-primary">🔓 确认</button>
        </div>
      </form>
      
      <div style="text-align:center;margin-top:20px;padding-top:16px;border-top:1px solid #334155;">
        <a href="javascript:void(0)" id="modal-forgot-pwd" class="modal-link">忘记支付密码？前往安全中心重置</a>
      </div>
    </div>
  </div>
  
  <div class="container">
    <!-- 登录页 -->
    <div id="login-page" class="card" style="max-width:420px;margin:80px auto;">
      <h1 style="text-align:center;margin-bottom:24px;font-size:1.75rem;">🚀 管理后台</h1>
      <form id="login-form">
        <input type="text" id="account" placeholder="账号（用户名或邮箱）" required />
        <input type="password" id="password" placeholder="密码" required />
        <div id="login-error" class="error hidden"></div>
        <button type="submit" class="btn-primary" style="width:100%;margin-top:8px;padding:14px;">登录</button>
      </form>
      <div style="text-align:center;margin-top:16px;">
        <button type="button" id="forgot-pwd-btn" class="btn-secondary btn-sm" style="font-size:12px;">🔐 忘记密码？</button>
      </div>
      <p style="text-align:center;color:#64748b;font-size:12px;margin-top:12px;">默认管理员: admin / admin123</p>
    </div>

    <!-- 密保重置弹窗 -->
    <div id="reset-modal" class="hidden" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;">
      <div class="card" style="max-width:450px;width:90%;max-height:90vh;overflow-y:auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <h2>🔐 通过密保重置账号</h2>
          <button type="button" id="close-reset-modal" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
        </div>
        
        <div id="reset-no-security" class="hidden" style="text-align:center;padding:20px;">
          <p style="color:#f87171;margin-bottom:12px;">⚠️ 未设置密保</p>
          <p style="color:#94a3b8;font-size:14px;">管理员尚未设置密保问题，无法通过此方式重置密码。</p>
          <p style="color:#64748b;font-size:12px;margin-top:12px;">请联系系统管理员或直接修改数据库。</p>
        </div>
        
        <form id="reset-form" class="hidden">
          <input type="hidden" id="reset-admin-id" />
          
          <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:16px;">
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">密保问题</label>
            <p id="reset-question" style="font-size:15px;color:#e2e8f0;font-weight:500;"></p>
          </div>
          
          <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">密保答案 <span style="color:#f87171;">*</span></label>
          <input type="text" id="reset-answer" placeholder="输入密保答案" required />
          
          <hr style="border:none;border-top:1px solid #334155;margin:20px 0;" />
          
          <p style="color:#94a3b8;font-size:13px;margin-bottom:16px;">验证成功后将重置为以下账号密码：</p>
          
          <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">新用户名（留空保持不变）</label>
          <input type="text" id="reset-username" placeholder="新用户名" />
          
          <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">新邮箱（留空保持不变）</label>
          <input type="email" id="reset-email" placeholder="新邮箱" />
          
          <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">新密码 <span style="color:#f87171;">*</span></label>
          <input type="password" id="reset-password" placeholder="新密码（至少6位）" required minlength="6" />
          
          <div id="reset-error" class="error hidden"></div>
          
          <button type="submit" class="btn-primary" style="width:100%;margin-top:16px;padding:14px;">验证并重置账号</button>
        </form>
      </div>
    </div>

    <!-- 后台主界面 -->
    <div id="dashboard" class="hidden">
      <div class="admin-layout">
        <!-- 移动端遮罩 -->
        <div id="sidebar-overlay" class="sidebar-overlay" onclick="closeSidebar()"></div>
        
        <!-- 左侧边栏 -->
        <nav id="admin-sidebar" class="sidebar">
          <div class="sidebar-logo">
            <div class="icon">🚀</div>
            <div><div class="text">星际卡密商城</div><div class="sub">管理后台</div></div>
          </div>

          <!-- 仪表盘 -->
          <div class="sidebar-group">
            <button class="sidebar-item active" data-tab="dashboard" onclick="switchTab(this)">
              <span class="emoji">📊</span> 仪表盘
            </button>
          </div>

          <!-- 商品管理 -->
          <div class="sidebar-group">
            <div class="sidebar-group-title">商品管理</div>
            <button class="sidebar-item" data-tab="products" onclick="switchTab(this)"><span class="emoji">📦</span> 商品列表</button>
            <button class="sidebar-item" data-tab="categories" onclick="switchTab(this)"><span class="emoji">🏷️</span> 分类管理</button>
            <button class="sidebar-item" data-tab="product-audit" onclick="switchTab(this)"><span class="emoji">🔍</span> 商品审核</button>
          </div>

          <!-- 交易财务 -->
          <div class="sidebar-group">
            <div class="sidebar-group-title">交易财务</div>
            <button class="sidebar-item" data-tab="orders" onclick="switchTab(this)"><span class="emoji">📋</span> 订单管理</button>
            <button class="sidebar-item" data-tab="withdrawals" onclick="switchTab(this)"><span class="emoji">💰</span> 财务提现</button>
            <button class="sidebar-item" data-tab="payment" onclick="switchTab(this)"><span class="emoji">💳</span> 支付设置</button>
          </div>

          <!-- 用户中心 -->
          <div class="sidebar-group">
            <div class="sidebar-group-title">用户中心</div>
            <button class="sidebar-item" data-tab="customers" onclick="switchTab(this)"><span class="emoji">👥</span> 客户管理</button>
            <button class="sidebar-item" data-tab="student-verify" onclick="switchTab(this)"><span class="emoji">🎓</span> 学生认证</button>
            <button class="sidebar-item" data-tab="seller-audit" onclick="switchTab(this)"><span class="emoji">🏪</span> 卖家审核</button>
          </div>

          <!-- 运营工具 -->
          <div class="sidebar-group">
            <div class="sidebar-group-title">运营工具</div>
            <button class="sidebar-item" data-tab="announcements" onclick="switchTab(this)"><span class="emoji">📢</span> 公告管理</button>
            <button class="sidebar-item" data-tab="design" onclick="switchTab(this)"><span class="emoji">🎨</span> 店铺装修</button>
            <button class="sidebar-item" data-tab="messages" onclick="switchTab(this)"><span class="emoji">💬</span> 客服中心</button>
          </div>

          <!-- 系统设置 -->
          <div class="sidebar-group">
            <div class="sidebar-group-title">系统</div>
            <button class="sidebar-item" data-tab="security" onclick="switchTab(this)"><span class="emoji">🔐</span> 安全中心</button>
            <button class="sidebar-item" data-tab="settings" onclick="switchTab(this)"><span class="emoji">⚙️</span> 系统设置</button>
          </div>

          <!-- 底部 -->
          <div class="sidebar-bottom">
            <a href="/" target="_blank" class="sidebar-item">
              <span class="emoji">🌐</span> 访问前端商城
            </a>
            <button id="logout-btn" class="sidebar-item" style="color:#f87171;">
              <span class="emoji">🚪</span> 退出登录
            </button>
          </div>
        </nav>

        <!-- 主内容 -->
        <div class="main-content">
          <!-- 顶栏 -->
          <div class="main-header">
            <div style="display:flex;align-items:center;gap:12px;">
              <button class="mobile-menu-btn" onclick="openSidebar()">☰</button>
              <span class="title" id="page-title">仪表盘</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;color:#94a3b8;font-size:13px;">
              <span>👤</span>
              <span id="admin-username">管理员</span>
            </div>
          </div>

          <div class="main-body">
            <!-- 仪表盘首页 -->
            <div id="dashboard-tab">
              <!-- 待办事项 -->
              <div id="action-center" style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;"></div>

              <!-- 统计卡片 -->
              <div class="stats" id="stats"></div>

              <!-- 低库存预警 -->
              <div id="low-stock-alert" class="hidden" style="margin-bottom:20px;padding:12px 16px;background:linear-gradient(135deg,#fef3c720,#f59e0b10);border:1px solid #f59e0b40;border-radius:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                <span style="font-size:20px;">⚠️</span>
                <span style="color:#f59e0b;font-weight:600;">库存预警:</span>
                <div id="low-stock-list" style="display:flex;flex-wrap:wrap;gap:8px;"></div>
              </div>

              <!-- 图表区域 -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;">
                <div class="card" style="padding:16px;">
                  <h3 style="font-size:14px;color:#94a3b8;margin-bottom:12px;">📈 近7天收入趋势</h3>
                  <canvas id="revenue-chart" height="180" style="width:100%;"></canvas>
                </div>
                <div class="card" style="padding:16px;">
                  <h3 style="font-size:14px;color:#94a3b8;margin-bottom:12px;">👥 近7天新用户</h3>
                  <canvas id="user-chart" height="180" style="width:100%;"></canvas>
                </div>
              </div>
            </div>

      <!-- 商品管理 -->
      <div id="products-tab">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="margin:0;">商品列表</h2>
            <div style="display:flex;gap:8px;">
              <button onclick="openProductModal()" class="btn-primary btn-sm">+ 添加商品</button>
              <button id="refresh-products" class="btn-secondary btn-sm">刷新</button>
            </div>
          </div>
          <div id="products-list"></div>
        </div>
      </div>

      <!-- 商品表单弹窗 -->
      <div id="product-modal" class="modal-overlay">
        <div class="modal-box" style="max-width:520px;">
          <div class="modal-title" id="product-form-title">添加商品</div>
          <form id="product-form" style="max-height:70vh;overflow-y:auto;">
            <input type="hidden" id="product-id" />
            <input type="hidden" id="product-image" />
            <input type="text" id="product-title" placeholder="商品名称 *" required />
            <select id="product-category" style="margin-bottom:12px;"><option value="">选择分类</option></select>
            <div class="form-row" style="margin-bottom:12px;">
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">发货方式</label>
                <select id="product-delivery-type" onchange="toggleStockField()">
                  <option value="auto">🔑 自动发卡</option>
                  <option value="manual">📦 手动发货</option>
                </select>
              </div>
              <div id="manual-stock-field" style="display:none;">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">手动库存</label>
                <input type="number" id="product-stock" placeholder="库存数量" value="0" min="0" />
              </div>
            </div>
            <div id="auto-stock-hint" style="padding:8px 12px;background:#3b82f610;border:1px solid #3b82f630;border-radius:8px;margin-bottom:12px;font-size:11px;color:#60a5fa;">
              💡 自动发卡模式：库存由导入的卡密数量自动计算，无需手动设置
            </div>
            <textarea id="product-desc" placeholder="商品描述" rows="2"></textarea>
            <label style="font-size:12px;color:#94a3b8;margin-bottom:6px;display:block;">商品图片</label>
            <div id="upload-zone" class="upload-zone">
              <input type="file" id="image-input" accept="image/*" />
              <div class="icon">📷</div>
              <p>点击上传或拖拽图片</p>
              <small>JPG/PNG，最大 2MB</small>
            </div>
            <div id="product-image-preview"></div>
            <div>
              <input type="number" id="product-price" placeholder="价格 *" step="0.01" required />
            </div>
            <div class="form-row">
              <input type="text" id="product-icon" placeholder="图标 emoji" value="📦" />
              <select id="product-status"><option value="1">上架</option><option value="0">下架</option></select>
            </div>
            <div class="modal-actions" style="margin-top:12px;">
              <button type="button" class="btn-secondary" onclick="closeProductModal()">取消</button>
              <button type="submit" class="btn-primary">保存商品</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 订单管理 -->
      <div id="orders-tab" class="hidden">
        <div class="card">
          <h2 style="margin-bottom:16px;">订单管理</h2>
          <div class="search-bar">
            <input type="text" id="order-search" placeholder="搜索订单号 / 邮箱 / 商品名" style="flex:1;" />
            <select id="order-status-filter">
              <option value="">全部状态</option>
              <option value="pending">待支付</option>
              <option value="paid">已支付</option>
              <option value="awaiting_delivery">待发货</option>
              <option value="delivered">已发货</option>
              <option value="completed">已完成</option>
              <option value="cancelled">已取消</option>
            </select>
            <button id="search-orders" class="btn-primary btn-sm">搜索</button>
            <button id="refresh-orders" class="btn-secondary btn-sm">刷新</button>
          </div>
          <div id="batch-bar" class="batch-bar hidden">
            <input type="checkbox" id="select-all" class="checkbox" />
            <span>已选 <strong id="selected-count">0</strong> 项</span>
            <button id="batch-complete" class="btn-success btn-sm">批量完成</button>
            <button id="batch-cancel" class="btn-secondary btn-sm">批量取消</button>
            <button id="batch-delete" class="btn-danger btn-sm">批量删除</button>
          </div>
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th style="width:40px;"><input type="checkbox" id="select-all-head" class="checkbox" /></th>
                  <th>订单号</th>
                  <th>通道</th>
                  <th>商品</th>
                  <th>金额</th>
                  <th>邮箱</th>
                  <th>状态</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="orders-list"></tbody>
            </table>
          </div>
          <div id="orders-empty" class="hidden" style="text-align:center;padding:40px;color:#64748b;">暂无订单</div>
        </div>
      </div>

      <!-- 分类管理 -->
      <div id="categories-tab" class="hidden">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <h2 style="margin:0;">📂 分类列表</h2>
            <div style="display:flex;gap:8px;">
              <button onclick="openCatModal()" class="btn-primary btn-sm">+ 添加分类</button>
              <button id="refresh-categories" class="btn-secondary btn-sm">刷新</button>
            </div>
          </div>
          <div id="categories-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;margin-bottom:16px;"></div>
          <div id="categories-list"></div>
        </div>
      </div>

      <!-- 分类表单弹窗 -->
      <div id="cat-modal" class="modal-overlay">
        <div class="modal-box" style="max-width:460px;">
          <div class="modal-title" id="cat-form-title">🏷️ 添加分类</div>
          <form id="cat-form">
            <input type="hidden" id="cat-id" />
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
              <div id="cat-icon-preview" style="width:56px;height:56px;background:#6366f115;border:2px solid #334155;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;">📦</div>
              <div style="flex:1;">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">图标</label>
                <input type="text" id="cat-icon" placeholder="emoji" value="📦" style="margin-bottom:0;" />
              </div>
            </div>
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">名称 <span style="color:#f87171;">*</span></label>
            <input type="text" id="cat-name" placeholder="如：软件激活码" required />
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">标识 <span style="color:#f87171;">*</span></label>
            <input type="text" id="cat-slug" placeholder="英文，如 software" required />
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">描述</label>
            <textarea id="cat-desc" placeholder="分类描述..." rows="2"></textarea>
            <div class="form-row">
              <div><label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">排序</label><input type="number" id="cat-sort" value="0" /></div>
              <div><label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">状态</label><select id="cat-status"><option value="1">启用</option><option value="0">禁用</option></select></div>
            </div>
            <div class="modal-actions" style="margin-top:12px;">
              <button type="button" class="btn-secondary" onclick="closeCatModal()">取消</button>
              <button type="submit" class="btn-primary">💾 保存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 客户管理 -->
      <div id="customers-tab" class="hidden">
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <h2>👥 客户列表</h2>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input type="text" id="customer-search" placeholder="搜索用户名/邮箱..." style="width:200px;margin:0;" />
              <select id="customer-status-filter" style="width:120px;margin:0;">
                <option value="">全部状态</option>
                <option value="1">正常</option>
                <option value="0">已禁用</option>
              </select>
              <button id="refresh-customers" class="btn-secondary btn-sm">🔄 刷新</button>
            </div>
          </div>
          
          <!-- 批量操作栏 -->
          <div id="customer-batch-bar" class="batch-bar hidden">
            <input type="checkbox" id="customer-select-all" class="checkbox" />
            <span>已选 <strong id="customer-selected-count">0</strong> 个客户</span>
            <button id="customer-batch-disable" class="btn-secondary btn-sm">禁用选中</button>
            <button id="customer-batch-enable" class="btn-success btn-sm">启用选中</button>
            <button id="customer-batch-delete" class="btn-danger btn-sm">🗑️ 批量删除</button>
          </div>
          
          <!-- 客户统计 -->
          <div id="customer-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin-bottom:20px;"></div>
          
          <!-- 客户列表 -->
          <div style="overflow-x:auto;">
            <table>
              <thead>
                <tr>
                  <th style="width:40px;"><input type="checkbox" id="customer-select-all-head" class="checkbox" /></th>
                  <th>用户信息</th>
                  <th>邮箱</th>
                  <th>学生认证</th>
                  <th>免审核</th>
                  <th>评分</th>
                  <th>订单数</th>
                  <th>状态</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody id="customers-list"></tbody>
            </table>
          </div>
          <div id="customers-empty" class="hidden" style="text-align:center;padding:40px;color:#64748b;">暂无客户</div>
          
          <!-- 分页 -->
          <div id="customer-pagination" style="display:flex;justify-content:center;gap:8px;margin-top:20px;"></div>
        </div>
      </div>

      <!-- 修改密码弹窗 -->
      <div id="customer-pwd-modal" class="hidden" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;">
        <div class="card" style="max-width:400px;width:90%;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2>🔑 修改客户密码</h2>
            <button type="button" id="close-customer-pwd-modal" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
          </div>
          <form id="customer-pwd-form">
            <input type="hidden" id="customer-pwd-id" />
            <p style="color:#94a3b8;font-size:13px;margin-bottom:16px;">为客户 <strong id="customer-pwd-name"></strong> 设置新密码</p>
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">新密码 <span style="color:#f87171;">*</span></label>
            <input type="password" id="customer-new-pwd" placeholder="输入新密码（至少6位）" required minlength="6" />
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">确认密码 <span style="color:#f87171;">*</span></label>
            <input type="password" id="customer-confirm-pwd" placeholder="再次输入新密码" required />
            <button type="submit" class="btn-primary" style="width:100%;margin-top:16px;">确认修改</button>
          </form>
        </div>
      </div>

      <!-- 库存管理弹窗（双模式：自动发卡 / 手动库存）-->
      <div id="cardkey-modal" class="hidden" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:100;">
        <div class="card" style="max-width:700px;width:90%;max-height:90vh;overflow-y:auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
            <h2 id="cardkey-modal-title">库存管理</h2>
            <button type="button" id="close-cardkey-modal" style="background:none;border:none;color:#94a3b8;font-size:1.5rem;cursor:pointer;">&times;</button>
          </div>
          
          <input type="hidden" id="cardkey-product-id" />
          <input type="hidden" id="cardkey-delivery-type" />

          <!-- ===== 自动发卡模式 ===== -->
          <div id="cardkey-auto-section">
            <div id="cardkey-stats" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px;"></div>
            
            <div style="background:#0f172a;border-radius:12px;padding:16px;margin-bottom:20px;">
              <h3 style="margin-bottom:12px;font-size:14px;">📥 批量导入卡密</h3>
              <p style="color:#64748b;font-size:12px;margin-bottom:12px;">每行一个卡密，或用分号（；）分隔</p>
              <textarea id="cardkey-import-text" placeholder="每行一个卡密" rows="5" style="width:100%;margin-bottom:8px;"></textarea>
              <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;cursor:pointer;">
                <input type="checkbox" id="cardkey-allow-duplicates" class="checkbox" />
                <span style="font-size:12px;color:#94a3b8;">允许重复卡密（如共享账号）</span>
              </label>
              <div style="display:flex;gap:8px;">
                <button type="button" id="import-cardkeys-btn" class="btn-primary btn-sm">导入卡密</button>
                <button type="button" id="clear-cardkeys-btn" class="btn-danger btn-sm">清空未售</button>
              </div>
            </div>
            
            <div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <input type="checkbox" id="ck-select-all" class="checkbox" onchange="toggleSelectAllCardKeys(this.checked)" />
                  <h3 style="font-size:14px;margin:0;">📋 卡密列表</h3>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                  <button type="button" id="batch-delete-cardkeys" class="btn-danger btn-sm" style="display:none;">批量删除</button>
                  <select id="cardkey-status-filter" style="width:auto;margin:0;padding:6px 10px;">
                    <option value="">全部</option>
                    <option value="0">未售出</option>
                    <option value="1">已售出</option>
                  </select>
                  <button type="button" id="refresh-cardkeys" class="btn-secondary btn-sm">刷新</button>
                </div>
              </div>
              <div id="cardkey-list" style="max-height:300px;overflow-y:auto;"></div>
            </div>
          </div>

          <!-- ===== 手动库存模式 ===== -->
          <div id="cardkey-manual-section" style="display:none;">
            <div style="text-align:center;padding:20px 0 30px;">
              <p style="color:#64748b;font-size:13px;margin-bottom:8px;">当前库存</p>
              <div id="manual-current-stock" style="font-size:4rem;font-weight:700;color:#6366f1;line-height:1;">0</div>
            </div>
            <div style="background:#0f172a;border-radius:12px;padding:20px;">
              <h3 style="margin-bottom:16px;font-size:14px;">📦 调整库存</h3>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                <div>
                  <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">设置库存为</label>
                  <input type="number" id="manual-set-stock" min="0" placeholder="直接设置库存数量" />
                </div>
                <div style="display:flex;align-items:end;">
                  <button type="button" class="btn-primary" onclick="setManualStock()" style="width:100%;">确认设置</button>
                </div>
              </div>
              <div style="display:flex;gap:8px;">
                <button type="button" class="btn-success btn-sm" onclick="adjustManualStock(10)">+10</button>
                <button type="button" class="btn-success btn-sm" onclick="adjustManualStock(50)">+50</button>
                <button type="button" class="btn-success btn-sm" onclick="adjustManualStock(100)">+100</button>
                <button type="button" class="btn-danger btn-sm" onclick="adjustManualStock(-10)">-10</button>
                <button type="button" class="btn-danger btn-sm" onclick="adjustManualStock(-50)">-50</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 公告管理 -->
      <div id="announcements-tab" class="hidden">
        <div class="grid grid-2">
          <div class="card">
            <h2 id="ann-form-title">添加公告</h2>
            <form id="ann-form">
              <input type="hidden" id="ann-id" />
              
              <!-- 类型选择器 -->
              <div style="margin-bottom:16px;">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:8px;display:block;">公告类型</label>
                <div class="type-selector" style="display:flex;gap:8px;">
                  <button type="button" class="type-btn active" data-type="text">📝 文字</button>
                  <button type="button" class="type-btn" data-type="image">🖼️ 图片</button>
                  <button type="button" class="type-btn" data-type="video">🎬 视频</button>
                </div>
                <input type="hidden" id="ann-type" value="text" />
              </div>
              
              <!-- 文字内容 -->
              <div id="text-field">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">公告内容 <span id="text-required" style="color:#f87171;">*</span></label>
                <textarea id="ann-content" placeholder="输入公告文字内容..." rows="3"></textarea>
              </div>
              
              <!-- 媒体上传区域 -->
              <div id="media-field" class="hidden">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">媒体链接 <span style="color:#f87171;">*</span></label>
                <div id="media-upload-zone" class="upload-zone">
                  <div class="icon" id="media-icon">🖼️</div>
                  <p id="media-hint">粘贴图片/视频 URL 或拖拽图片到此处</p>
                  <small>支持 URL 链接或本地图片上传</small>
                  <input type="file" id="media-file-input" accept="image/*,video/*" />
                </div>
                <input type="text" id="ann-media" placeholder="输入媒体 URL..." style="margin-top:8px;" />
              </div>
              
              <!-- 媒体预览 -->
              <div id="media-preview" class="hidden" style="margin-bottom:16px;">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:8px;display:block;">预览效果</label>
                <div id="preview-container" style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center;">
                  <img id="preview-image" style="max-width:100%;max-height:200px;border-radius:8px;display:none;" />
                  <video id="preview-video" style="max-width:100%;max-height:200px;border-radius:8px;display:none;" controls></video>
                  <p id="preview-text" style="color:#e2e8f0;font-size:14px;display:none;"></p>
                </div>
                <button type="button" id="clear-preview" class="btn-secondary btn-sm" style="margin-top:8px;">清除媒体</button>
              </div>
              
              <input type="text" id="ann-link" placeholder="跳转链接（点击公告跳转，可选）" />
              
              <div class="form-row">
                <div>
                  <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">背景颜色</label>
                  <input type="color" id="ann-color" value="#6366f1" style="height:42px;padding:4px;" />
                </div>
                <div>
                  <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">排序（数字越小越靠前）</label>
                  <input type="number" id="ann-sort" value="0" />
                </div>
              </div>
              <div class="form-row" style="margin-top:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <label class="switch"><input type="checkbox" id="ann-status" checked /><span class="slider"></span></label>
                  <span style="font-size:13px;">启用公告</span>
                </div>
              </div>
              <div style="display:flex;gap:8px;margin-top:16px;">
                <button type="submit" class="btn-primary">保存公告</button>
                <button type="button" id="cancel-ann-edit" class="btn-secondary hidden">取消</button>
              </div>
            </form>
          </div>
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h2>公告列表</h2>
              <button id="refresh-announcements" class="btn-secondary btn-sm">刷新</button>
            </div>
            <div id="announcements-list"></div>
          </div>
        </div>
      </div>

      <!-- 支付设置 -->
      <div id="payment-tab" class="hidden">
        <div class="grid grid-2">
          <!-- System 1: API 网关支付 -->
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
              <div>
                <h2 style="margin:0;">🌐 API 网关支付</h2>
                <p style="color:#94a3b8;font-size:12px;margin:4px 0 0 0;">接入第三方支付网关（易支付等）</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="system1-enabled" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div id="system1-config">
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">API 网关地址 <span style="color:#f87171;">*</span></label>
              <input type="url" id="system1-api-url" placeholder="https://pay.example.com/submit.php" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">商户 ID (PID) <span style="color:#f87171;">*</span></label>
              <input type="text" id="system1-pid" placeholder="10001" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">商户密钥 (Key) <span style="color:#f87171;">*</span></label>
              <div style="position:relative;">
                <input type="password" id="system1-key" placeholder="••••••••" style="padding-right:40px;" />
                <button type="button" id="toggle-key-visibility" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);background:none;border:none;color:#64748b;cursor:pointer;padding:4px;">👁️</button>
              </div>
              <p style="font-size:11px;color:#64748b;margin:-8px 0 12px 0;">留空表示不修改当前密钥</p>
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">异步通知地址</label>
              <input type="url" id="system1-notify-url" placeholder="https://yourdomain.com/api/payment/notify" />
              <p style="font-size:11px;color:#64748b;margin:-8px 0 0 0;">支付成功后的回调地址</p>
            </div>
          </div>

          <!-- System 2: 手动二维码支付 -->
          <div class="card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
              <div>
                <h2 style="margin:0;">📱 手动二维码支付</h2>
                <p style="color:#94a3b8;font-size:12px;margin:4px 0 0 0;">显示收款二维码，用户扫码后手动确认</p>
              </div>
              <label class="toggle-switch">
                <input type="checkbox" id="system2-enabled" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div id="system2-config">
              <label style="font-size:12px;color:#94a3b8;margin-bottom:8px;display:block;">收款二维码</label>
              <div id="payment-qr-upload-zone" class="upload-zone" style="margin-bottom:12px;">
                <input type="file" id="payment-qr-file" accept="image/*" />
                <div class="icon">💰</div>
                <p>点击上传收款二维码</p>
                <small>支持微信/支付宝收款码</small>
              </div>
              <input type="hidden" id="system2-qr-url" />
              
              <!-- 二维码预览 -->
              <div id="payment-qr-preview" class="hidden" style="margin-bottom:16px;">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:8px;display:block;">用户端预览</label>
                <div style="width:220px;margin:0 auto;background:#0f172a;border:3px solid #334155;border-radius:24px;padding:12px 12px 20px;position:relative;">
                  <div style="width:60px;height:4px;background:#334155;border-radius:4px;margin:0 auto 10px;"></div>
                  <div style="background:#1e293b;border-radius:12px;padding:16px;text-align:center;">
                    <p style="font-size:11px;color:#64748b;margin-bottom:8px;">请扫码支付</p>
                    <img id="payment-qr-preview-img" style="max-width:160px;max-height:160px;border-radius:6px;" />
                    <p style="font-size:10px;color:#475569;margin-top:8px;">支付后点击"我已付款"</p>
                  </div>
                  <div style="width:36px;height:36px;border:2px solid #334155;border-radius:50%;margin:10px auto 0;"></div>
                </div>
                <button type="button" id="clear-payment-qr" class="btn-secondary btn-sm" style="margin-top:8px;">移除二维码</button>
              </div>
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">支付说明文字</label>
              <textarea id="system2-instruction" placeholder="请使用微信或支付宝扫描二维码完成支付，支付后请点击"我已支付"按钮" rows="3"></textarea>
            </div>
          </div>
        </div>

        <!-- 当前状态提示 -->
        <div id="payment-status-bar" style="margin-top:20px;padding:12px 20px;border-radius:10px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);text-align:center;font-size:13px;color:#fca5a5;">
          ⚠️ 所有支付系统均为关闭状态，前端将显示"维护模式"。请开启至少一个支付系统并保存。
        </div>

        <!-- 保存按钮 -->
        <div style="margin-top:16px;text-align:center;">
          <button type="button" id="save-payment-config" class="btn-primary" style="padding:14px 48px;font-size:15px;">
            🔒 保存支付设置
          </button>
          <p style="font-size:12px;color:#64748b;margin-top:8px;">保存时需要验证支付密码</p>
        </div>
      </div>

      <!-- 卖家审核 -->
      <!-- 学生认证审核 -->
      <div id="student-verify-tab" class="hidden">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <h2 style="margin:0;">🎓 学生认证审核</h2>
            <div style="display:flex;gap:8px;">
              <select id="sv-status-filter" style="width:130px;margin:0;">
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
              </select>
              <button class="btn-secondary btn-sm" onclick="loadStudentVerifications()">🔄 刷新</button>
            </div>
          </div>
          <!-- 统计 -->
          <div id="sv-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px;"></div>
          <!-- 列表 -->
          <div id="sv-list"></div>
        </div>
      </div>

      <div id="seller-audit-tab" class="hidden">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h2 style="margin:0;">🏪 卖家入驻审核</h2>
            <button class="btn-secondary btn-sm" onclick="loadSellerApplications()">刷新</button>
          </div>
          <div id="seller-apps-list"></div>
        </div>
      </div>

      <!-- 商品审核 -->
      <div id="product-audit-tab" class="hidden">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
            <h2 style="margin:0;">🔍 商品审核队列</h2>
            <div style="display:flex;gap:8px;">
              <select id="pa-status-filter" style="width:130px;margin:0;" onchange="loadProductAudit()">
                <option value="pending">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已拒绝</option>
              </select>
              <button class="btn-secondary btn-sm" onclick="loadProductAudit()">🔄 刷新</button>
            </div>
          </div>
          <div id="product-audit-stats" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px;margin-bottom:20px;"></div>
          <div id="product-audit-list"></div>
        </div>
      </div>

      <!-- 财务提现 -->
      <div id="withdrawals-tab" class="hidden">
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <h2 style="margin:0;">💰 提现管理</h2>
            <button class="btn-secondary btn-sm" onclick="loadWithdrawals()">刷新</button>
          </div>
          <div id="withdrawals-list"></div>
        </div>
      </div>

      <!-- 店铺装修 -->
      <div id="design-tab" class="hidden">
        <!-- 网站品牌 -->
        <div class="card" style="margin-bottom:20px;">
          <h2 style="margin:0 0 20px;">🎨 网站品牌</h2>
          <form id="brand-form">
            <div class="form-row">
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">网站名称</label>
                <input type="text" id="brand-site-name" placeholder="星际卡密商城" />
              </div>
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">英文名称</label>
                <input type="text" id="brand-site-name-en" placeholder="Interstellar Card Shop" />
              </div>
            </div>

            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">浏览器标签页标题</label>
            <input type="text" id="brand-page-title" placeholder="我的商城 - 正版软件" style="margin-bottom:12px;" />
            <p style="font-size:11px;color:#64748b;margin:-8px 0 12px;">浏览器标签页上显示的文字，留空则使用网站名称</p>

            <div class="form-row" style="margin-bottom:16px;">
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">网站 Logo（导航栏）</label>
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
              <div id="brand-logo-preview" style="width:48px;height:48px;background:#1e293b;border-radius:12px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #334155;">
                <span style="font-size:24px;">🚀</span>
              </div>
              <div style="flex:1;">
                <input type="file" id="brand-logo-file" accept="image/*" style="display:none;" />
                <button type="button" class="btn-secondary btn-sm" onclick="document.getElementById('brand-logo-file').click()">上传 Logo</button>
                <button type="button" class="btn-secondary btn-sm" onclick="clearBrandLogo()" style="margin-left:4px;">清除</button>
                <p style="font-size:11px;color:#64748b;margin-top:4px;">建议 128x128 PNG，最大 500KB</p>
              </div>
            </div>
            <input type="hidden" id="brand-logo-url" />
              </div>
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">Favicon（标签页图标）</label>
                <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
                  <div id="brand-favicon-preview" style="width:32px;height:32px;background:#1e293b;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #334155;">
                    <span style="font-size:16px;">🌐</span>
                  </div>
                  <div style="flex:1;">
                    <input type="file" id="brand-favicon-file" accept="image/*" style="display:none;" />
                    <button type="button" class="btn-secondary btn-sm" onclick="document.getElementById('brand-favicon-file').click()">上传</button>
                    <button type="button" class="btn-secondary btn-sm" onclick="clearFavicon()" style="margin-left:4px;">清除</button>
                    <p style="font-size:11px;color:#64748b;margin-top:4px;">32x32 PNG/ICO</p>
                  </div>
                </div>
                <input type="hidden" id="brand-favicon-url" />
              </div>
            </div>

            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">默认商品图片</label>
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px;">
              <div id="brand-default-img-preview" style="width:64px;height:64px;background:#1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid #334155;">
                <span style="color:#64748b;font-size:11px;">无</span>
              </div>
              <div style="flex:1;">
                <input type="file" id="brand-default-img-file" accept="image/*" style="display:none;" />
                <button type="button" class="btn-secondary btn-sm" onclick="document.getElementById('brand-default-img-file').click()">上传默认图</button>
                <button type="button" class="btn-secondary btn-sm" onclick="clearDefaultImg()" style="margin-left:4px;">清除</button>
                <p style="font-size:11px;color:#64748b;margin-top:4px;">无图商品使用此默认图片</p>
              </div>
            </div>
            <input type="hidden" id="brand-default-img-url" />

            <div class="form-row">
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">主题色</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="color" id="brand-theme-color" value="#6366f1" style="width:48px;height:36px;padding:2px;border-radius:8px;border:1px solid #334155;cursor:pointer;" />
                  <input type="text" id="brand-theme-color-text" placeholder="#6366f1" style="flex:1;margin:0;" oninput="document.getElementById('brand-theme-color').value=this.value" />
                </div>
              </div>
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">预设配色</label>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#6366f1;border:2px solid transparent;cursor:pointer;" onclick="setBrandColor('#6366f1')"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#8b5cf6;border:2px solid transparent;cursor:pointer;" onclick="setBrandColor('#8b5cf6')"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#ec4899;border:2px solid transparent;cursor:pointer;" onclick="setBrandColor('#ec4899')"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#3b82f6;border:2px solid transparent;cursor:pointer;" onclick="setBrandColor('#3b82f6')"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#10b981;border:2px solid transparent;cursor:pointer;" onclick="setBrandColor('#10b981')"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#f59e0b;border:2px solid transparent;cursor:pointer;" onclick="setBrandColor('#f59e0b')"></button>
                </div>
              </div>
            </div>

            <div class="form-row" style="margin-top:16px;">
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">背景色</label>
                <div style="display:flex;gap:8px;align-items:center;">
                  <input type="color" id="brand-bg-color" value="#0f172a" style="width:48px;height:36px;padding:2px;border-radius:8px;border:1px solid #334155;cursor:pointer;" />
                  <input type="text" id="brand-bg-color-text" placeholder="#0f172a" style="flex:1;margin:0;" oninput="document.getElementById('brand-bg-color').value=this.value" />
                </div>
              </div>
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">预设背景</label>
                <div style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#0f172a;border:2px solid #334155;cursor:pointer;" onclick="setBgColor('#0f172a')" title="深邃蓝"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#030712;border:2px solid #334155;cursor:pointer;" onclick="setBgColor('#030712')" title="纯黑"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#0a0a1a;border:2px solid #334155;cursor:pointer;" onclick="setBgColor('#0a0a1a')" title="星空黑"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#0c1222;border:2px solid #334155;cursor:pointer;" onclick="setBgColor('#0c1222')" title="午夜蓝"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#1a0a2e;border:2px solid #334155;cursor:pointer;" onclick="setBgColor('#1a0a2e')" title="暗紫"></button>
                  <button type="button" style="width:28px;height:28px;border-radius:8px;background:#0a1628;border:2px solid #334155;cursor:pointer;" onclick="setBgColor('#0a1628')" title="深海蓝"></button>
                </div>
              </div>
            </div>

            <hr style="border:none;border-top:1px solid #334155;margin:16px 0;" />

            <h3 style="font-size:14px;margin-bottom:12px;">📞 页脚支持信息</h3>
            <div class="form-row">
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">客服邮箱</label>
                <input type="text" id="brand-contact-email" placeholder="support@example.com" />
              </div>
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">工作时间</label>
                <input type="text" id="brand-support-hours" placeholder="7 x 24 小时" />
              </div>
            </div>

            <button type="submit" class="btn-primary" style="margin-top:12px;">💾 保存品牌设置</button>
          </form>
        </div>

        <!-- 信任徽章管理 -->
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <div>
              <h2 style="margin:0;">🏆 核心优势徽章</h2>
              <p style="color:#64748b;font-size:12px;margin:4px 0 0;">在商城页脚展示的信任标识</p>
            </div>
            <button class="btn-primary btn-sm" onclick="openBadgeForm()">+ 添加徽章</button>
          </div>
          <div id="badges-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;"></div>
        </div>

        <!-- 站点信息 -->
        <div class="card" style="margin-top:20px;">
          <h2 style="margin:0 0 20px;">🌐 站点信息</h2>
          <form id="design-site-form">
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">页脚简介</label>
            <textarea id="design-footer-desc" placeholder="在页脚显示的简短介绍" rows="2" style="margin-bottom:12px;"></textarea>

            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">社交链接 (JSON)</label>
            <textarea id="design-social-links" placeholder='{"qq":"123456","telegram":"@shop"}' rows="3" style="margin-bottom:12px;font-family:monospace;font-size:12px;"></textarea>
            <p style="font-size:11px;color:#64748b;margin:-8px 0 16px;">支持字段: qq, telegram, wechat, weibo, twitter 等</p>

            <button type="submit" class="btn-primary">💾 保存站点信息</button>
          </form>
        </div>

        <!-- 信息页面管理 -->
        <div class="card" style="margin-top:20px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
            <div>
              <h2 style="margin:0;">📄 信息页面</h2>
              <p style="color:#64748b;font-size:12px;margin:4px 0 0;">服务条款、隐私政策、帮助中心等</p>
            </div>
            <button class="btn-secondary btn-sm" onclick="loadInfoPages()">刷新</button>
          </div>
          <div id="info-pages-list"></div>
        </div>
      </div>

      <!-- 页面编辑弹窗 -->
      <div id="page-edit-modal" class="modal-overlay">
        <div class="modal-box" style="max-width:600px;">
          <div class="modal-title" id="page-edit-title">编辑页面</div>
          <form id="page-edit-form">
            <input type="hidden" id="page-edit-slug" />
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">标题</label>
            <input type="text" id="page-edit-title-input" required />
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">内容</label>
            <textarea id="page-edit-content" rows="12" style="font-family:monospace;font-size:13px;line-height:1.6;"></textarea>
            <p style="font-size:11px;color:#64748b;margin:-8px 0 12px;">支持 **加粗** 格式，换行会保留</p>
            <div class="modal-actions">
              <button type="button" class="btn-secondary" onclick="closePageEditModal()">取消</button>
              <button type="submit" class="btn-primary">💾 保存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 徽章编辑弹窗 -->
      <div id="badge-modal" class="modal-overlay">
        <div class="modal-box" style="max-width:460px;">
          <div class="modal-title" id="badge-modal-title">添加徽章</div>
          <form id="badge-form">
            <input type="hidden" id="badge-id" />
            
            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">图标</label>
            <div id="badge-icon-zone" style="border:2px dashed #334155;border-radius:12px;padding:20px;text-align:center;cursor:pointer;margin-bottom:12px;transition:border-color 0.2s;">
              <input type="file" id="badge-icon-file" accept="image/*" style="display:none;" />
              <div id="badge-icon-preview" style="display:none;margin-bottom:8px;"></div>
              <p style="color:#64748b;font-size:12px;">点击上传图标（建议 64x64 PNG）</p>
            </div>
            <input type="hidden" id="badge-icon-url" />

            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">标题 <span style="color:#f87171;">*</span></label>
            <input type="text" id="badge-title" placeholder="如：即时发货" required />

            <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">描述</label>
            <input type="text" id="badge-desc" placeholder="如：系统自动发送卡密" />

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">排序</label>
                <input type="number" id="badge-sort" value="0" min="0" />
              </div>
              <div>
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">显示</label>
                <label class="toggle-switch" style="margin-top:8px;">
                  <input type="checkbox" id="badge-visible" checked />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div class="modal-actions" style="margin-top:16px;">
              <button type="button" class="btn-secondary" onclick="closeBadgeModal()">取消</button>
              <button type="submit" class="btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>

      <!-- 客服中心 -->
      <div id="messages-tab" class="hidden">
        <div id="msg-container" style="display:flex;height:calc(100vh - 200px);border:1px solid #1e293b;border-radius:12px;overflow:hidden;background:#0f172a;position:relative;">
          <!-- 左侧会话列表 -->
          <div id="msg-sidebar" style="width:300px;min-width:300px;border-right:1px solid #1e293b;display:flex;flex-direction:column;flex-shrink:0;background:#0a0f1e;">
            <div style="padding:12px;border-bottom:1px solid #1e293b;">
              <input type="text" id="msg-search" placeholder="搜索用户..." style="width:100%;padding:8px 12px;background:#1e293b;border:1px solid #334155;border-radius:8px;color:white;font-size:13px;outline:none;" oninput="filterConversations()" />
            </div>
            <div id="msg-conv-list" style="flex:1;overflow-y:auto;"></div>
          </div>
          <!-- 右侧聊天区 -->
          <div id="msg-chatpanel" style="flex:1;display:flex;flex-direction:column;">
            <!-- 聊天头部 -->
            <div id="msg-chat-header" style="padding:12px 16px;border-bottom:1px solid #1e293b;display:flex;align-items:center;gap:10px;min-height:52px;">
              <button id="msg-back-btn" onclick="closeMobileChat()" style="display:none;background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;margin-right:4px;font-size:18px;">←</button>
              <span style="color:#64748b;font-size:14px;">选择一个会话开始聊天</span>
            </div>
            <!-- 消息列表 -->
            <div id="msg-chat-body" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:8px;"></div>
            <!-- 输入区 -->
            <div id="msg-chat-input" style="padding:12px;border-top:1px solid #1e293b;display:none;">
              <div style="display:flex;gap:8px;">
                <textarea id="msg-input-text" rows="1" placeholder="输入消息... (Enter 发送)" style="flex:1;padding:10px 14px;background:#1e293b;border:1px solid #334155;border-radius:10px;color:white;font-size:13px;outline:none;resize:none;max-height:120px;font-family:inherit;"></textarea>
                <button id="msg-send-btn" class="btn-primary" style="padding:10px 16px;border-radius:10px;flex-shrink:0;" onclick="sendMessage()">
                  ✈️
                </button>
              </div>
            </div>
          </div>
        </div>
        <style>
          @media (max-width: 768px) {
            #msg-sidebar { width: 100% !important; border-right: none !important; }
            #msg-chatpanel { position: absolute; inset: 0; background: #0f172a; z-index: 10; display: none !important; }
            #msg-chatpanel.mobile-active { display: flex !important; }
            #msg-back-btn { display: block !important; }
          }
        </style>
      </div>

      <!-- 安全中心 -->
      <div id="security-tab" class="hidden">
        <div class="grid grid-2">
          <!-- 支付密码设置 -->
          <div class="card">
            <h2>🔑 支付密码</h2>
            <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">用于保护敏感操作（如修改支付配置）</p>
            
            <div id="payment-pwd-status" style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:20px;">
              <div style="display:flex;align-items:center;gap:10px;">
                <span id="payment-pwd-icon" style="font-size:24px;">⏳</span>
                <div>
                  <div id="payment-pwd-text" style="font-weight:600;">检查中...</div>
                  <div id="payment-pwd-hint" style="font-size:12px;color:#64748b;"></div>
                </div>
              </div>
            </div>
            
            <!-- 首次设置支付密码 -->
            <div id="setup-payment-pwd-form-container" class="hidden">
              <form id="setup-payment-pwd-form">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">设置支付密码 <span style="color:#f87171;">*</span></label>
                <input type="password" id="setup-payment-pwd" placeholder="至少6位" required minlength="6" />
                
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">确认支付密码 <span style="color:#f87171;">*</span></label>
                <input type="password" id="setup-payment-pwd-confirm" placeholder="再次输入支付密码" required />
                
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">密保问题 <span style="color:#f87171;">*</span></label>
                <select id="setup-security-question" style="margin-bottom:12px;">
                  <option value="">选择密保问题</option>
                  <option value="您的出生地是？">您的出生地是？</option>
                  <option value="您母亲的名字是？">您母亲的名字是？</option>
                  <option value="您最喜欢的电影是？">您最喜欢的电影是？</option>
                  <option value="您第一只宠物的名字是？">您第一只宠物的名字是？</option>
                  <option value="您最好朋友的名字是？">您最好朋友的名字是？</option>
                </select>
                
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">密保答案 <span style="color:#f87171;">*</span></label>
                <input type="text" id="setup-security-answer" placeholder="密保答案（不区分大小写）" required />
                
                <button type="submit" class="btn-primary" style="margin-top:12px;width:100%;">🔐 设置支付密码</button>
              </form>
            </div>
            
            <!-- 修改支付密码 -->
            <div id="change-payment-pwd-form-container" class="hidden">
              <form id="change-payment-pwd-form">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">当前支付密码 <span style="color:#f87171;">*</span></label>
                <input type="password" id="change-current-payment-pwd" placeholder="输入当前支付密码" required />
                
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">新支付密码 <span style="color:#f87171;">*</span></label>
                <input type="password" id="change-new-payment-pwd" placeholder="至少6位" required minlength="6" />
                
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">确认新密码 <span style="color:#f87171;">*</span></label>
                <input type="password" id="change-confirm-payment-pwd" placeholder="再次输入新密码" required />
                
                <button type="submit" class="btn-primary" style="margin-top:12px;width:100%;">🔑 修改支付密码</button>
              </form>
              
              <div style="text-align:center;margin-top:16px;">
                <a href="javascript:void(0)" id="forgot-payment-pwd-link" style="color:#6366f1;font-size:13px;">忘记支付密码？</a>
              </div>
            </div>
          </div>

          <!-- 密保问题重置 -->
          <div class="card">
            <h2>🛡️ 密保重置</h2>
            <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">通过密保问题重置支付密码</p>
            
            <div id="reset-payment-pwd-container" class="hidden">
              <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:20px;">
                <div style="font-size:12px;color:#94a3b8;margin-bottom:8px;">您的密保问题：</div>
                <div id="display-security-question" style="font-weight:600;color:#f1f5f9;"></div>
              </div>
              
              <form id="reset-payment-pwd-form">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">密保答案 <span style="color:#f87171;">*</span></label>
                <input type="text" id="reset-security-answer" placeholder="输入密保答案" required />
                
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">新支付密码 <span style="color:#f87171;">*</span></label>
                <input type="password" id="reset-new-payment-pwd" placeholder="至少6位" required minlength="6" />
                
                <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">确认新密码 <span style="color:#f87171;">*</span></label>
                <input type="password" id="reset-confirm-payment-pwd" placeholder="再次输入新密码" required />
                
                <button type="submit" class="btn-primary" style="margin-top:12px;width:100%;">🔓 重置支付密码</button>
              </form>
            </div>
            
            <div id="no-security-question-hint" style="background:#0f172a;border-radius:10px;padding:20px;text-align:center;">
              <div style="font-size:48px;margin-bottom:12px;">🔒</div>
              <p style="color:#94a3b8;font-size:13px;">请先在左侧设置支付密码和密保问题</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 系统设置 -->
      <div id="settings-tab" class="hidden">
        <!-- 设置子标签页 -->
        <div style="display:flex;gap:4px;margin-bottom:16px;background:#0f172a;padding:4px;border-radius:10px;border:1px solid #1e293b;">
          <button class="settings-sub-tab active" onclick="switchSettingsTab(this,&quot;settings-account&quot;)" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.15s;">🔐 安全配置</button>
          <button class="settings-sub-tab" onclick="switchSettingsTab(this,&quot;settings-contact&quot;)" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.15s;">💬 客服设置</button>
          <button class="settings-sub-tab" onclick="switchSettingsTab(this,&quot;settings-site&quot;)" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.15s;">🌐 基本设置</button>
          <button class="settings-sub-tab" onclick="switchSettingsTab(this,&quot;settings-fee&quot;)" style="flex:1;padding:10px;border-radius:8px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.15s;">💰 费率设置</button>
        </div>

        <!-- 安全配置 -->
        <div id="settings-account" class="settings-panel">
          <div class="card">
            <h2>🔐 账户安全</h2>
            <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">修改登录账号和密码，需要验证当前密码</p>
            
            <!-- 当前账户信息 -->
            <div style="background:#0f172a;border-radius:10px;padding:16px;margin-bottom:20px;">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:48px;height:48px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">👤</div>
                <div>
                  <div style="font-weight:600;" id="current-username">加载中...</div>
                  <div style="font-size:12px;color:#64748b;" id="current-email">-</div>
                </div>
              </div>
            </div>

            <!-- 修改账户表单 -->
            <form id="account-form">
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">修改用户名</label>
              <input type="text" id="new-username" placeholder="新用户名（留空不修改）" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">修改邮箱</label>
              <input type="email" id="new-email" placeholder="新邮箱（留空不修改）" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">当前密码 <span style="color:#f87171;">*</span></label>
              <input type="password" id="account-current-pwd" placeholder="输入当前密码以确认身份" required />
              
              <button type="submit" class="btn-primary" style="margin-top:8px;">保存账户信息</button>
            </form>

            <hr style="border:none;border-top:1px solid #334155;margin:24px 0;" />

            <!-- 修改密码表单 -->
            <h3 style="margin-bottom:16px;">🔑 修改密码</h3>
            <form id="password-form">
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">当前密码 <span style="color:#f87171;">*</span></label>
              <input type="password" id="pwd-current" placeholder="输入当前密码" required />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">新密码 <span style="color:#f87171;">*</span></label>
              <input type="password" id="pwd-new" placeholder="输入新密码（至少6位）" required minlength="6" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">确认新密码 <span style="color:#f87171;">*</span></label>
              <input type="password" id="pwd-confirm" placeholder="再次输入新密码" required />
              
              <button type="submit" class="btn-primary" style="margin-top:8px;">修改密码</button>
            </form>

            <hr style="border:none;border-top:1px solid #334155;margin:24px 0;" />

            <!-- 密保设置 -->
            <h3 style="margin-bottom:16px;">🛡️ 密保设置</h3>
            <p style="color:#94a3b8;font-size:12px;margin-bottom:16px;">设置密保问题后，可通过验证密保来重置账号密码（忘记密码时使用）</p>
            
            <div id="security-status" style="background:#0f172a;border-radius:10px;padding:12px 16px;margin-bottom:16px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span id="security-icon">⏳</span>
                <span id="security-text" style="font-size:13px;">检查中...</span>
              </div>
              <p id="security-question-display" class="hidden" style="font-size:12px;color:#64748b;margin-top:8px;padding-left:24px;"></p>
            </div>
            
            <form id="security-form">
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">密保问题 <span style="color:#f87171;">*</span></label>
              <select id="security-question" style="margin-bottom:12px;">
                <option value="">选择或自定义密保问题</option>
                <option value="您的出生地是？">您的出生地是？</option>
                <option value="您母亲的名字是？">您母亲的名字是？</option>
                <option value="您最喜欢的电影是？">您最喜欢的电影是？</option>
                <option value="您第一只宠物的名字是？">您第一只宠物的名字是？</option>
                <option value="您最好朋友的名字是？">您最好朋友的名字是？</option>
                <option value="custom">自定义问题...</option>
              </select>
              <input type="text" id="security-question-custom" class="hidden" placeholder="输入自定义密保问题" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">密保答案 <span style="color:#f87171;">*</span></label>
              <input type="text" id="security-answer" placeholder="输入密保答案（不区分大小写）" required />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">当前密码 <span style="color:#f87171;">*</span></label>
              <input type="password" id="security-current-pwd" placeholder="输入当前密码以确认身份" required />
              
              <button type="submit" class="btn-primary" style="margin-top:8px;">💾 保存密保设置</button>
            </form>
          </div>
        </div>

        <!-- 客服设置 -->
        <div id="settings-contact" class="settings-panel" style="display:none;">
          <div class="card">
            <h2>💬 客服设置</h2>
            <p style="color:#94a3b8;font-size:13px;margin-bottom:20px;">设置前端显示的客服二维码和联系方式</p>
            
            <form id="contact-form">
              <!-- 客服二维码上传 -->
              <label style="font-size:12px;color:#94a3b8;margin-bottom:8px;display:block;">客服二维码</label>
              <div id="qr-upload-zone" class="upload-zone" style="margin-bottom:12px;">
                <input type="file" id="qr-file-input" accept="image/*" />
                <div class="icon">📱</div>
                <p>点击上传或拖拽二维码图片</p>
                <small>支持 JPG、PNG，建议尺寸 200x200</small>
              </div>
              <input type="hidden" id="contact-qr-url" />
              
              <!-- 二维码预览 -->
              <div id="qr-preview" class="hidden" style="margin-bottom:16px;">
                <label style="font-size:12px;color:#94a3b8;margin-bottom:8px;display:block;">当前二维码预览</label>
                <div style="background:#0f172a;border:1px solid #334155;border-radius:12px;padding:16px;text-align:center;">
                  <img id="qr-preview-img" style="max-width:180px;max-height:180px;border-radius:8px;" />
                </div>
                <button type="button" id="clear-qr" class="btn-secondary btn-sm" style="margin-top:8px;">移除二维码</button>
              </div>
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">微信号</label>
              <input type="text" id="contact-wechat" placeholder="客服微信号（可选）" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">联系邮箱</label>
              <input type="email" id="contact-email" placeholder="客服邮箱（可选）" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">联系电话</label>
              <input type="tel" id="contact-phone" placeholder="客服电话（可选）" />
              
              <button type="submit" class="btn-primary" style="margin-top:16px;">💾 保存客服设置</button>
            </form>

            </form>
          </div>
        </div>

        <!-- 基本设置 -->
        <div id="settings-site" class="settings-panel" style="display:none;">
          <div class="card">
            <h2>🌐 站点设置</h2>
            <form id="site-form">
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">站点名称</label>
              <input type="text" id="site-name" placeholder="星际卡密商城" />
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">站点描述</label>
              <textarea id="site-desc" placeholder="站点简介（可选）" rows="2"></textarea>
              
              <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">页脚文字</label>
              <input type="text" id="footer-text" placeholder="© 2026 星际卡密商城" />
              
              <button type="submit" class="btn-primary" style="margin-top:8px;">保存站点设置</button>
            </form>

            </form>
          </div>
        </div>

        <!-- 费率设置 -->
        <div id="settings-fee" class="settings-panel" style="display:none;">
          <div class="card">
            <h2>💰 提现手续费设置</h2>
            <form id="withdrawal-fee-form">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                <div>
                  <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">手续费比例 (%)</label>
                  <input type="number" id="withdrawal-fee-percent" step="0.01" min="0" max="100" placeholder="5.00" />
                  <p style="font-size:11px;color:#64748b;margin:4px 0 0;">例如 5.00 表示 5%</p>
                </div>
                <div>
                  <label style="font-size:12px;color:#94a3b8;margin-bottom:4px;display:block;">最低手续费 (元)</label>
                  <input type="number" id="withdrawal-min-fee" step="0.01" min="0" placeholder="2.00" />
                  <p style="font-size:11px;color:#64748b;margin:4px 0 0;">手续费不低于此金额</p>
                </div>
              </div>
              <button type="submit" class="btn-primary" style="margin-top:16px;">💾 保存手续费设置</button>
            </form>
          </div>
        </div>
      </div>
          </div><!-- /main-body -->
        </div><!-- /main-content -->
      </div><!-- /admin-layout -->
    </div><!-- /dashboard -->
  </div><!-- /container -->

  <script>
    (function() {
      var token = localStorage.getItem('admin_token');
      var $ = function(id) { return document.getElementById(id); };
      var allOrders = [];
      var selectedOrders = new Set();
      
      // Toast 通知函数
      function showToast(message, type) {
        type = type || 'info';
        var container = $('toast-container');
        if (!container) return;
        
        var icons = { success: '[OK]', error: '[X]', info: '[i]' };
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '') + '</span><span>' + message + '</span>';
        container.appendChild(toast);
        
        // 3秒后自动消失
        setTimeout(function() {
          toast.style.animation = 'slideOut 0.3s ease forwards';
          setTimeout(function() {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
          }, 300);
        }, 3000);
      }
      
      function api(path, opts) {
        opts = opts || {};
        var headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        return fetch('/api' + path, {
          method: opts.method || 'GET',
          headers: headers,
          body: opts.body ? JSON.stringify(opts.body) : undefined
        }).then(function(r) { return r.json(); });
      }

      function showPage(loggedIn) {
        $('login-page').classList.toggle('hidden', loggedIn);
        $('dashboard').classList.toggle('hidden', !loggedIn);
        if (loggedIn) { loadStats(); loadCategories(); loadProducts(); }
      }

      function showError(el, msg) {
        el.textContent = msg || '';
        el.classList.toggle('hidden', !msg);
      }

      // 登录
      $('login-form').onsubmit = function(e) {
        e.preventDefault();
        var account = $('account').value, password = $('password').value;
        api('/auth/login', { method: 'POST', body: { account: account, password: password } })
          .then(function(res) {
            if (res.code === 200 && res.data && res.data.token) {
              token = res.data.token;
              localStorage.setItem('admin_token', token);
              showPage(true);
            } else {
              showError($('login-error'), res.message || '登录失败');
            }
          }).catch(function() { showError($('login-error'), '网络错误'); });
      };

      $('logout-btn').onclick = function() {
        token = null;
        localStorage.removeItem('admin_token');
        showPage(false);
      };

      // ========== 忘记密码/密保重置 ==========
      $('forgot-pwd-btn').onclick = function() {
        $('reset-modal').classList.remove('hidden');
        $('reset-modal').style.display = 'flex';
        loadSecurityQuestion();
      };

      $('close-reset-modal').onclick = function() {
        $('reset-modal').classList.add('hidden');
        $('reset-modal').style.display = 'none';
        $('reset-form').reset();
        showError($('reset-error'), '');
      };

      // 点击模态框外部关闭
      $('reset-modal').onclick = function(e) {
        if (e.target === $('reset-modal')) {
          $('close-reset-modal').onclick();
        }
      };

      function loadSecurityQuestion() {
        fetch('/api/settings/security/question')
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (res.code === 200 && res.data && res.data.has_security) {
              $('reset-no-security').classList.add('hidden');
              $('reset-form').classList.remove('hidden');
              $('reset-admin-id').value = res.data.admin_id;
              $('reset-question').textContent = res.data.security_question;
            } else {
              $('reset-no-security').classList.remove('hidden');
              $('reset-form').classList.add('hidden');
            }
          })
          .catch(function() {
            $('reset-no-security').classList.remove('hidden');
            $('reset-form').classList.add('hidden');
          });
      }

      $('reset-form').onsubmit = function(e) {
        e.preventDefault();
        var data = {
          admin_id: $('reset-admin-id').value,
          security_answer: $('reset-answer').value,
          new_username: $('reset-username').value.trim() || null,
          new_email: $('reset-email').value.trim() || null,
          new_password: $('reset-password').value
        };

        fetch('/api/settings/security/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
          .then(function(r) { return r.json(); })
          .then(function(res) {
            if (res.code === 200) {
              alert('账号重置成功！请使用新的账号密码登录。');
              $('close-reset-modal').onclick();
            } else {
              showError($('reset-error'), res.message || '重置失败');
            }
          })
          .catch(function() {
            showError($('reset-error'), '网络错误');
          });
      };

      // ========== 侧边栏导航 ==========
      var allTabIds = ['dashboard', 'products', 'categories', 'orders', 'customers', 'student-verify', 'announcements', 'payment', 'seller-audit', 'product-audit', 'withdrawals', 'design', 'messages', 'security', 'settings'];
      var tabTitles = { dashboard:'仪表盘', products:'商品列表', categories:'分类管理', orders:'订单管理', customers:'客户管理', 'student-verify':'学生认证审核', announcements:'公告管理', payment:'支付设置', 'seller-audit':'卖家审核', 'product-audit':'商品审核', withdrawals:'财务提现', design:'店铺装修', messages:'客服中心', security:'安全中心', settings:'系统设置' };

      window.switchTab = function(el) {
        var target = el.dataset.tab;
        // 更新侧边栏高亮
        document.querySelectorAll('.sidebar-item').forEach(function(s) { s.classList.remove('active'); });
        el.classList.add('active');
        // 切换页面
        allTabIds.forEach(function(id) {
          var tabEl = $(id + '-tab');
          if (tabEl) tabEl.classList.toggle('hidden', id !== target);
        });
        // 更新标题
        $('page-title').textContent = tabTitles[target] || target;
        // 加载数据
        if (target === 'dashboard') loadStats();
        if (target === 'products') { loadCategories(); loadProducts(); }
        if (target === 'categories') loadCategoriesList();
        if (target === 'orders') loadOrders();
        if (target === 'customers') loadCustomers();
        if (target === 'payment') loadPaymentConfig();
        if (target === 'student-verify') loadStudentVerifications();
        if (target === 'seller-audit') loadSellerApplications();
        if (target === 'product-audit') loadProductAudit();
        if (target === 'withdrawals') loadWithdrawals();
        if (target === 'design') loadDesignData();
        if (target === 'messages') initMessages();
        if (target === 'security') loadSecurityStatus();
        if (target === 'announcements') loadAnnouncements();
        if (target === 'settings') loadSettings();
        // 移动端：关闭侧边栏
        closeSidebar();
      };

      window.openSidebar = function() {
        $('admin-sidebar').classList.add('open');
        $('sidebar-overlay').classList.add('open');
      };
      window.closeSidebar = function() {
        $('admin-sidebar').classList.remove('open');
        $('sidebar-overlay').classList.remove('open');
      };

      // ========== 弹窗辅助 ==========
      window.toggleStockField = function() {
        var dt = $('product-delivery-type');
        var sf = $('manual-stock-field');
        var hint = $('auto-stock-hint');
        var isManual = dt && dt.value === 'manual';
        if (sf) sf.style.display = isManual ? '' : 'none';
        if (hint) hint.style.display = isManual ? 'none' : '';
      };

      window.openProductModal = function() {
        $('product-id').value = '';
        $('product-form').reset();
        $('product-form-title').textContent = '添加商品';
        $('product-image').value = '';
        if ($('product-delivery-type')) $('product-delivery-type').value = 'auto';
        toggleStockField();
        var preview = $('product-image-preview');
        if (preview) preview.innerHTML = '';
        var uploadZone = $('upload-zone');
        if (uploadZone) uploadZone.style.display = '';
        $('product-modal').classList.add('active');
      };
      window.closeProductModal = function() {
        $('product-modal').classList.remove('active');
      };
      if ($('product-modal')) {
        $('product-modal').onclick = function(e) { if (e.target === this) closeProductModal(); };
      }

      window.openCatModal = function() {
        $('cat-id').value = '';
        $('cat-form').reset();
        $('cat-form-title').textContent = '🏷️ 添加分类';
        $('cat-icon').value = '📦';
        $('cat-icon-preview').textContent = '📦';
        $('cat-modal').classList.add('active');
      };
      window.closeCatModal = function() {
        $('cat-modal').classList.remove('active');
      };
      if ($('cat-modal')) {
        $('cat-modal').onclick = function(e) { if (e.target === this) closeCatModal(); };
      }

      // ========== 设置子标签切换 ==========
      window.switchSettingsTab = function(btn, panelId) {
        document.querySelectorAll('.settings-sub-tab').forEach(function(t) { t.classList.remove('active'); });
        btn.classList.add('active');
        document.querySelectorAll('.settings-panel').forEach(function(p) { p.style.display = 'none'; });
        $(panelId).style.display = '';
      };

      // 加载统计
      function loadStats() {
        api('/system/status').then(function(res) {
          if (res.code !== 200 || !res.data) return;
          var d = res.data;
          var revenue = parseFloat(d.totalRevenue) || 0;
          var todayRev = parseFloat(d.today?.revenue) || 0;
          var todayOrd = d.today?.orders || 0;

          // ========== 待办事项（Action Center）==========
          var pending = d.pending || {};
          var actions = [];
          if (pending.withdrawals > 0) actions.push({ icon: '💰', text: pending.withdrawals + ' 笔待处理提现', tab: 'withdrawals', color: '#f59e0b' });
          if (pending.sellers > 0) actions.push({ icon: '👤', text: pending.sellers + ' 个待审核卖家', tab: 'seller-audit', color: '#3b82f6' });
          if (pending.products > 0) actions.push({ icon: '📦', text: pending.products + ' 个待审核商品', tab: 'product-audit', color: '#8b5cf6' });
          if (pending.studentVerify > 0) actions.push({ icon: '🎓', text: pending.studentVerify + ' 个待审核学生认证', tab: 'student-verify', color: '#22c55e' });
          if (pending.messages > 0) actions.push({ icon: '💬', text: pending.messages + ' 条未读消息', tab: 'messages', color: '#06b6d4' });

          $('action-center').innerHTML = actions.length === 0 ? '' : actions.map(function(a) {
            return '<div onclick="document.querySelector(&quot;[data-tab=' + a.tab + ']&quot;).click()" style="flex:1;min-width:200px;padding:14px 16px;background:' + a.color + '15;border:1px solid ' + a.color + '30;border-radius:12px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:transform 0.15s;" onmouseover="this.style.transform=&quot;translateY(-2px)&quot;" onmouseout="this.style.transform=&quot;none&quot;">' +
              '<span style="font-size:20px;">' + a.icon + '</span>' +
              '<span style="color:' + a.color + ';font-size:13px;font-weight:600;">' + a.text + '</span>' +
            '</div>';
          }).join('');

          // ========== 统计卡片 ==========
          var stats = [
            { icon: '💰', label: '总收入', value: '¥' + revenue.toFixed(2), color: '#22c55e', gradient: 'from-emerald-500/10 to-green-500/5' },
            { icon: '📈', label: '今日收入', value: '¥' + todayRev.toFixed(2), color: '#3b82f6', gradient: 'from-blue-500/10 to-cyan-500/5' },
            { icon: '🛒', label: '今日订单', value: todayOrd, color: '#8b5cf6', gradient: 'from-purple-500/10 to-indigo-500/5' },
            { icon: '📦', label: '商品总数', value: d.products || 0, color: '#f59e0b', gradient: 'from-amber-500/10 to-yellow-500/5' },
            { icon: '📋', label: '订单总数', value: d.orders || 0, color: '#06b6d4', gradient: 'from-cyan-500/10 to-teal-500/5' },
            { icon: '👥', label: '用户总数', value: d.users || 0, color: '#ec4899', gradient: 'from-pink-500/10 to-rose-500/5' },
          ];

          $('stats').innerHTML = stats.map(function(s) {
            return '<div style="background:linear-gradient(135deg,#1e293b,#0f172a);padding:20px;border-radius:14px;border:1px solid #1e293b;">' +
              '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">' +
                '<div style="width:40px;height:40px;border-radius:10px;background:' + s.color + '15;display:flex;align-items:center;justify-content:center;font-size:18px;">' + s.icon + '</div>' +
                '<span style="font-size:12px;color:#64748b;">' + s.label + '</span>' +
              '</div>' +
              '<div style="font-size:1.6rem;font-weight:700;color:' + s.color + ';">' + s.value + '</div>' +
            '</div>';
          }).join('');

          // ========== 低库存预警 ==========
          var lowStock = d.lowStockProducts || [];
          if (lowStock.length > 0) {
            $('low-stock-alert').classList.remove('hidden');
            $('low-stock-list').innerHTML = lowStock.map(function(p) {
              return '<span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:#1e293b;border-radius:6px;font-size:13px;">' +
                '<span style="color:#e2e8f0;">' + p.title + '</span>' +
                '<span style="color:' + (p.stock === 0 ? '#ef4444' : '#f59e0b') + ';font-weight:600;">(' + p.stock + ')</span></span>';
            }).join('');
          } else {
            $('low-stock-alert').classList.add('hidden');
          }

          // ========== 图表 ==========
          drawLineChart('revenue-chart', d.revenueTrend || [], 'revenue', '#6366f1', '¥');
          drawBarChart('user-chart', d.userGrowth || [], 'count', '#8b5cf6');
        });
      }

      // ========== Canvas 图表绘制 ==========
      function drawLineChart(canvasId, data, valueKey, color, prefix) {
        var canvas = $(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = canvas.width = canvas.offsetWidth * 2;
        var H = canvas.height = 360;
        ctx.scale(1, 1);
        ctx.clearRect(0, 0, W, H);

        // 填充7天数据
        var days = [];
        for (var i = 6; i >= 0; i--) {
          var d = new Date(); d.setDate(d.getDate() - i);
          days.push(d.toISOString().split('T')[0]);
        }
        var values = days.map(function(day) {
          var found = data.find(function(r) { return r.day && r.day.toString().substring(0, 10) === day; });
          return found ? parseFloat(found[valueKey]) || 0 : 0;
        });

        var max = Math.max.apply(null, values) || 1;
        var padL = 50, padR = 20, padT = 20, padB = 40;
        var chartW = W - padL - padR;
        var chartH = H - padT - padB;

        // 网格线
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
          var gy = padT + (chartH / 4) * g;
          ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
          ctx.fillStyle = '#475569'; ctx.font = '20px system-ui';
          ctx.fillText((prefix || '') + Math.round(max - (max / 4) * g), 4, gy + 6);
        }

        // 数据线
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        var pts = [];
        values.forEach(function(v, i) {
          var x = padL + (chartW / 6) * i;
          var y = padT + chartH - (v / max) * chartH;
          pts.push({ x: x, y: y });
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // 渐变填充
        var grad = ctx.createLinearGradient(0, padT, 0, H - padB);
        grad.addColorStop(0, color + '30');
        grad.addColorStop(1, color + '00');
        ctx.lineTo(pts[pts.length - 1].x, H - padB);
        ctx.lineTo(pts[0].x, H - padB);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // 数据点
        pts.forEach(function(p) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke();
        });

        // X轴标签
        ctx.fillStyle = '#64748b'; ctx.font = '18px system-ui';
        days.forEach(function(day, i) {
          var x = padL + (chartW / 6) * i;
          ctx.fillText(day.substring(5), x - 15, H - 10);
        });
      }

      function drawBarChart(canvasId, data, valueKey, color) {
        var canvas = $(canvasId);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        var W = canvas.width = canvas.offsetWidth * 2;
        var H = canvas.height = 360;
        ctx.clearRect(0, 0, W, H);

        var days = [];
        for (var i = 6; i >= 0; i--) {
          var d = new Date(); d.setDate(d.getDate() - i);
          days.push(d.toISOString().split('T')[0]);
        }
        var values = days.map(function(day) {
          var found = data.find(function(r) { return r.day && r.day.toString().substring(0, 10) === day; });
          return found ? parseFloat(found[valueKey]) || 0 : 0;
        });

        var max = Math.max.apply(null, values) || 1;
        var padL = 40, padR = 20, padT = 20, padB = 40;
        var chartW = W - padL - padR;
        var chartH = H - padT - padB;
        var barW = chartW / 7 * 0.6;
        var gap = chartW / 7 * 0.4;

        // 网格
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
          var gy = padT + (chartH / 4) * g;
          ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
          ctx.fillStyle = '#475569'; ctx.font = '20px system-ui';
          ctx.fillText(Math.round(max - (max / 4) * g), 4, gy + 6);
        }

        // 柱子
        values.forEach(function(v, i) {
          var x = padL + (chartW / 7) * i + gap / 2;
          var barH = (v / max) * chartH;
          var y = padT + chartH - barH;

          var grad = ctx.createLinearGradient(0, y, 0, y + barH);
          grad.addColorStop(0, color);
          grad.addColorStop(1, color + '40');
          ctx.fillStyle = grad;

          // 圆角矩形
          var r = 4;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + barW - r, y);
          ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
          ctx.lineTo(x + barW, y + barH);
          ctx.lineTo(x, y + barH);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.fill();

          // 数值标签
          if (v > 0) {
            ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 20px system-ui';
            ctx.fillText(v, x + barW / 2 - 6, y - 8);
          }
        });

        // X轴标签
        ctx.fillStyle = '#64748b'; ctx.font = '18px system-ui';
        days.forEach(function(day, i) {
          var x = padL + (chartW / 7) * i + gap / 2;
          ctx.fillText(day.substring(5), x, H - 10);
        });
      }

      // ========== 商品管理 ==========
      function loadProducts() {
        api('/products?all=1').then(function(res) {
          if (res.code === 200) {
            var list = res.data && res.data.list || [];
            $('products-list').innerHTML = list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:20px;">暂无商品</p>' : list.map(function(p) {
              var defaultImg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect fill="#334155" width="50" height="50"/><text x="25" y="32" text-anchor="middle" fill="#94a3b8" font-size="18">' + (p.icon || '📦') + '</text></svg>');
              var imgSrc = p.image_url || defaultImg;
              var safeTitle = p.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
              // 发货类型标签
              var isAuto = (p.delivery_type || 'auto') === 'auto';
              var typeTag = isAuto
                ? '<span class="badge badge-blue" style="font-size:10px;">🔑 自动</span>'
                : '<span class="badge" style="font-size:10px;background:#475569;color:#e2e8f0;border-color:#64748b;">📦 手动</span>';
              // 卖家标签
              var sellerTag = p.seller_id ? '<span style="background:#312e81;color:#818cf8;padding:1px 6px;border-radius:20px;font-size:10px;margin-left:4px;">卖家: ' + (p.seller_name || 'ID:' + p.seller_id) + '</span>' : '';
              // 审核状态标签
              var auditMap = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' };
              var auditText = { pending: '待审核', approved: '已审核', rejected: '被拒绝' };
              var auditBadge = p.seller_id ? ' <span class="badge ' + (auditMap[p.audit_status] || '') + '" style="font-size:10px;">' + (auditText[p.audit_status] || '') + '</span>' : '';
              return '<div class="product-item">' +
                '<img src="' + imgSrc + '" style="width:50px;height:50px;object-fit:cover;border-radius:8px;" onerror="this.style.opacity=0"/>' +
                '<div class="product-info"><h4>' + (p.icon || '📦') + ' ' + p.title + sellerTag + '</h4>' +
                '<p>¥' + parseFloat(p.price).toFixed(2) + ' · 库存 ' + p.stock + ' · ' + typeTag + ' <span class="badge ' + (p.status === 1 ? 'badge-green' : 'badge-red') + '">' + (p.status === 1 ? '上架' : '下架') + '</span>' + auditBadge + '</p></div>' +
                '<div class="actions">' +
                '<button class="btn-primary btn-sm" data-pid="' + p.id + '" data-pname="' + safeTitle + '" data-dtype="' + (p.delivery_type || 'auto') + '" onclick="openCardKeyModal(this.dataset.pid, this.dataset.pname, this.dataset.dtype)">🔑 库存</button>' +
                '<button class="btn-secondary btn-sm" onclick="editProduct(' + p.id + ')">编辑</button>' +
                '<button class="btn-danger btn-sm" onclick="deleteProduct(' + p.id + ')">删除</button></div></div>';
            }).join('');
          }
        });
      }
      $('refresh-products').onclick = loadProducts;

      // ========== 图片上传功能 ==========
      var uploadZone = $('upload-zone');
      var imageInput = $('image-input');
      var imagePreview = $('product-image-preview');
      var maxSize = 2 * 1024 * 1024; // 2MB

      // 点击上传
      uploadZone.onclick = function() { imageInput.click(); };

      // 文件选择
      imageInput.onchange = function() {
        if (this.files && this.files[0]) {
          handleImageFile(this.files[0]);
        }
      };

      // 拖拽上传
      uploadZone.ondragover = function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      };
      uploadZone.ondragleave = function() {
        uploadZone.classList.remove('dragover');
      };
      uploadZone.ondrop = function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFile(e.dataTransfer.files[0]);
        }
      };

      // 处理图片文件
      function handleImageFile(file) {
        if (!file.type.startsWith('image/')) {
          alert('请选择图片文件');
          return;
        }
        if (file.size > maxSize) {
          alert('图片大小不能超过 2MB');
          return;
        }

        var reader = new FileReader();
        reader.onload = function(e) {
          var base64 = e.target.result;
          $('product-image').value = base64;
          showImagePreview(base64);
        };
        reader.readAsDataURL(file);
      }

      // 显示图片预览
      function showImagePreview(src) {
        if (src) {
          imagePreview.innerHTML = '<div class="upload-preview"><img src="' + src + '" /><button type="button" class="remove-btn" onclick="removeImage()">×</button></div>';
          uploadZone.style.display = 'none';
        } else {
          imagePreview.innerHTML = '';
          uploadZone.style.display = 'block';
        }
      }

      // 移除图片
      window.removeImage = function() {
        $('product-image').value = '';
        showImagePreview(null);
        imageInput.value = '';
      };

      $('product-form').onsubmit = function(e) {
        e.preventDefault();
        var id = $('product-id').value;
        var categoryId = $('product-category').value;
        var deliveryType = $('product-delivery-type') ? $('product-delivery-type').value : 'auto';
        var data = {
          category_id: categoryId ? parseInt(categoryId) : 1,
          delivery_type: deliveryType,
          title: $('product-title').value,
          description: $('product-desc').value,
          image_url: $('product-image').value.trim() || null,
          price: parseFloat($('product-price').value),
          stock: deliveryType === 'manual' ? (parseInt($('product-stock').value) || 0) : undefined,
          icon: $('product-icon').value || '📦',
          status: parseInt($('product-status').value)
        };
        var url = id ? '/products/' + id : '/products';
        var method = id ? 'PUT' : 'POST';
        api(url, { method: method, body: data }).then(function(res) {
          if (res.code === 200) {
            closeProductModal();
            resetProductForm();
            loadProducts();
            loadStats();
            showToast(id ? '商品已更新' : '商品已添加', 'success');
          } else {
            alert(res.message || '保存失败');
          }
        });
      };

      window.editProduct = function(id) {
        api('/products/' + id).then(function(res) {
          if (res.code === 200 && res.data) {
            var p = res.data;
            $('product-id').value = p.id;
            $('product-title').value = p.title;
            $('product-category').value = p.category_id || '';
            $('product-desc').value = p.description || '';
            $('product-image').value = p.image_url || '';
            showImagePreview(p.image_url || null);
            $('product-price').value = p.price;
            $('product-stock').value = p.stock;
            $('product-icon').value = p.icon || '';
            $('product-status').value = p.status;
            if ($('product-delivery-type')) {
              $('product-delivery-type').value = p.delivery_type || 'auto';
              toggleStockField();
            }
            $('product-form-title').textContent = '编辑商品';
            $('product-modal').classList.add('active');
          }
        });
      };

      window.deleteProduct = function(id) {
        if (confirm('确定要删除这个商品吗？')) {
          api('/products/' + id, { method: 'DELETE' }).then(function(res) {
            if (res.code === 200) { loadProducts(); loadStats(); }
            else alert(res.message || '删除失败');
          });
        }
      };

      function resetProductForm() {
        $('product-id').value = '';
        $('product-form').reset();
        $('product-icon').value = '';
        $('product-image').value = '';
        $('product-category').value = '';
        showImagePreview(null);
        imageInput.value = '';
        $('product-form-title').textContent = '添加商品';
        if ($('cancel-edit')) $('cancel-edit').classList.add('hidden');
      }
      if ($('cancel-edit')) $('cancel-edit').onclick = resetProductForm;

      // 加载分类下拉框
      var categoriesCache = [];
      function loadCategories() {
        api('/categories').then(function(res) {
          if (res.code === 200) {
            categoriesCache = res.data && res.data.list || [];
            var select = $('product-category');
            select.innerHTML = '<option value="">选择分类</option>' + categoriesCache.map(function(c) {
              return '<option value="' + c.id + '">' + (c.icon || '📦') + ' ' + c.name + '</option>';
            }).join('');
          }
        });
      }

      // ========== 分类管理 ==========
      
      // 图标预览
      $('cat-icon').oninput = function() {
        $('cat-icon-preview').textContent = this.value || '';
      };
      
      function loadCategoriesList() {
        api('/categories').then(function(res) {
          if (res.code === 200) {
            var list = res.data && res.data.list || [];
            var enabledCount = list.filter(function(c) { return c.status === 1; }).length;
            var totalProducts = list.reduce(function(sum, c) { return sum + (c.product_count || 0); }, 0);
            
            // 统计卡片
            $('categories-stats').innerHTML = 
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#6366f1;">' + list.length + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">总分类数</div>' +
              '</div>' +
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#22c55e;">' + enabledCount + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">已启用</div>' +
              '</div>';
            
            // 分类列表
            $('categories-list').innerHTML = list.length === 0 
              ? '<div style="text-align:center;padding:40px;color:#64748b;"><div style="font-size:3rem;margin-bottom:12px;">📂</div><p>暂无分类，请先添加分类</p></div>' 
              : list.map(function(c, i) {
                return '<div class="product-item" style="border-left:3px solid ' + (c.status === 1 ? '#22c55e' : '#dc2626') + ';">' +
                  '<div style="width:48px;height:48px;background:linear-gradient(135deg, #6366f120 0%, #6366f105 100%);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;">' + (c.icon || '📦') + '</div>' +
                  '<div class="product-info" style="flex:1;">' +
                    '<h4 style="margin-bottom:6px;">' + c.name + '</h4>' +
                    '<p style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">' +
                      '<span style="background:#334155;padding:2px 8px;border-radius:4px;font-size:11px;">' + c.slug + '</span>' +
                      '<span style="color:#64748b;">排序: ' + c.sort_order + '</span>' +
                      (c.description ? '<span style="color:#64748b;" title="' + c.description + '">📝 ' + (c.description.length > 15 ? c.description.substring(0, 15) + '...' : c.description) + '</span>' : '') +
                    '</p>' +
                  '</div>' +
                  '<span class="badge ' + (c.status === 1 ? 'badge-green' : 'badge-red') + '">' + (c.status === 1 ? '启用' : '禁用') + '</span>' +
                  '<div class="actions">' +
                    '<button class="btn-secondary btn-sm" onclick="editCategory(' + c.id + ')">✏️ 编辑</button>' +
                    '<button class="btn-danger btn-sm" onclick="deleteCategory(' + c.id + ')">🗑️</button>' +
                  '</div>' +
                '</div>';
              }).join('');
          }
        });
      }
      $('refresh-categories').onclick = loadCategoriesList;

      // slug 自动生成提示
      $('cat-name').oninput = function() {
        if (!$('cat-id').value && !$('cat-slug').value) {
          // 简单的拼音转换提示（仅提示，不自动填充）
        }
      };

      $('cat-form').onsubmit = function(e) {
        e.preventDefault();
        var id = $('cat-id').value;
        var slug = $('cat-slug').value.trim().toLowerCase();
        
        // 验证 slug 格式
        if (!/^[a-z0-9-]+$/.test(slug)) {
          alert('分类标识只能包含小写字母、数字和横杠');
          return;
        }
        
        var data = {
          name: $('cat-name').value.trim(),
          slug: slug,
          description: $('cat-desc').value.trim() || null,
          icon: $('cat-icon').value || '📦',
          sort_order: parseInt($('cat-sort').value) || 0,
          status: parseInt($('cat-status').value)
        };
        var url = id ? '/categories/' + id : '/categories';
        var method = id ? 'PUT' : 'POST';
        api(url, { method: method, body: data }).then(function(res) {
          if (res.code === 200) {
            closeCatModal();
            resetCategoryForm();
            loadCategoriesList();
            loadCategories();
            showToast(id ? '分类已更新' : '分类已添加', 'success');
          } else {
            alert(res.message || '保存失败');
          }
        });
      };

      window.editCategory = function(id) {
        api('/categories/' + id).then(function(res) {
          if (res.code === 200 && res.data) {
            var c = res.data;
            $('cat-id').value = c.id;
            $('cat-name').value = c.name;
            $('cat-slug').value = c.slug;
            $('cat-desc').value = c.description || '';
            $('cat-icon').value = c.icon || '';
            $('cat-icon-preview').textContent = c.icon || '';
            $('cat-sort').value = c.sort_order || 0;
            $('cat-status').value = c.status;
            $('cat-form-title').textContent = '编辑分类';
            $('cat-modal').classList.add('active');
          }
        });
      };

      window.deleteCategory = function(id) {
        if (confirm('确定要删除这个分类吗？')) {
          api('/categories/' + id, { method: 'DELETE' }).then(function(res) {
            if (res.code === 200) { loadCategoriesList(); loadCategories(); }
            else alert(res.message || '删除失败');
          });
        }
      };

      function resetCategoryForm() {
        $('cat-id').value = '';
        $('cat-form').reset();
        $('cat-icon').value = '';
        $('cat-icon-preview').textContent = '';
        $('cat-form-title').textContent = '添加分类';
        if ($('cancel-cat-edit')) $('cancel-cat-edit').classList.add('hidden');
      }
      if ($('cancel-cat-edit')) $('cancel-cat-edit').onclick = resetCategoryForm;

      // ========== 订单管理 ==========
      var statusMap = { pending: ['待支付', 'badge-yellow'], paid: ['已支付', 'badge-green'], delivered: ['已发货', 'badge-blue'], completed: ['已完成', 'badge-green'], cancelled: ['已取消', 'badge-red'] };

      function loadOrders() {
        api('/orders').then(function(res) {
          if (res.code === 200) {
            allOrders = res.data && res.data.list || [];
            selectedOrders.clear();
            filterAndRenderOrders();
          }
        });
      }

      function filterAndRenderOrders() {
        var search = $('order-search').value.toLowerCase().trim();
        var status = $('order-status-filter').value;
        var filtered = allOrders.filter(function(o) {
          var matchSearch = !search || o.order_no.toLowerCase().includes(search) || o.email.toLowerCase().includes(search) || o.product_title.toLowerCase().includes(search);
          var matchStatus = !status || o.status === status;
          return matchSearch && matchStatus;
        });
        renderOrders(filtered);
      }

      function renderOrders(list) {
        $('orders-empty').classList.toggle('hidden', list.length > 0);
        $('orders-list').innerHTML = list.map(function(o) {
          var st = statusMap[o.status] || ['未知', 'badge-yellow'];
          var checked = selectedOrders.has(o.id) ? 'checked' : '';
          var hasCardKeys = o.card_keys && o.card_keys !== 'null' && o.card_keys !== '[]';
          var isPaid = o.status === 'paid' || o.status === 'delivered' || o.status === 'completed';
          
          // 支付通道图标: payment_method 字段判断，默认为 API 支付
          var paymentChannel = o.payment_method || 'api';
          var channelIcon = paymentChannel === 'manual' || paymentChannel === 'qr' ? 
            '<span title="扫码支付" style="font-size:16px;cursor:help;">📱</span>' : 
            '<span title="在线支付" style="font-size:16px;cursor:help;">⚡</span>';
          
          // 数量指示器
          var qty = o.quantity || 1;
          var qtyBadge = '<span style="display:inline-block;margin-left:6px;padding:2px 6px;background:#374151;color:#9ca3af;font-size:11px;border-radius:4px;font-weight:500;">x' + qty + '</span>';
          
          // 卡密操作按钮
          var cardKeyBtn = '';
          if (isPaid && !hasCardKeys) {
            cardKeyBtn = '<button class="btn-primary btn-sm" onclick="assignCardKeys(' + o.id + ')" title="分配卡密">分配卡密</button>';
          } else if (hasCardKeys) {
            cardKeyBtn = '<button class="btn-success btn-sm" onclick="viewCardKeys(' + o.id + ')" title="查看卡密">查看卡密</button>';
          }
          
          // 复制卡密按钮 - 仅在已支付且有卡密时显示
          var copyKeyBtn = '';
          if (isPaid && hasCardKeys) {
            copyKeyBtn = '<button class="btn-secondary btn-sm" onclick="copyCardKeys(' + o.id + ')" title="复制卡密" style="padding:4px 8px;min-width:auto;"><span style="font-size:14px;">📋</span></button>';
          }
          
          return '<tr>' +
            '<td><input type="checkbox" class="checkbox order-checkbox" data-id="' + o.id + '" ' + checked + ' /></td>' +
            '<td style="font-family:monospace;font-size:12px;">' + o.order_no + '</td>' +
            '<td style="text-align:center;">' + channelIcon + '</td>' +
            '<td>' + o.product_title + qtyBadge + '</td>' +
            '<td>¥' + parseFloat(o.total_price).toFixed(2) + '</td>' +
            '<td style="font-size:12px;">' + o.email + '</td>' +
            '<td><span class="badge ' + st[1] + '">' + st[0] + '</span></td>' +
            '<td style="font-size:12px;">' + new Date(o.created_at).toLocaleString('zh-CN') + '</td>' +
            '<td><div class="actions">' +
            cardKeyBtn +
            copyKeyBtn +
            '<select onchange="updateOrderStatus(' + o.id + ', this.value)" style="padding:4px 8px;font-size:12px;width:auto;margin:0;">' +
            ['pending', 'paid', 'delivered', 'completed', 'cancelled'].map(function(s) {
              return '<option value="' + s + '"' + (o.status === s ? ' selected' : '') + '>' + (statusMap[s] || [s])[0] + '</option>';
            }).join('') + '</select>' +
            '<button class="btn-danger btn-sm" onclick="deleteOrder(' + o.id + ')">删除</button>' +
            '</div></td></tr>';
        }).join('');
        updateBatchBar();
        bindOrderCheckboxes();
      }

      function bindOrderCheckboxes() {
        document.querySelectorAll('.order-checkbox').forEach(function(cb) {
          cb.onchange = function() {
            var id = parseInt(this.dataset.id);
            if (this.checked) selectedOrders.add(id);
            else selectedOrders.delete(id);
            updateBatchBar();
          };
        });
      }

      function updateBatchBar() {
        var count = selectedOrders.size;
        $('selected-count').textContent = count;
        $('batch-bar').classList.toggle('hidden', count === 0);
        $('select-all-head').checked = selectedOrders.size > 0 && selectedOrders.size === document.querySelectorAll('.order-checkbox').length;
      }

      $('select-all-head').onchange = function() {
        var checked = this.checked;
        document.querySelectorAll('.order-checkbox').forEach(function(cb) {
          cb.checked = checked;
          var id = parseInt(cb.dataset.id);
          if (checked) selectedOrders.add(id);
          else selectedOrders.delete(id);
        });
        updateBatchBar();
      };

      $('search-orders').onclick = filterAndRenderOrders;
      $('order-search').onkeyup = function(e) { if (e.key === 'Enter') filterAndRenderOrders(); };
      $('order-status-filter').onchange = filterAndRenderOrders;
      $('refresh-orders').onclick = loadOrders;

      window.updateOrderStatus = function(id, status) {
        // 显示加载状态
        showToast('正在更新订单状态...', 'info');
        
        api('/orders/' + id + '/status', { method: 'PATCH', body: { status: status } }).then(function(res) {
          if (res.code === 200) {
            // 成功反馈
            var msg = '订单状态已更新为: ' + (statusMap[status] ? statusMap[status][0] : status);
            if (res.data && res.data.assigned_card_keys && res.data.assigned_card_keys.length > 0) {
              msg = '订单已完成，自动分配了 ' + res.data.assigned_card_keys.length + ' 个卡密';
            }
            showToast(msg, 'success');
            loadOrders();
          } else {
            // 错误处理 - 特别处理库存不足
            var errorMsg = res.message || '更新失败';
            if (errorMsg.indexOf('库存不足') !== -1 || errorMsg.indexOf('Inventory') !== -1) {
              showToast('操作失败: 库存中无可用卡密，请先导入卡密', 'error');
            } else {
              showToast('更新失败: ' + errorMsg, 'error');
            }
            // 恢复原状态 - 刷新订单列表
            loadOrders();
          }
        }).catch(function(err) {
          showToast('网络错误，请重试', 'error');
          loadOrders();
        });
      };

      window.deleteOrder = function(id) {
        if (confirm('确定要彻底删除这个订单吗？此操作不可恢复！')) {
          api('/orders/' + id, { method: 'DELETE' }).then(function(res) {
            if (res.code === 200) {
              showToast('订单已删除', 'success');
              loadOrders();
              loadStats();
            } else {
              showToast(res.message || '删除失败', 'error');
            }
          });
        }
      };

      // 手动分配卡密
      window.assignCardKeys = function(id) {
        if (!confirm('确定要为此订单分配卡密吗？请确保该商品已导入卡密库存。')) return;
        
        showToast('正在分配卡密...', 'info');
        
        api('/orders/' + id + '/assign-cardkeys', { method: 'POST' }).then(function(res) {
          if (res.code === 200) {
            var keys = res.data.card_keys || [];
            showToast('成功分配 ' + keys.length + ' 个卡密', 'success');
            loadOrders();
          } else {
            if (res.message && res.message.indexOf('库存') !== -1) {
              showToast('分配失败: 无可用卡密库存', 'error');
            } else {
              showToast(res.message || '分配失败', 'error');
            }
          }
        });
      };

      // 查看订单卡密
      window.viewCardKeys = function(id) {
        var order = allOrders.find(function(o) { return o.id === id; });
        if (!order || !order.card_keys) {
          alert('该订单没有卡密信息');
          return;
        }
        
        var keys = [];
        try {
          keys = JSON.parse(order.card_keys);
          if (!Array.isArray(keys)) keys = [keys];
        } catch(e) {
          keys = order.card_keys.split(/[;；]/).filter(function(k) { return k.trim(); });
        }
        
        var NL = String.fromCharCode(10);
        var msg = '订单 ' + order.order_no + ' 的卡密：' + NL + NL;
        for (var i = 0; i < keys.length; i++) {
          msg += '#' + (i+1) + ': ' + keys[i] + NL;
        }
        alert(msg);
      };

      // 复制订单卡密到剪贴板
      window.copyCardKeys = function(id) {
        var order = allOrders.find(function(o) { return o.id === id; });
        if (!order || !order.card_keys) {
          showToast('该订单没有卡密信息', 'error');
          return;
        }
        
        var keys = [];
        try {
          keys = JSON.parse(order.card_keys);
          if (!Array.isArray(keys)) keys = [keys];
        } catch(e) {
          keys = order.card_keys.split(/[;；]/).filter(function(k) { return k.trim(); });
        }
        
        // 格式化卡密文本 - 使用 String.fromCharCode(10) 避免模板字符串中的换行问题
        var NL = String.fromCharCode(10);
        var copyText = keys.join(NL);
        
        // 复制到剪贴板
        navigator.clipboard.writeText(copyText).then(function() {
          showToast('已复制 ' + keys.length + ' 个卡密到剪贴板', 'success');
        }).catch(function() {
          // 降级方案
          var textarea = document.createElement('textarea');
          textarea.value = copyText;
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          showToast('已复制 ' + keys.length + ' 个卡密到剪贴板', 'success');
        });
      };

      $('batch-complete').onclick = function() { batchUpdateStatus('completed'); };
      $('batch-cancel').onclick = function() { batchUpdateStatus('cancelled'); };

      function batchUpdateStatus(status) {
        if (selectedOrders.size === 0) return;
        var ids = Array.from(selectedOrders);
        var done = 0;
        var successCount = 0;
        var failCount = 0;
        
        showToast('正在批量更新 ' + ids.length + ' 个订单...', 'info');
        
        ids.forEach(function(id) {
          api('/orders/' + id + '/status', { method: 'PATCH', body: { status: status } }).then(function(res) {
            done++;
            if (res.code === 200) successCount++;
            else failCount++;
            
            if (done === ids.length) {
              if (failCount > 0) {
                showToast('成功 ' + successCount + ' 个，失败 ' + failCount + ' 个（可能库存不足）', failCount === ids.length ? 'error' : 'info');
              } else {
                showToast('成功更新 ' + successCount + ' 个订单', 'success');
              }
              loadOrders();
              loadStats();
            }
          });
        });
      }

      $('batch-delete').onclick = function() {
        if (selectedOrders.size === 0) return;
        if (!confirm('确定要彻底删除选中的 ' + selectedOrders.size + ' 个订单吗？此操作不可恢复！')) return;
        api('/orders/batch-delete', { method: 'POST', body: { ids: Array.from(selectedOrders) } }).then(function(res) {
          if (res.code === 200) {
            showToast('批量删除成功', 'success');
            loadOrders();
            loadStats();
          } else {
            showToast(res.message || '批量删除失败', 'error');
          }
        });
      };

      // ========== 客户管理 ==========
      var allCustomers = [];
      var selectedCustomers = new Set();
      var customerPage = 1;
      var customerLimit = 20;

      function loadCustomers() {
        var search = $('customer-search').value.trim();
        var status = $('customer-status-filter').value;
        var params = '?page=' + customerPage + '&limit=' + customerLimit;
        if (search) params += '&search=' + encodeURIComponent(search);
        if (status !== '') params += '&status=' + status;
        
        api('/customer/admin/list' + params).then(function(res) {
          if (res.code === 200) {
            allCustomers = res.data.list || [];
            selectedCustomers.clear();
            renderCustomers();
            renderCustomerPagination(res.data.total);
            updateCustomerStats();
          }
        });
      }

      function updateCustomerStats() {
        api('/customer/admin/list?limit=1000').then(function(res) {
          if (res.code === 200) {
            var list = res.data.list || [];
            var total = list.length;
            var active = list.filter(function(c) { return c.status === 1; }).length;
            var disabled = total - active;
            var verified = list.filter(function(c) { return c.is_student_verified === 1 || c.is_student_verified === true; }).length;
            var trusted = list.filter(function(c) { return c.can_skip_audit === 1 || c.can_skip_audit === true; }).length;
            
            $('customer-stats').innerHTML = 
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#6366f1;">' + total + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">总客户数</div>' +
              '</div>' +
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#22c55e;">' + active + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">正常账户</div>' +
              '</div>' +
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#f87171;">' + disabled + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">已禁用</div>' +
              '</div>' +
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#22c55e;">' + verified + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">🎓 已认证</div>' +
              '</div>' +
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#a78bfa;">' + trusted + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">免审核</div>' +
              '</div>';
          }
        });
      }

      function renderCustomers() {
        if (allCustomers.length === 0) {
          $('customers-list').innerHTML = '';
          $('customers-empty').classList.remove('hidden');
          $('customer-batch-bar').classList.add('hidden');
          return;
        }
        
        $('customers-empty').classList.add('hidden');
        $('customer-batch-bar').classList.remove('hidden');
        
        $('customers-list').innerHTML = allCustomers.map(function(c) {
          var checked = selectedCustomers.has(c.id) ? 'checked' : '';
          var isVerified = c.is_student_verified === 1 || c.is_student_verified === true;
          var canSkip = c.can_skip_audit === 1 || c.can_skip_audit === true;
          var rating = parseFloat(c.rating) || 5.0;
          var reviewCount = c.review_count || 0;
          // 星级渲染
          var starsHtml = '';
          for (var s = 1; s <= 5; s++) {
            if (s <= Math.floor(rating)) {
              starsHtml += '<span style="color:#fbbf24;">&#9733;</span>';
            } else if (s - 0.5 <= rating) {
              starsHtml += '<span style="color:#fbbf24;">&#9733;</span>';
            } else {
              starsHtml += '<span style="color:#475569;">&#9733;</span>';
            }
          }
          return '<tr>' +
            '<td><input type="checkbox" class="checkbox customer-checkbox" data-id="' + c.id + '" ' + checked + ' /></td>' +
            '<td>' +
              '<div style="display:flex;align-items:center;gap:10px;">' +
                '<div style="width:36px;height:36px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1rem;">👤</div>' +
                '<div><div style="font-weight:500;">' + c.username + '</div><div style="font-size:11px;color:#64748b;">ID: ' + c.id + ' · ' + (c.role || 'user') + '</div></div>' +
              '</div>' +
            '</td>' +
            '<td style="color:#94a3b8;font-size:12px;">' + c.email + '</td>' +
            '<td>' + (isVerified ? '<span class="badge badge-green">🎓 已认证</span>' : '<span class="badge" style="background:#47556918;color:#64748b;border:1px solid #47556930;">未认证</span>') + '</td>' +
            '<td>' +
              '<label class="toggle-switch">' +
                '<input type="checkbox" ' + (canSkip ? 'checked' : '') + ' onchange="toggleTrustMode(' + c.id + ', this.checked)" />' +
                '<span class="toggle-slider"></span>' +
              '</label>' +
            '</td>' +
            '<td>' +
              '<div style="white-space:nowrap;">' + starsHtml + '</div>' +
              '<div style="font-size:10px;color:#64748b;">' + rating.toFixed(1) + ' (' + reviewCount + '评)</div>' +
            '</td>' +
            '<td><span class="badge badge-blue">' + (c.order_count || 0) + ' 单</span></td>' +
            '<td><span class="badge ' + (c.status === 1 ? 'badge-green' : 'badge-red') + '">' + (c.status === 1 ? '正常' : '已禁用') + '</span></td>' +
            '<td style="color:#64748b;font-size:12px;">' + (c.created_at ? c.created_at.substring(0, 10) : '-') + '</td>' +
            '<td>' +
              '<div class="actions">' +
                '<button class="btn-secondary btn-sm" onclick="changeCustomerPwd(' + c.id + ')">改密</button>' +
                '<button class="' + (c.status === 1 ? 'btn-secondary' : 'btn-success') + ' btn-sm" onclick="toggleCustomerStatus(' + c.id + ',' + c.status + ')">' + (c.status === 1 ? '禁用' : '启用') + '</button>' +
                '<button class="btn-danger btn-sm" onclick="deleteCustomer(' + c.id + ')">删除</button>' +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('');
        
        // 绑定复选框事件
        document.querySelectorAll('.customer-checkbox').forEach(function(cb) {
          cb.onchange = function() {
            var id = Number(this.dataset.id);
            if (this.checked) {
              selectedCustomers.add(id);
            } else {
              selectedCustomers.delete(id);
            }
            updateCustomerSelection();
          };
        });
        
        updateCustomerSelection();
      }

      function updateCustomerSelection() {
        $('customer-selected-count').textContent = selectedCustomers.size;
        var allChecked = allCustomers.length > 0 && selectedCustomers.size === allCustomers.length;
        $('customer-select-all').checked = allChecked;
        $('customer-select-all-head').checked = allChecked;
      }

      function renderCustomerPagination(total) {
        var totalPages = Math.ceil(total / customerLimit);
        if (totalPages <= 1) {
          $('customer-pagination').innerHTML = '';
          return;
        }
        
        var html = '';
        for (var i = 1; i <= totalPages; i++) {
          html += '<button class="btn-' + (i === customerPage ? 'primary' : 'secondary') + ' btn-sm" onclick="goToCustomerPage(' + i + ')">' + i + '</button>';
        }
        $('customer-pagination').innerHTML = html;
      }

      window.goToCustomerPage = function(page) {
        customerPage = page;
        loadCustomers();
      };

      // 搜索和筛选
      $('customer-search').oninput = function() {
        clearTimeout(window.customerSearchTimeout);
        window.customerSearchTimeout = setTimeout(function() {
          customerPage = 1;
          loadCustomers();
        }, 300);
      };
      $('customer-status-filter').onchange = function() {
        customerPage = 1;
        loadCustomers();
      };
      $('refresh-customers').onclick = loadCustomers;

      // 全选
      $('customer-select-all').onchange = $('customer-select-all-head').onchange = function() {
        var checked = this.checked;
        $('customer-select-all').checked = checked;
        $('customer-select-all-head').checked = checked;
        selectedCustomers.clear();
        if (checked) {
          allCustomers.forEach(function(c) { selectedCustomers.add(c.id); });
        }
        document.querySelectorAll('.customer-checkbox').forEach(function(cb) {
          cb.checked = checked;
        });
        updateCustomerSelection();
      };

      // 修改密码
      window.changeCustomerPwd = function(id) {
        var customer = allCustomers.find(function(c) { return c.id === id; });
        $('customer-pwd-id').value = id;
        $('customer-pwd-name').textContent = customer ? customer.username : id;
        $('customer-pwd-modal').classList.remove('hidden');
        $('customer-pwd-modal').style.display = 'flex';
      };

      $('close-customer-pwd-modal').onclick = function() {
        $('customer-pwd-modal').classList.add('hidden');
        $('customer-pwd-modal').style.display = 'none';
        $('customer-pwd-form').reset();
      };

      $('customer-pwd-modal').onclick = function(e) {
        if (e.target === $('customer-pwd-modal')) {
          $('close-customer-pwd-modal').onclick();
        }
      };

      $('customer-pwd-form').onsubmit = function(e) {
        e.preventDefault();
        var newPwd = $('customer-new-pwd').value;
        var confirmPwd = $('customer-confirm-pwd').value;
        
        if (newPwd !== confirmPwd) {
          alert('两次输入的密码不一致');
          return;
        }
        
        api('/customer/admin/' + $('customer-pwd-id').value + '/password', {
          method: 'PUT',
          body: { new_password: newPwd }
        }).then(function(res) {
          if (res.code === 200) {
            alert('密码修改成功');
            $('close-customer-pwd-modal').onclick();
          } else {
            alert(res.message || '修改失败');
          }
        });
      };

      // 切换状态
      window.toggleCustomerStatus = function(id, currentStatus) {
        var newStatus = currentStatus === 1 ? 0 : 1;
        var action = newStatus === 1 ? '启用' : '禁用';
        if (!confirm('确定要' + action + '该客户账户吗？')) return;
        
        api('/customer/admin/' + id + '/status', {
          method: 'PUT',
          body: { status: newStatus }
        }).then(function(res) {
          if (res.code === 200) {
            loadCustomers();
          } else {
            alert(res.message || '操作失败');
          }
        });
      };

      // 删除客户
      window.deleteCustomer = function(id) {
        if (!confirm('确定要删除该客户吗？此操作不可恢复！')) return;
        
        api('/customer/admin/' + id, { method: 'DELETE' }).then(function(res) {
          if (res.code === 200) {
            loadCustomers();
          } else {
            alert(res.message || '删除失败');
          }
        });
      };

      // 批量操作
      $('customer-batch-disable').onclick = function() {
        if (selectedCustomers.size === 0) return;
        if (!confirm('确定要禁用选中的 ' + selectedCustomers.size + ' 个客户吗？')) return;
        batchUpdateCustomerStatus(0);
      };

      $('customer-batch-enable').onclick = function() {
        if (selectedCustomers.size === 0) return;
        batchUpdateCustomerStatus(1);
      };

      function batchUpdateCustomerStatus(status) {
        var ids = Array.from(selectedCustomers);
        var done = 0;
        ids.forEach(function(id) {
          api('/customer/admin/' + id + '/status', {
            method: 'PUT',
            body: { status: status }
          }).then(function() {
            done++;
            if (done === ids.length) loadCustomers();
          });
        });
      }

      $('customer-batch-delete').onclick = function() {
        if (selectedCustomers.size === 0) return;
        if (!confirm('确定要删除选中的 ' + selectedCustomers.size + ' 个客户吗？此操作不可恢复！')) return;
        
        api('/customer/admin/batch-delete', {
          method: 'POST',
          body: { ids: Array.from(selectedCustomers) }
        }).then(function(res) {
          if (res.code === 200) {
            loadCustomers();
          } else {
            alert(res.message || '批量删除失败');
          }
        });
      };

      // ========== 免审核权限切换 ==========
      window.toggleTrustMode = function(userId, enabled) {
        api('/customer/admin/' + userId + '/trust-mode', {
          method: 'PUT',
          body: { canSkipAudit: enabled }
        }).then(function(res) {
          if (res.code === 200) {
            showToast(enabled ? '已开启免审核权限' : '已关闭免审核权限', 'success');
            // 更新本地数据
            var user = allCustomers.find(function(c) { return c.id === userId; });
            if (user) user.can_skip_audit = enabled ? 1 : 0;
          } else {
            showToast(res.message || '操作失败', 'error');
            // 回滚开关状态
            loadCustomers();
          }
        }).catch(function() {
          showToast('网络错误', 'error');
          loadCustomers();
        });
      };

      // ========== 学生认证审核 ==========
      window.loadStudentVerifications = function() {
        var status = $('sv-status-filter') ? $('sv-status-filter').value : 'pending';
        api('/admin/seller/student-verifications?status=' + status).then(function(res) {
          if (res.code === 200) {
            var list = res.data.list || [];
            // 统计
            $('sv-stats').innerHTML = 
              '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                '<div style="font-size:1.5rem;font-weight:700;color:#fbbf24;">' + (res.data.total || 0) + '</div>' +
                '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">当前筛选</div>' +
              '</div>';

            if (list.length === 0) {
              $('sv-list').innerHTML = '<p style="color:#64748b;text-align:center;padding:30px;">' +
                (status === 'pending' ? '🎉 暂无待审核的学生认证申请' : '暂无记录') + '</p>';
              return;
            }

            $('sv-list').innerHTML = list.map(function(sv) {
              var statusMap = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
              var badgeMap = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' };
              var isAlreadyVerified = sv.is_student_verified === 1 || sv.is_student_verified === true;
              var alreadyTrust = sv.can_skip_audit === 1 || sv.can_skip_audit === true;
              
              return '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:12px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:start;gap:16px;flex-wrap:wrap;">' +
                  '<div style="flex:1;min-width:200px;">' +
                    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
                      '<div style="width:40px;height:40px;background:linear-gradient(135deg,#6366f1,#a855f7);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;">🎓</div>' +
                      '<div>' +
                        '<h4 style="margin:0;">' + (sv.username || '未知用户') + '</h4>' +
                        '<p style="color:#94a3b8;font-size:12px;margin:0;">' + (sv.email || '') + ' · ID: ' + sv.user_id + '</p>' +
                      '</div>' +
                    '</div>' +
                    (sv.real_name || sv.student_id_number ? '<div style="display:flex;gap:16px;margin:10px 0;padding:10px;background:#1e293b;border-radius:8px;">' +
                      (sv.real_name ? '<div><span style="font-size:11px;color:#64748b;">真实姓名</span><p style="margin:2px 0 0;font-size:13px;font-weight:600;">' + sv.real_name + '</p></div>' : '') +
                      (sv.student_id_number ? '<div><span style="font-size:11px;color:#64748b;">学号/证件号</span><p style="margin:2px 0 0;font-size:13px;font-weight:600;">' + sv.student_id_number + '</p></div>' : '') +
                    '</div>' : '') +
                    (sv.id_photo_url ? '<div style="margin:12px 0;"><img src="' + sv.id_photo_url + '" style="max-width:300px;max-height:200px;border-radius:8px;border:1px solid #334155;cursor:pointer;" onclick="window.open(this.src)" onerror="this.style.display=\\'none\\'" /><p style="font-size:11px;color:#64748b;margin-top:4px;">点击图片可放大查看</p></div>' : '<p style="color:#64748b;font-size:12px;">未提供证件照片</p>') +
                    (sv.admin_note ? '<p style="color:#94a3b8;font-size:12px;margin:8px 0;">管理备注: ' + sv.admin_note + '</p>' : '') +
                    '<p style="color:#475569;font-size:11px;margin:6px 0 0 0;">提交时间: ' + new Date(sv.created_at).toLocaleString("zh-CN") + '</p>' +
                    (isAlreadyVerified ? '<span class="badge badge-green" style="margin-top:6px;">已认证用户</span>' : '') +
                    (alreadyTrust ? ' <span class="badge badge-purple" style="margin-top:6px;">免审核</span>' : '') +
                  '</div>' +
                  '<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">' +
                    '<span class="badge ' + (badgeMap[sv.status] || 'badge-yellow') + '">' + (statusMap[sv.status] || sv.status) + '</span>' +
                    (sv.status === 'pending' ?
                      '<button class="btn-primary btn-sm" onclick="handleStudentVerify(' + sv.id + ',\\'approve\\',false)" style="width:100%;">✅ 通过认证</button>' +
                      '<button class="btn-success btn-sm" onclick="handleStudentVerify(' + sv.id + ',\\'approve\\',true)" style="width:100%;white-space:nowrap;">✅ 通过 + 开启免审核</button>' +
                      '<button class="btn-danger btn-sm" onclick="handleStudentVerify(' + sv.id + ',\\'reject\\',false)" style="width:100%;">❌ 拒绝</button>'
                      : '') +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('');
          }
        });
      };

      if ($('sv-status-filter')) {
        $('sv-status-filter').onchange = function() {
          loadStudentVerifications();
        };
      }

      window.handleStudentVerify = function(id, action, enableTrust) {
        var adminNote = '';
        if (action === 'reject') {
          adminNote = prompt('请输入拒绝原因:');
          if (adminNote === null) return;
        }
        var confirmMsg = action === 'approve'
          ? (enableTrust ? '确定通过该学生认证并同时开启免审核权限？' : '确定通过该学生认证？')
          : '确定拒绝该学生认证？';
        if (!confirm(confirmMsg)) return;

        api('/admin/seller/student-verifications/' + id, {
          method: 'PUT',
          body: { action: action, adminNote: adminNote, enableTrust: enableTrust }
        }).then(function(res) {
          if (res.code === 200) {
            showToast(res.message || '操作成功', 'success');
            loadStudentVerifications();
          } else {
            showToast(res.message || '操作失败', 'error');
          }
        }).catch(function() {
          showToast('网络错误', 'error');
        });
      };

      // ========== 库存管理（双模式）==========
      var currentCardKeyProductId = null;
      var currentDeliveryType = 'auto';
      var selectedCardKeys = new Set();
      
      window.openCardKeyModal = function(productId, productName, deliveryType) {
        currentCardKeyProductId = parseInt(productId);
        currentDeliveryType = deliveryType || 'auto';
        $('cardkey-product-id').value = productId;
        $('cardkey-delivery-type').value = currentDeliveryType;
        $('cardkey-modal-title').textContent = (currentDeliveryType === 'auto' ? '🔑 卡密管理' : '📦 库存管理') + ' - ' + (productName || '');
        $('cardkey-modal').classList.remove('hidden');
        $('cardkey-modal').style.display = 'flex';
        selectedCardKeys.clear();

        // 切换显示模式
        $('cardkey-auto-section').style.display = currentDeliveryType === 'auto' ? '' : 'none';
        $('cardkey-manual-section').style.display = currentDeliveryType === 'manual' ? '' : 'none';

        if (currentDeliveryType === 'auto') {
          $('cardkey-import-text').value = '';
          if ($('cardkey-allow-duplicates')) $('cardkey-allow-duplicates').checked = false;
          loadCardKeys();
        } else {
          loadManualStock();
        }
      };
      
      $('close-cardkey-modal').onclick = function() {
        $('cardkey-modal').classList.add('hidden');
        $('cardkey-modal').style.display = 'none';
        currentCardKeyProductId = null;
        loadProducts();
      };
      
      $('cardkey-modal').onclick = function(e) {
        if (e.target === $('cardkey-modal')) $('close-cardkey-modal').onclick();
      };

      // ===== 自动发卡模式 =====
      function loadCardKeys() {
        if (!currentCardKeyProductId) return;
        var statusFilter = $('cardkey-status-filter').value;
        var url = '/cardkeys/' + currentCardKeyProductId;
        if (statusFilter !== '') url += '?status=' + statusFilter;
        selectedCardKeys.clear();
        updateBatchDeleteBtn();
        
        api(url).then(function(res) {
          if (res.code === 200) {
            var data = res.data;
            var stats = data.stats || { total: 0, available: 0, sold: 0 };
            
            $('cardkey-stats').innerHTML = 
              '<div style="background:#22c55e20;border:1px solid #22c55e40;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:#22c55e;">' + stats.available + '</div><div style="font-size:11px;color:#94a3b8;">可用</div></div>' +
              '<div style="background:#f8717120;border:1px solid #f8717140;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:#f87171;">' + stats.sold + '</div><div style="font-size:11px;color:#94a3b8;">已售</div></div>' +
              '<div style="background:#6366f120;border:1px solid #6366f140;border-radius:10px;padding:12px;text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:#6366f1;">' + stats.total + '</div><div style="font-size:11px;color:#94a3b8;">总数</div></div>';
            
            var list = data.list || [];
            // 重置全选
            if ($('ck-select-all')) $('ck-select-all').checked = false;
            
            $('cardkey-list').innerHTML = list.length === 0 
              ? '<div style="text-align:center;padding:30px;color:#64748b;">暂无卡密</div>'
              : list.map(function(k) {
                  var stBadge = k.status === 0 ? '<span class="badge badge-green">可用</span>' : '<span class="badge badge-red">已售</span>';
                  return '<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#0f172a;border-radius:8px;margin-bottom:6px;">' +
                    '<input type="checkbox" class="checkbox ck-checkbox" data-ckid="' + k.id + '" onchange="toggleCardKeySelect(' + k.id + ')" />' +
                    '<code style="flex:1;font-size:12px;color:' + (k.status === 1 ? '#64748b' : '#e2e8f0') + ';word-break:break-all;' + (k.status === 1 ? 'text-decoration:line-through;' : '') + '">' + k.card_key + '</code>' +
                    stBadge +
                    '<button class="btn-danger btn-sm" onclick="deleteCardKey(' + k.id + ')">删除</button>' +
                  '</div>';
                }).join('');
          }
        });
      }
      
      window.toggleCardKeySelect = function(id) {
        if (selectedCardKeys.has(id)) selectedCardKeys.delete(id); else selectedCardKeys.add(id);
        updateBatchDeleteBtn();
        // 同步全选框状态
        var allBoxes = document.querySelectorAll('.ck-checkbox');
        var allChecked = allBoxes.length > 0 && Array.from(allBoxes).every(function(cb) { return cb.checked; });
        if ($('ck-select-all')) $('ck-select-all').checked = allChecked;
      };

      window.toggleSelectAllCardKeys = function(checked) {
        document.querySelectorAll('.ck-checkbox').forEach(function(cb) {
          cb.checked = checked;
          var id = parseInt(cb.dataset.ckid);
          if (checked) selectedCardKeys.add(id); else selectedCardKeys.delete(id);
        });
        updateBatchDeleteBtn();
      };

      function updateBatchDeleteBtn() {
        var btn = $('batch-delete-cardkeys');
        if (btn) btn.style.display = selectedCardKeys.size > 0 ? '' : 'none';
        if (btn && selectedCardKeys.size > 0) btn.textContent = '批量删除(' + selectedCardKeys.size + ')';
      }
      
      $('batch-delete-cardkeys').onclick = function() {
        if (selectedCardKeys.size === 0) return;
        if (!confirm('确定删除选中的 ' + selectedCardKeys.size + ' 个卡密？')) return;
        api('/cardkeys/batch-delete', { method: 'POST', body: { ids: Array.from(selectedCardKeys), productId: currentCardKeyProductId } }).then(function(res) {
          if (res.code === 200) { showToast(res.message || '删除成功', 'success'); loadCardKeys(); }
          else showToast(res.message || '删除失败', 'error');
        });
      };

      $('cardkey-status-filter').onchange = loadCardKeys;
      $('refresh-cardkeys').onclick = loadCardKeys;
      
      $('import-cardkeys-btn').onclick = function() {
        var text = $('cardkey-import-text').value.trim();
        if (!text) { showToast('请输入卡密', 'error'); return; }
        var allowDup = $('cardkey-allow-duplicates') && $('cardkey-allow-duplicates').checked;
        api('/cardkeys/' + currentCardKeyProductId + '/import', {
          method: 'POST', body: { card_keys: text, allow_duplicates: allowDup }
        }).then(function(res) {
          if (res.code === 200) { showToast(res.message || '导入成功', 'success'); $('cardkey-import-text').value = ''; loadCardKeys(); }
          else showToast(res.message || '导入失败', 'error');
        });
      };
      
      $('clear-cardkeys-btn').onclick = function() {
        if (!confirm('确定清空所有未售卡密？不可恢复！')) return;
        api('/cardkeys/product/' + currentCardKeyProductId + '/clear', { method: 'DELETE' }).then(function(res) {
          if (res.code === 200) { showToast('清空成功', 'success'); loadCardKeys(); }
          else showToast(res.message || '失败', 'error');
        });
      };
      
      window.deleteCardKey = function(id) {
        if (!confirm('删除该卡密？')) return;
        api('/cardkeys/' + id, { method: 'DELETE' }).then(function(res) {
          if (res.code === 200) loadCardKeys();
          else showToast(res.message || '删除失败', 'error');
        });
      };

      // ===== 手动库存模式 =====
      function loadManualStock() {
        api('/products/' + currentCardKeyProductId).then(function(res) {
          if (res.code === 200 && res.data) {
            $('manual-current-stock').textContent = res.data.stock || 0;
            $('manual-set-stock').value = res.data.stock || 0;
          }
        });
      }

      window.setManualStock = function() {
        var val = parseInt($('manual-set-stock').value);
        if (isNaN(val) || val < 0) { showToast('请输入有效数量', 'error'); return; }
        api('/products/' + currentCardKeyProductId, {
          method: 'PUT', body: { stock: val, delivery_type: 'manual' }
        }).then(function(res) {
          if (res.code === 200) { showToast('库存已更新', 'success'); loadManualStock(); }
          else showToast(res.message || '更新失败', 'error');
        });
      };

      window.adjustManualStock = function(delta) {
        var current = parseInt($('manual-current-stock').textContent) || 0;
        var newVal = Math.max(0, current + delta);
        $('manual-set-stock').value = newVal;
        setManualStock();
      };

      // ========== 公告管理 ==========
      var typeLabels = { text: '文字', image: '图片', video: '视频' };
      var typeIcons = { text: '📝', image: '🖼️', video: '🎬' };
      var currentAnnType = 'text';
      
      function loadAnnouncements() {
        api('/announcements/all').then(function(res) {
          if (res.code === 200) {
            var list = res.data && res.data.list || [];
            $('announcements-list').innerHTML = list.length === 0 ? '<p style="color:#64748b;text-align:center;padding:20px;">暂无公告</p>' : list.map(function(a) {
              var typeLabel = typeLabels[a.type] || '文字';
              var typeIcon = typeIcons[a.type] || '📝';
              var preview = '';
              if (a.type === 'image' && a.media_url) {
                preview = '<img src="' + a.media_url + '" style="width:48px;height:48px;object-fit:cover;border-radius:6px;margin-right:10px;border:1px solid #334155;" onerror="this.style.opacity=0" />';
              } else if (a.type === 'video' && a.media_url) {
                preview = '<div style="width:48px;height:48px;background:#334155;border-radius:6px;margin-right:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🎬</div>';
              }
              return '<div class="ann-item">' +
                '<div class="ann-color" style="background:' + (a.bg_color || '#6366f1') + '"></div>' +
                preview +
                '<div class="ann-content"><span class="badge badge-blue" style="margin-right:6px;">' + typeIcon + ' ' + typeLabel + '</span>' + (a.content || '<i style="color:#64748b;">(无文字内容)</i>') + (a.link ? ' <a href="' + a.link + '" target="_blank" style="color:#60a5fa;">🔗</a>' : '') + '</div>' +
                '<span class="badge ' + (a.status === 1 ? 'badge-green' : 'badge-red') + '">' + (a.status === 1 ? '启用' : '禁用') + '</span>' +
                '<div class="actions">' +
                '<button class="btn-secondary btn-sm" onclick="editAnnouncement(' + a.id + ')">编辑</button>' +
                '<button class="btn-danger btn-sm" onclick="deleteAnnouncement(' + a.id + ')">删除</button>' +
                '</div></div>';
            }).join('');
          }
        });
      }
      $('refresh-announcements').onclick = loadAnnouncements;

      // 类型选择器交互
      document.querySelectorAll('.type-btn').forEach(function(btn) {
        btn.onclick = function() {
          document.querySelectorAll('.type-btn').forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          currentAnnType = btn.dataset.type;
          $('ann-type').value = currentAnnType;
          updateAnnFormFields();
        };
      });

      function updateAnnFormFields() {
        var isMedia = currentAnnType === 'image' || currentAnnType === 'video';
        $('media-field').classList.toggle('hidden', !isMedia);
        $('text-required').style.display = isMedia ? 'none' : 'inline';
        
        // 更新媒体上传区域提示
        if (currentAnnType === 'image') {
          $('media-icon').textContent = '[IMG]';
          $('media-hint').textContent = '粘贴图片 URL 或拖拽/点击上传本地图片';
          $('media-file-input').accept = 'image/*';
        } else if (currentAnnType === 'video') {
          $('media-icon').textContent = '[VIDEO]';
          $('media-hint').textContent = '粘贴视频 URL（如 YouTube、Bilibili 等）';
          $('media-file-input').accept = 'video/*';
        }
        
        updateMediaPreview();
      }

      // 媒体上传区域交互
      var mediaUploadZone = $('media-upload-zone');
      var mediaFileInput = $('media-file-input');
      
      mediaUploadZone.onclick = function() { mediaFileInput.click(); };
      
      mediaUploadZone.ondragover = function(e) {
        e.preventDefault();
        mediaUploadZone.classList.add('dragover');
      };
      mediaUploadZone.ondragleave = function() {
        mediaUploadZone.classList.remove('dragover');
      };
      mediaUploadZone.ondrop = function(e) {
        e.preventDefault();
        mediaUploadZone.classList.remove('dragover');
        var file = e.dataTransfer.files[0];
        if (file) handleMediaFile(file);
      };
      
      mediaFileInput.onchange = function() {
        if (mediaFileInput.files[0]) handleMediaFile(mediaFileInput.files[0]);
      };
      
      function handleMediaFile(file) {
        if (file.size > 5 * 1024 * 1024) {
          alert('文件大小不能超过 5MB');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          $('ann-media').value = e.target.result;
          updateMediaPreview();
        };
        reader.readAsDataURL(file);
      }

      // 媒体链接输入变化时更新预览
      $('ann-media').oninput = function() { updateMediaPreview(); };

      function updateMediaPreview() {
        var mediaUrl = $('ann-media').value.trim();
        var hasMedia = mediaUrl && (currentAnnType === 'image' || currentAnnType === 'video');
        
        $('media-preview').classList.toggle('hidden', !hasMedia);
        $('preview-image').style.display = 'none';
        $('preview-video').style.display = 'none';
        $('preview-text').style.display = 'none';
        
        if (!mediaUrl) return;
        
        if (currentAnnType === 'image') {
          $('preview-image').src = mediaUrl;
          $('preview-image').style.display = 'block';
          $('preview-image').onerror = function() {
            $('preview-image').style.display = 'none';
            $('preview-text').textContent = '图片加载失败，请检查 URL';
            $('preview-text').style.display = 'block';
          };
        } else if (currentAnnType === 'video') {
          // 检查是否为外部视频链接
          if (mediaUrl.includes('youtube.com') || mediaUrl.includes('youtu.be') || mediaUrl.includes('bilibili.com')) {
            $('preview-text').textContent = '[VIDEO] 外部视频链接（保存后可预览）';
            $('preview-text').style.display = 'block';
          } else {
            $('preview-video').src = mediaUrl;
            $('preview-video').style.display = 'block';
          }
        }
      }

      $('clear-preview').onclick = function() {
        $('ann-media').value = '';
        mediaFileInput.value = '';
        updateMediaPreview();
      };

      $('ann-form').onsubmit = function(e) {
        e.preventDefault();
        var id = $('ann-id').value;
        var type = $('ann-type').value;
        var content = $('ann-content').value.trim();
        var mediaUrl = $('ann-media').value.trim();
        
        // 验证
        if (type === 'text' && !content) {
          alert('文字公告内容不能为空');
          return;
        }
        if ((type === 'image' || type === 'video') && !mediaUrl) {
          alert('媒体公告需要提供媒体链接');
          return;
        }
        
        var data = {
          type: type,
          content: content,
          media_url: mediaUrl || null,
          link: $('ann-link').value.trim() || null,
          bg_color: $('ann-color').value,
          sort_order: parseInt($('ann-sort').value) || 0,
          status: $('ann-status').checked ? 1 : 0
        };
        var url = id ? '/announcements/' + id : '/announcements';
        var method = id ? 'PUT' : 'POST';
        api(url, { method: method, body: data }).then(function(res) {
          if (res.code === 200) {
            resetAnnForm();
            loadAnnouncements();
          } else {
            alert(res.message || '保存失败');
          }
        });
      };

      window.editAnnouncement = function(id) {
        api('/announcements/all').then(function(res) {
          if (res.code === 200) {
            var a = (res.data.list || []).find(function(x) { return x.id === id; });
            if (a) {
              $('ann-id').value = a.id;
              
              // 设置类型选择器
              currentAnnType = a.type || 'text';
              $('ann-type').value = currentAnnType;
              document.querySelectorAll('.type-btn').forEach(function(b) {
                b.classList.toggle('active', b.dataset.type === currentAnnType);
              });
              updateAnnFormFields();
              
              $('ann-content').value = a.content || '';
              $('ann-media').value = a.media_url || '';
              $('ann-link').value = a.link || '';
              $('ann-color').value = a.bg_color || '#6366f1';
              $('ann-sort').value = a.sort_order || 0;
              $('ann-status').checked = a.status === 1;
              $('ann-form-title').textContent = '编辑公告';
              $('cancel-ann-edit').classList.remove('hidden');
              
              updateMediaPreview();
              window.scrollTo(0, 0);
            }
          }
        });
      };

      window.deleteAnnouncement = function(id) {
        if (confirm('确定要删除这条公告吗？')) {
          api('/announcements/' + id, { method: 'DELETE' }).then(function(res) {
            if (res.code === 200) loadAnnouncements();
            else alert(res.message || '删除失败');
          });
        }
      };

      function resetAnnForm() {
        $('ann-id').value = '';
        $('ann-form').reset();
        currentAnnType = 'text';
        $('ann-type').value = 'text';
        document.querySelectorAll('.type-btn').forEach(function(b) {
          b.classList.toggle('active', b.dataset.type === 'text');
        });
        $('ann-color').value = '#6366f1';
        $('ann-status').checked = true;
        $('ann-form-title').textContent = '添加公告';
        $('cancel-ann-edit').classList.add('hidden');
        mediaFileInput.value = '';
        updateAnnFormFields();
      }
      $('cancel-ann-edit').onclick = resetAnnForm;

      // ========== 系统设置 ==========
      
      // 加载设置
      function loadSettings() {
        // 加载账户信息
        api('/settings/account').then(function(res) {
          if (res.code === 200 && res.data) {
            $('current-username').textContent = res.data.username || '未知';
            $('current-email').textContent = res.data.email || '-';
          }
        });
        
        // 加载密保状态
        api('/settings/security').then(function(res) {
          if (res.code === 200 && res.data) {
            if (res.data.has_security) {
              $('security-icon').textContent = '[OK]';
              $('security-text').textContent = '已设置密保';
              $('security-text').style.color = '#4ade80';
              $('security-question-display').textContent = '问题: ' + res.data.security_question;
              $('security-question-display').classList.remove('hidden');
            } else {
              $('security-icon').textContent = '[!]';
              $('security-text').textContent = '未设置密保（建议设置，以便忘记密码时找回）';
              $('security-text').style.color = '#fbbf24';
              $('security-question-display').classList.add('hidden');
            }
          }
        });
        
        // 加载站点设置
        api('/settings').then(function(res) {
          if (res.code === 200 && res.data) {
            var s = res.data;
            $('site-name').value = s.site_name || '';
            $('site-desc').value = s.site_description || '';
            $('footer-text').value = s.footer_text || '';
            $('contact-wechat').value = s.contact_wechat || '';
            $('contact-email').value = s.contact_email || '';
            $('contact-phone').value = s.contact_phone || '';
            $('contact-qr-url').value = s.contact_qr_url || '';
            
            // 提现手续费
            $('withdrawal-fee-percent').value = s.withdrawal_fee_percent !== undefined ? s.withdrawal_fee_percent : '5.00';
            $('withdrawal-min-fee').value = s.withdrawal_min_fee !== undefined ? s.withdrawal_min_fee : '2.00';
            
            // 显示二维码预览
            if (s.contact_qr_url) {
              $('qr-preview-img').src = s.contact_qr_url;
              $('qr-preview').classList.remove('hidden');
            } else {
              $('qr-preview').classList.add('hidden');
            }
          }
        });
      }

      // 二维码上传
      var qrUploadZone = $('qr-upload-zone');
      var qrFileInput = $('qr-file-input');
      
      qrUploadZone.onclick = function() { qrFileInput.click(); };
      
      qrUploadZone.ondragover = function(e) {
        e.preventDefault();
        qrUploadZone.classList.add('dragover');
      };
      qrUploadZone.ondragleave = function() {
        qrUploadZone.classList.remove('dragover');
      };
      qrUploadZone.ondrop = function(e) {
        e.preventDefault();
        qrUploadZone.classList.remove('dragover');
        var file = e.dataTransfer.files[0];
        if (file) handleQrFile(file);
      };
      
      qrFileInput.onchange = function() {
        if (qrFileInput.files[0]) handleQrFile(qrFileInput.files[0]);
      };
      
      function handleQrFile(file) {
        if (file.size > 2 * 1024 * 1024) {
          alert('文件大小不能超过 2MB');
          return;
        }
        var reader = new FileReader();
        reader.onload = function(e) {
          $('contact-qr-url').value = e.target.result;
          $('qr-preview-img').src = e.target.result;
          $('qr-preview').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
      }
      
      $('clear-qr').onclick = function() {
        $('contact-qr-url').value = '';
        qrFileInput.value = '';
        $('qr-preview').classList.add('hidden');
      };

      // 修改账户信息
      $('account-form').onsubmit = function(e) {
        e.preventDefault();
        var username = $('new-username').value.trim();
        var email = $('new-email').value.trim();
        var currentPwd = $('account-current-pwd').value;
        
        if (!username && !email) {
          alert('请至少填写一个要修改的字段');
          return;
        }
        
        var data = { current_password: currentPwd };
        if (username) data.username = username;
        if (email) data.email = email;
        
        api('/settings/account', { method: 'PUT', body: data }).then(function(res) {
          if (res.code === 200) {
            alert('账户信息更新成功');
            $('account-form').reset();
            loadSettings();
          } else {
            alert(res.message || '更新失败');
          }
        });
      };

      // 修改密码
      $('password-form').onsubmit = function(e) {
        e.preventDefault();
        var currentPwd = $('pwd-current').value;
        var newPwd = $('pwd-new').value;
        var confirmPwd = $('pwd-confirm').value;
        
        if (newPwd !== confirmPwd) {
          alert('两次输入的新密码不一致');
          return;
        }
        
        api('/settings/password', { 
          method: 'PUT', 
          body: { 
            current_password: currentPwd, 
            new_password: newPwd, 
            confirm_password: confirmPwd 
          } 
        }).then(function(res) {
          if (res.code === 200) {
            alert('密码修改成功，请使用新密码重新登录');
            $('password-form').reset();
            // 强制重新登录
            token = null;
            localStorage.removeItem('admin_token');
            showPage(false);
          } else {
            alert(res.message || '修改失败');
          }
        });
      };

      // 保存客服设置
      $('contact-form').onsubmit = function(e) {
        e.preventDefault();
        var data = {
          contact_qr_url: $('contact-qr-url').value || null,
          contact_wechat: $('contact-wechat').value.trim() || null,
          contact_email: $('contact-email').value.trim() || null,
          contact_phone: $('contact-phone').value.trim() || null
        };
        
        api('/settings', { method: 'PUT', body: data }).then(function(res) {
          if (res.code === 200) {
            alert('客服设置保存成功');
          } else {
            alert(res.message || '保存失败');
          }
        });
      };

      // 保存站点设置
      $('site-form').onsubmit = function(e) {
        e.preventDefault();
        var data = {
          site_name: $('site-name').value.trim() || '星际卡密商城',
          site_description: $('site-desc').value.trim() || null,
          footer_text: $('footer-text').value.trim() || null
        };
        
        api('/settings', { method: 'PUT', body: data }).then(function(res) {
          if (res.code === 200) {
            alert('站点设置保存成功');
          } else {
            alert(res.message || '保存失败');
          }
        });
      };

      // 提现手续费设置
      $('withdrawal-fee-form').onsubmit = function(e) {
        e.preventDefault();
        var data = {
          withdrawal_fee_percent: parseFloat($('withdrawal-fee-percent').value) || 5.0,
          withdrawal_min_fee: parseFloat($('withdrawal-min-fee').value) || 2.0
        };
        api('/settings', { method: 'PUT', body: data }).then(function(res) {
          if (res.code === 200) {
            showToast('提现手续费设置保存成功', 'success');
          } else {
            showToast(res.message || '保存失败', 'error');
          }
        });
      };

      // 密保问题选择切换
      $('security-question').onchange = function() {
        if (this.value === 'custom') {
          $('security-question-custom').classList.remove('hidden');
          $('security-question-custom').required = true;
        } else {
          $('security-question-custom').classList.add('hidden');
          $('security-question-custom').required = false;
          $('security-question-custom').value = '';
        }
      };

      // 保存密保设置
      $('security-form').onsubmit = function(e) {
        e.preventDefault();
        var question = $('security-question').value;
        if (question === 'custom') {
          question = $('security-question-custom').value.trim();
        }
        
        if (!question) {
          alert('请选择或输入密保问题');
          return;
        }
        
        var data = {
          current_password: $('security-current-pwd').value,
          security_question: question,
          security_answer: $('security-answer').value
        };
        
        api('/settings/security', { method: 'PUT', body: data }).then(function(res) {
          if (res.code === 200) {
            alert('密保设置成功！请牢记您的密保答案。');
            $('security-form').reset();
            $('security-question-custom').classList.add('hidden');
            loadSettings();
          } else {
            alert(res.message || '设置失败');
          }
        });
      };

      // ========== 客服中心 ==========
      var msgActiveUserId = null;
      var msgConversations = [];
      var msgPollTimer = null;
      var msgAdminId = null;

      function initMessages() {
        // 获取当前管理员ID
        api('/settings/account').then(function(res) {
          if (res.code === 200) msgAdminId = res.data.id;
        });
        loadConversations();
        // 开始轮询
        if (msgPollTimer) clearInterval(msgPollTimer);
        msgPollTimer = setInterval(function() {
          loadConversations();
          if (msgActiveUserId) loadChatHistory(msgActiveUserId, true);
        }, 4000);
      }

      function loadConversations() {
        api('/messages/conversations').then(function(res) {
          if (res.code === 200) {
            msgConversations = res.data || [];
            renderConversations();
          }
        });
      }

      function renderConversations() {
        var search = ($('msg-search').value || '').toLowerCase();
        var filtered = msgConversations.filter(function(c) {
          if (!search) return true;
          return (c.username || '').toLowerCase().indexOf(search) !== -1 || (c.email || '').toLowerCase().indexOf(search) !== -1;
        });

        $('msg-conv-list').innerHTML = filtered.length === 0
          ? '<div style="padding:40px 20px;text-align:center;color:#64748b;font-size:13px;">暂无会话</div>'
          : filtered.map(function(c) {
            var isActive = c.id === msgActiveUserId;
            var avatar = c.avatar
              ? '<img src="' + c.avatar + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;" />'
              : '<div style="width:36px;height:36px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:14px;font-weight:600;">' + (c.username || '?')[0].toUpperCase() + '</div>';
            var timeStr = c.last_time ? formatMsgTime(c.last_time) : '';
            var preview = c.last_message ? (c.last_message.length > 20 ? c.last_message.substring(0, 20) + '...' : c.last_message) : '暂无消息';
            var unread = c.unread_count > 0
              ? '<span style="background:#ef4444;color:white;font-size:10px;padding:1px 6px;border-radius:10px;font-weight:600;">' + c.unread_count + '</span>'
              : '';

            return '<div onclick="selectConversation(' + c.id + ')" style="padding:12px 16px;cursor:pointer;border-bottom:1px solid #1e293b;transition:background 0.15s;' + (isActive ? 'background:#1e293b;' : '') + '" onmouseover="this.style.background=&quot;#1e293b&quot;" onmouseout="this.style.background=&quot;' + (isActive ? '#1e293b' : 'transparent') + '&quot;">' +
              '<div style="display:flex;gap:10px;align-items:center;">' +
                avatar +
                '<div style="flex:1;min-width:0;">' +
                  '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                    '<span style="font-size:13px;font-weight:600;color:white;">' + (c.username || 'Unknown') + '</span>' +
                    '<span style="font-size:10px;color:#475569;">' + timeStr + '</span>' +
                  '</div>' +
                  '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:2px;">' +
                    '<span style="font-size:12px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + preview + '</span>' +
                    unread +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>';
          }).join('');
      }

      window.filterConversations = renderConversations;

      window.selectConversation = function(userId) {
        msgActiveUserId = userId;
        renderConversations();
        api('/messages/read', { method: 'PUT', body: { targetId: userId } });
        loadChatHistory(userId);
        $('msg-chat-input').style.display = 'block';
        // 移动端：滑入聊天面板
        $('msg-chatpanel').classList.add('mobile-active');
        // 更新头部
        var conv = msgConversations.find(function(c) { return c.id === userId; });
        var backBtn = '<button id="msg-back-btn" onclick="closeMobileChat()" style="display:none;background:none;border:none;color:#94a3b8;cursor:pointer;padding:4px;margin-right:4px;font-size:18px;">←</button>';
        $('msg-chat-header').innerHTML = conv
          ? backBtn +
            '<div style="width:32px;height:32px;border-radius:50%;background:#334155;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:13px;font-weight:600;">' + (conv.username || '?')[0].toUpperCase() + '</div>' +
            '<div><div style="font-size:14px;font-weight:600;color:white;">' + (conv.username || '') + '</div>' +
            '<div style="font-size:11px;color:#64748b;">' + (conv.role === 'seller' ? '卖家' : '用户') + '</div></div>'
          : backBtn + '<span style="color:#64748b;">选择会话</span>';
      };

      window.closeMobileChat = function() {
        $('msg-chatpanel').classList.remove('mobile-active');
        msgActiveUserId = null;
        $('msg-chat-input').style.display = 'none';
      };

      function loadChatHistory(userId, silent) {
        api('/messages/history?targetId=' + userId + '&limit=100').then(function(res) {
          if (res.code === 200) {
            var msgs = res.data.list || [];
            var body = $('msg-chat-body');
            var wasAtBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 50;
            
            body.innerHTML = msgs.length === 0
              ? '<div style="text-align:center;color:#475569;font-size:13px;padding:40px;">开始对话吧</div>'
              : msgs.map(function(m) {
                var isMine = m.sender_id === (msgAdminId || 0);
                var time = new Date(m.created_at).toLocaleString('zh-CN', {hour:'2-digit',minute:'2-digit'});
                var fullTime = new Date(m.created_at).toLocaleString('zh-CN');
                return '<div style="display:flex;' + (isMine ? 'justify-content:flex-end;' : 'justify-content:flex-start;') + '" title="' + fullTime + '">' +
                  '<div style="max-width:70%;padding:10px 14px;border-radius:' + (isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px') + ';' +
                    (isMine ? 'background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;' : 'background:rgba(255,255,255,0.08);color:#e2e8f0;') +
                    'font-size:13px;line-height:1.5;word-break:break-word;">' +
                    m.content.split('<').join('&lt;').split('>').join('&gt;').split(String.fromCharCode(10)).join('<br/>') +
                    '<div style="font-size:10px;' + (isMine ? 'color:rgba(255,255,255,0.5);text-align:right;' : 'color:#64748b;') + 'margin-top:4px;">' + time + '</div>' +
                  '</div>' +
                '</div>';
              }).join('');

            if (!silent || wasAtBottom) {
              body.scrollTop = body.scrollHeight;
            }
          }
        });
      }

      window.sendMessage = function() {
        var text = $('msg-input-text').value.trim();
        if (!text || !msgActiveUserId) return;
        
        $('msg-input-text').value = '';
        $('msg-input-text').style.height = 'auto';

        // 乐观 UI：立即在本地显示
        var body = $('msg-chat-body');
        var now = new Date();
        var timeStr = now.toLocaleString('zh-CN', {hour:'2-digit',minute:'2-digit'});
        var optimisticHtml = '<div style="display:flex;justify-content:flex-end;opacity:0.6;" id="opt-msg">' +
          '<div style="max-width:70%;padding:10px 14px;border-radius:14px 14px 4px 14px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;font-size:13px;line-height:1.5;word-break:break-word;">' +
            text.split('<').join('&lt;').split('>').join('&gt;').split(String.fromCharCode(10)).join('<br/>') +
            '<div style="font-size:10px;color:rgba(255,255,255,0.5);text-align:right;margin-top:4px;">发送中...</div>' +
          '</div>' +
        '</div>';
        body.insertAdjacentHTML('beforeend', optimisticHtml);
        body.scrollTop = body.scrollHeight;
        
        api('/messages/send', {
          method: 'POST',
          body: { receiverId: msgActiveUserId, content: text }
        }).then(function(res) {
          // 移除乐观消息，加载真实数据
          var opt = document.getElementById('opt-msg');
          if (opt) opt.remove();
          if (res.code === 200) {
            loadChatHistory(msgActiveUserId);
            loadConversations();
          } else {
            showToast(res.message || '发送失败', 'error');
          }
        });
      };

      // Enter 发送，Shift+Enter 换行
      $('msg-input-text').onkeydown = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      };

      // 自动调整输入框高度
      $('msg-input-text').oninput = function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
      };

      function formatMsgTime(dateStr) {
        var d = new Date(dateStr);
        var now = new Date();
        var diffMs = now - d;
        var diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return '刚刚';
        if (diffMin < 60) return diffMin + '分钟前';
        var diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return diffHour + '小时前';
        var diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return diffDay + '天前';
        return d.toLocaleDateString('zh-CN', {month:'short', day:'numeric'});
      }

      // ========== 店铺装修 ==========
      
      function loadDesignData() {
        // 加载品牌设置
        loadBrandSettings();
        // 加载信息页面
        loadInfoPages();
        // 加载信任徽章
        api('/settings/trust-badges/all').then(function(res) {
          if (res.code === 200) {
            var badges = res.data || [];
            var defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
            $('badges-grid').innerHTML = badges.length === 0
              ? '<p style="color:#64748b;text-align:center;padding:20px;grid-column:1/-1;">暂无徽章，点击上方按钮添加</p>'
              : badges.map(function(b) {
                var iconHtml = b.icon_url
                  ? '<img src="' + b.icon_url + '" style="width:48px;height:48px;object-fit:contain;border-radius:8px;" />'
                  : '<div style="width:48px;height:48px;display:flex;align-items:center;justify-content:center;">' + defaultIcon + '</div>';
                return '<div style="background:#0f172a;border:1px solid ' + (b.is_visible ? '#1e293b' : '#7f1d1d44') + ';border-radius:12px;padding:16px;position:relative;' + (b.is_visible ? '' : 'opacity:0.5;') + '">' +
                  '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">' +
                    iconHtml +
                    '<div style="flex:1;min-width:0;">' +
                      '<h4 style="margin:0;font-size:14px;">' + b.title + '</h4>' +
                      '<p style="margin:2px 0 0;font-size:12px;color:#64748b;">' + (b.description || '') + '</p>' +
                    '</div>' +
                  '</div>' +
                  '<div style="display:flex;align-items:center;justify-content:space-between;">' +
                    '<span style="font-size:11px;color:#475569;">排序: ' + b.sort_order + ' · ' + (b.is_visible ? '<span style="color:#4ade80;">显示</span>' : '<span style="color:#f87171;">隐藏</span>') + '</span>' +
                    '<div style="display:flex;gap:6px;">' +
                      '<button class="btn-secondary btn-sm" onclick="editBadge(' + b.id + ')">编辑</button>' +
                      '<button class="btn-danger btn-sm" onclick="deleteBadge(' + b.id + ')">删除</button>' +
                    '</div>' +
                  '</div>' +
                '</div>';
              }).join('');
          }
        });
        
        // 加载站点信息
        api('/settings').then(function(res) {
          if (res.code === 200 && res.data) {
            $('design-footer-desc').value = res.data.footer_description || '';
            var sl = res.data.social_links;
            if (sl && typeof sl === 'object') {
              $('design-social-links').value = JSON.stringify(sl, null, 2);
            } else if (sl && typeof sl === 'string') {
              try { $('design-social-links').value = JSON.stringify(JSON.parse(sl), null, 2); } catch(e) { $('design-social-links').value = sl; }
            } else {
              $('design-social-links').value = '';
            }
          }
        });
      }

      // 徽章缓存
      var allBadges = [];

      window.openBadgeForm = function(badge) {
        $('badge-id').value = badge ? badge.id : '';
        $('badge-title').value = badge ? badge.title : '';
        $('badge-desc').value = badge ? badge.description || '' : '';
        $('badge-sort').value = badge ? badge.sort_order : 0;
        $('badge-visible').checked = badge ? !!badge.is_visible : true;
        $('badge-icon-url').value = badge && badge.icon_url ? badge.icon_url : '';
        $('badge-modal-title').textContent = badge ? '编辑徽章' : '添加徽章';
        
        if (badge && badge.icon_url) {
          $('badge-icon-preview').innerHTML = '<img src="' + badge.icon_url + '" style="width:48px;height:48px;object-fit:contain;" />';
          $('badge-icon-preview').style.display = 'block';
        } else {
          $('badge-icon-preview').innerHTML = '';
          $('badge-icon-preview').style.display = 'none';
        }
        
        $('badge-modal').classList.add('active');
      };

      window.closeBadgeModal = function() {
        $('badge-modal').classList.remove('active');
      };

      window.editBadge = function(id) {
        api('/settings/trust-badges/all').then(function(res) {
          if (res.code === 200) {
            var badge = (res.data || []).find(function(b) { return b.id === id; });
            if (badge) openBadgeForm(badge);
          }
        });
      };

      window.deleteBadge = function(id) {
        if (!confirm('确定删除该徽章？')) return;
        api('/settings/trust-badges/' + id, { method: 'DELETE' }).then(function(res) {
          if (res.code === 200) {
            showToast('徽章已删除', 'success');
            loadDesignData();
          } else {
            showToast(res.message || '删除失败', 'error');
          }
        });
      };

      // 徽章图标上传
      $('badge-icon-zone').onclick = function() { $('badge-icon-file').click(); };
      $('badge-icon-file').onchange = function() {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 500 * 1024) { showToast('图标大小不能超过 500KB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(e) {
          $('badge-icon-url').value = e.target.result;
          $('badge-icon-preview').innerHTML = '<img src="' + e.target.result + '" style="width:48px;height:48px;object-fit:contain;" />';
          $('badge-icon-preview').style.display = 'block';
        };
        reader.readAsDataURL(file);
      };

      // 徽章表单提交
      $('badge-form').onsubmit = function(e) {
        e.preventDefault();
        var id = $('badge-id').value;
        var data = {
          title: $('badge-title').value.trim(),
          description: $('badge-desc').value.trim(),
          icon_url: $('badge-icon-url').value || null,
          sort_order: parseInt($('badge-sort').value) || 0,
          is_visible: $('badge-visible').checked
        };
        
        var url = id ? '/settings/trust-badges/' + id : '/settings/trust-badges';
        var method = id ? 'PUT' : 'POST';
        
        api(url, { method: method, body: data }).then(function(res) {
          if (res.code === 200) {
            showToast(id ? '徽章已更新' : '徽章已添加', 'success');
            closeBadgeModal();
            loadDesignData();
          } else {
            showToast(res.message || '保存失败', 'error');
          }
        });
      };

      // ========== 品牌设置 ==========
      function loadBrandSettings() {
        api('/settings').then(function(res) {
          if (res.code === 200 && res.data) {
            var s = res.data;
            $('brand-site-name').value = s.site_name || '';
            $('brand-site-name-en').value = s.site_name_en || '';
            $('brand-page-title').value = s.page_title || '';
            $('brand-favicon-url').value = s.favicon_url || '';
            $('brand-logo-url').value = s.site_logo_url || '';
            $('brand-default-img-url').value = s.default_product_image || '';
            $('brand-theme-color').value = s.theme_color || '#6366f1';
            $('brand-theme-color-text').value = s.theme_color || '#6366f1';
            $('brand-bg-color').value = s.bg_color || '#0f172a';
            $('brand-bg-color-text').value = s.bg_color || '#0f172a';
            $('brand-contact-email').value = s.contact_email || '';
            $('brand-support-hours').value = s.support_hours || '7 x 24 小时';
            
            // Logo 预览
            if (s.site_logo_url) {
              $('brand-logo-preview').innerHTML = '<img src="' + s.site_logo_url + '" style="width:48px;height:48px;object-fit:contain;" />';
            }
            // Favicon 预览
            if (s.favicon_url) {
              $('brand-favicon-preview').innerHTML = '<img src="' + s.favicon_url + '" style="width:32px;height:32px;object-fit:contain;" />';
            }
            // 默认商品图预览
            if (s.default_product_image) {
              $('brand-default-img-preview').innerHTML = '<img src="' + s.default_product_image + '" style="width:64px;height:64px;object-fit:cover;" />';
            }
          }
        });
      }

      window.setBrandColor = function(color) {
        $('brand-theme-color').value = color;
        $('brand-theme-color-text').value = color;
      };

      window.setBgColor = function(color) {
        $('brand-bg-color').value = color;
        $('brand-bg-color-text').value = color;
      };

      window.clearBrandLogo = function() {
        $('brand-logo-url').value = '';
        $('brand-logo-preview').innerHTML = '<span style="font-size:24px;">🚀</span>';
      };

      window.clearFavicon = function() {
        $('brand-favicon-url').value = '';
        $('brand-favicon-preview').innerHTML = '<span style="font-size:16px;">🌐</span>';
      };

      window.clearDefaultImg = function() {
        $('brand-default-img-url').value = '';
        $('brand-default-img-preview').innerHTML = '<span style="color:#64748b;font-size:11px;">无</span>';
      };

      // Logo 上传
      $('brand-logo-file').onchange = function() {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 500 * 1024) { showToast('Logo 不能超过 500KB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(e) {
          $('brand-logo-url').value = e.target.result;
          $('brand-logo-preview').innerHTML = '<img src="' + e.target.result + '" style="width:48px;height:48px;object-fit:contain;" />';
        };
        reader.readAsDataURL(file);
      };

      // Favicon 上传
      $('brand-favicon-file').onchange = function() {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 200 * 1024) { showToast('Favicon 不能超过 200KB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(e) {
          $('brand-favicon-url').value = e.target.result;
          $('brand-favicon-preview').innerHTML = '<img src="' + e.target.result + '" style="width:32px;height:32px;object-fit:contain;" />';
        };
        reader.readAsDataURL(file);
      };

      // 默认商品图上传
      $('brand-default-img-file').onchange = function() {
        var file = this.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { showToast('图片不能超过 2MB', 'error'); return; }
        var reader = new FileReader();
        reader.onload = function(e) {
          $('brand-default-img-url').value = e.target.result;
          $('brand-default-img-preview').innerHTML = '<img src="' + e.target.result + '" style="width:64px;height:64px;object-fit:cover;" />';
        };
        reader.readAsDataURL(file);
      };

      // 颜色选择器联动
      $('brand-theme-color').oninput = function() { $('brand-theme-color-text').value = this.value; };
      $('brand-bg-color').oninput = function() { $('brand-bg-color-text').value = this.value; };

      // 保存品牌设置
      $('brand-form').onsubmit = function(e) {
        e.preventDefault();
        api('/settings', {
          method: 'PUT',
          body: {
            site_name: $('brand-site-name').value.trim() || '星际卡密商城',
            site_name_en: $('brand-site-name-en').value.trim() || '',
            page_title: $('brand-page-title').value.trim() || null,
            favicon_url: $('brand-favicon-url').value || null,
            site_logo_url: $('brand-logo-url').value || null,
            default_product_image: $('brand-default-img-url').value || null,
            theme_color: $('brand-theme-color-text').value.trim() || '#6366f1',
            bg_color: $('brand-bg-color-text').value.trim() || '#0f172a',
            contact_email: $('brand-contact-email').value.trim() || null,
            support_hours: $('brand-support-hours').value.trim() || null
          }
        }).then(function(res) {
          if (res.code === 200) showToast('品牌设置已保存', 'success');
          else showToast(res.message || '保存失败', 'error');
        });
      };

      // ========== 信息页面管理 ==========
      function loadInfoPages() {
        api('/settings/pages').then(function(res) {
          if (res.code === 200) {
            var pages = res.data || [];
            $('info-pages-list').innerHTML = pages.length === 0
              ? '<p style="color:#64748b;text-align:center;padding:20px;">暂无页面</p>'
              : pages.map(function(p) {
                return '<div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:#0f172a;border:1px solid #1e293b;border-radius:10px;margin-bottom:8px;">' +
                  '<div>' +
                    '<div style="font-size:14px;font-weight:600;">' + p.title + '</div>' +
                    '<div style="font-size:12px;color:#64748b;">/' + p.slug + ' · ' + (p.is_published ? '<span style="color:#4ade80;">已发布</span>' : '<span style="color:#f87171;">未发布</span>') + ' · 更新于 ' + new Date(p.updated_at).toLocaleDateString('zh-CN') + '</div>' +
                  '</div>' +
                  '<button class="btn-primary btn-sm" onclick="editInfoPage(&quot;' + p.slug + '&quot;)">编辑</button>' +
                '</div>';
              }).join('');
          }
        });
      }

      window.editInfoPage = function(slug) {
        api('/settings/pages/' + slug).then(function(res) {
          if (res.code === 200 && res.data) {
            $('page-edit-slug').value = res.data.slug;
            $('page-edit-title-input').value = res.data.title;
            $('page-edit-content').value = res.data.content || '';
            $('page-edit-title').textContent = '编辑页面: ' + res.data.title;
            $('page-edit-modal').classList.add('active');
          }
        });
      };

      window.closePageEditModal = function() {
        $('page-edit-modal').classList.remove('active');
      };

      if ($('page-edit-modal')) {
        $('page-edit-modal').onclick = function(e) { if (e.target === this) closePageEditModal(); };
      }

      $('page-edit-form').onsubmit = function(e) {
        e.preventDefault();
        var slug = $('page-edit-slug').value;
        api('/settings/pages/' + slug, {
          method: 'PUT',
          body: {
            title: $('page-edit-title-input').value.trim(),
            content: $('page-edit-content').value
          }
        }).then(function(res) {
          if (res.code === 200) {
            closePageEditModal();
            loadInfoPages();
            showToast('页面已更新', 'success');
          } else {
            showToast(res.message || '保存失败', 'error');
          }
        });
      };

      // 站点信息表单
      $('design-site-form').onsubmit = function(e) {
        e.preventDefault();
        var socialText = $('design-social-links').value.trim();
        var socialLinks = null;
        if (socialText) {
          try { socialLinks = JSON.parse(socialText); } catch(err) { showToast('社交链接 JSON 格式错误', 'error'); return; }
        }
        api('/settings', {
          method: 'PUT',
          body: {
            footer_description: $('design-footer-desc').value.trim() || null,
            social_links: socialLinks
          }
        }).then(function(res) {
          if (res.code === 200) {
            showToast('站点信息已保存', 'success');
          } else {
            showToast(res.message || '保存失败', 'error');
          }
        });
      };

      // 点击背景关闭徽章弹窗
      $('badge-modal').onclick = function(e) {
        if (e.target === this) closeBadgeModal();
      };

      // ========== 卖家审核 ==========
      window.loadSellerApplications = function() {
        api('/admin/seller/applications').then(function(res) {
          if (res.code === 200) {
            var list = res.data.list || [];
            var statusMap = { pending: '待审核', approved: '已通过', rejected: '已拒绝' };
            var badgeMap = { pending: 'badge-yellow', approved: 'badge-green', rejected: 'badge-red' };
            $('seller-apps-list').innerHTML = list.length === 0
              ? '<p style="color:#64748b;text-align:center;padding:30px;">暂无卖家申请</p>'
              : list.map(function(app) {
                return '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:12px;">' +
                  '<div style="display:flex;justify-content:space-between;align-items:start;">' +
                    '<div>' +
                      '<h4 style="margin:0 0 4px 0;">' + (app.shop_name || '未命名店铺') + '</h4>' +
                      '<p style="color:#94a3b8;font-size:12px;margin:0;">申请人: ' + (app.username || '-') + ' (' + (app.email || '') + ')</p>' +
                      '<p style="color:#94a3b8;font-size:12px;margin:4px 0;">真实姓名: ' + (app.real_name || '-') + '</p>' +
                      (app.contact_phone ? '<p style="color:#94a3b8;font-size:12px;margin:2px 0;">电话: ' + app.contact_phone + '</p>' : '') +
                      (app.shop_description ? '<p style="color:#64748b;font-size:12px;margin:4px 0;">' + app.shop_description + '</p>' : '') +
                      (app.reason ? '<p style="color:#64748b;font-size:12px;margin:4px 0;">申请理由: ' + app.reason + '</p>' : '') +
                      '<p style="color:#475569;font-size:11px;margin:6px 0 0 0;">提交时间: ' + new Date(app.created_at).toLocaleString('zh-CN') + '</p>' +
                    '</div>' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                      '<span class="badge ' + (badgeMap[app.status] || 'badge-yellow') + '">' + (statusMap[app.status] || app.status) + '</span>' +
                      (app.status === 'pending' ?
                        '<button class="btn-primary btn-sm" onclick="handleSellerApp(' + app.id + ',&quot;approve&quot;)">通过</button>' +
                        '<button class="btn-danger btn-sm" onclick="handleSellerApp(' + app.id + ',&quot;reject&quot;)">拒绝</button>'
                        : '') +
                    '</div>' +
                  '</div>' +
                '</div>';
              }).join('');
          }
        });
      };

      window.handleSellerApp = function(id, action) {
        var adminNote = '';
        if (action === 'reject') {
          adminNote = prompt('请输入拒绝原因:');
          if (adminNote === null) return;
        }
        api('/admin/seller/applications/' + id, {
          method: 'PUT',
          body: { action: action, adminNote: adminNote }
        }).then(function(res) {
          if (res.code === 200) {
            showToast(action === 'approve' ? '已通过卖家申请' : '已拒绝卖家申请', 'success');
            loadSellerApplications();
          } else {
            showToast(res.message || '操作失败', 'error');
          }
        });
      };

      // ========== 商品审核 ==========
      window.loadProductAudit = function() {
        var auditStatus = $('pa-status-filter') ? $('pa-status-filter').value : 'pending';
        api('/admin/seller/products/audit?audit_status=' + auditStatus).then(function(res) {
          if (res.code === 200) {
            var list = res.data.list || [];
            // 统计
            var statsEl = $('product-audit-stats');
            if (statsEl) {
              statsEl.innerHTML = 
                '<div style="background:#0f172a;border-radius:10px;padding:16px;text-align:center;border:1px solid #334155;">' +
                  '<div style="font-size:1.5rem;font-weight:700;color:#fbbf24;">' + (res.data.total || 0) + '</div>' +
                  '<div style="font-size:12px;color:#94a3b8;margin-top:4px;">' + (auditStatus === 'pending' ? '待审核' : auditStatus === 'approved' ? '已通过' : '已拒绝') + '</div>' +
                '</div>';
            }
            $('product-audit-list').innerHTML = list.length === 0
              ? '<p style="color:#64748b;text-align:center;padding:30px;">' + (auditStatus === 'pending' ? '🎉 暂无待审核商品' : '暂无记录') + '</p>'
              : list.map(function(p) {
                var defaultImg = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect fill="#334155" width="50" height="50"/><text x="25" y="32" text-anchor="middle" fill="#94a3b8" font-size="18">' + (p.icon || '📦') + '</text></svg>');
                var typeBadge = p.type === 'PHYSICAL'
                  ? '<span class="badge badge-purple" style="margin-left:8px;">📦 实物</span>'
                  : '<span class="badge badge-blue" style="margin-left:8px;">🔑 虚拟</span>';
                var auditBadge = '';
                if (p.audit_status === 'approved') auditBadge = '<span class="badge badge-green" style="margin-left:6px;">已通过</span>';
                else if (p.audit_status === 'rejected') auditBadge = '<span class="badge badge-red" style="margin-left:6px;">已拒绝</span>';
                var feedbackHtml = p.audit_feedback ? '<p style="color:#f87171;font-size:12px;margin:4px 0;">拒绝原因: ' + p.audit_feedback + '</p>' : '';
                return '<div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:12px;">' +
                  '<div style="display:flex;gap:16px;align-items:start;">' +
                    '<img src="' + (p.image_url || defaultImg) + '" style="width:60px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;" onerror="this.style.opacity=0" />' +
                    '<div style="flex:1;min-width:0;">' +
                      '<h4 style="margin:0 0 4px 0;">' + (p.icon || '📦') + ' ' + p.title + typeBadge + auditBadge + '</h4>' +
                      '<p style="color:#94a3b8;font-size:12px;margin:0;">卖家: <span style="color:#818cf8;">' + (p.seller_name || '未知') + '</span> · 分类: ' + (p.category_name || '-') + ' · 发货: ' + (p.delivery_type === 'manual' ? '手动' : '自动') + '</p>' +
                      '<p style="color:#94a3b8;font-size:12px;margin:4px 0;">价格: ¥' + parseFloat(p.price).toFixed(2) + ' · 库存: ' + p.stock + '</p>' +
                      (p.description ? '<p style="color:#64748b;font-size:12px;margin:4px 0;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + p.description + '</p>' : '') +
                      feedbackHtml +
                      '<p style="color:#475569;font-size:11px;margin:6px 0 0;">提交: ' + (p.created_at ? new Date(p.created_at).toLocaleString("zh-CN") : '-') + '</p>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px;flex-shrink:0;">' +
                      (auditStatus === 'pending' ?
                        '<button class="btn-primary btn-sm" onclick="handleProductAudit(' + p.id + ',&quot;approve&quot;)">✅ 通过</button>' +
                        '<button class="btn-danger btn-sm" onclick="handleProductAudit(' + p.id + ',&quot;reject&quot;)">❌ 拒绝</button>'
                        : auditStatus === 'rejected' ?
                        '<button class="btn-primary btn-sm" onclick="handleProductAudit(' + p.id + ',&quot;approve&quot;)">✅ 重新通过</button>'
                        : '') +
                    '</div>' +
                  '</div>' +
                '</div>';
              }).join('');
          }
        });
      };

      window.handleProductAudit = function(id, action) {
        var feedback = '';
        if (action === 'reject') {
          feedback = prompt('请输入拒绝原因:');
          if (feedback === null) return;
          if (!feedback.trim()) { showToast('请填写拒绝原因', 'error'); return; }
        }
        api('/admin/seller/products/' + id + '/audit', {
          method: 'PUT',
          body: { action: action, feedback: feedback }
        }).then(function(res) {
          if (res.code === 200) {
            showToast(action === 'approve' ? '商品已通过审核' : '商品已拒绝', 'success');
            loadProductAudit();
          } else {
            showToast(res.message || '操作失败', 'error');
          }
        });
      };

      // ========== 提现管理 ==========
      window.loadWithdrawals = function() {
        api('/admin/seller/withdrawals').then(function(res) {
          if (res.code === 200) {
            var list = res.data.list || [];
            var statusMap = { pending: '待处理', processing: '处理中', completed: '已完成', rejected: '已拒绝' };
            var badgeMap = { pending: 'badge-yellow', processing: 'badge-blue', completed: 'badge-green', rejected: 'badge-red' };
            var methodMap = { alipay: '支付宝', wechat: '微信', bank: '银行卡' };
            $('withdrawals-list').innerHTML = list.length === 0
              ? '<p style="color:#64748b;text-align:center;padding:30px;">暂无提现申请</p>'
              : '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;">' +
                '<thead><tr style="border-bottom:1px solid #1e293b;color:#64748b;font-size:12px;">' +
                  '<th style="padding:10px 8px;text-align:left;">卖家</th>' +
                  '<th style="padding:10px 8px;text-align:right;">金额</th>' +
                  '<th style="padding:10px 8px;text-align:left;">收款方式</th>' +
                  '<th style="padding:10px 8px;text-align:left;">收款账号</th>' +
                  '<th style="padding:10px 8px;text-align:center;">状态</th>' +
                  '<th style="padding:10px 8px;text-align:left;">申请时间</th>' +
                  '<th style="padding:10px 8px;text-align:center;">操作</th>' +
                '</tr></thead><tbody>' +
                list.map(function(wr) {
                  return '<tr style="border-bottom:1px solid #1e293b;">' +
                    '<td style="padding:10px 8px;">' + (wr.username || '-') + '<br/><span style="color:#64748b;font-size:11px;">' + (wr.email || '') + '</span></td>' +
                    '<td style="padding:10px 8px;text-align:right;font-weight:600;color:#f59e0b;">¥' + parseFloat(wr.amount).toFixed(2) + '</td>' +
                    '<td style="padding:10px 8px;">' + (methodMap[wr.payment_method] || wr.payment_method) + '</td>' +
                    '<td style="padding:10px 8px;"><span style="color:#94a3b8;">' + (wr.account_name || '') + '</span><br/><span style="font-family:monospace;font-size:11px;color:#64748b;">' + (wr.account_number || '') + '</span></td>' +
                    '<td style="padding:10px 8px;text-align:center;"><span class="badge ' + (badgeMap[wr.status] || '') + '">' + (statusMap[wr.status] || wr.status) + '</span></td>' +
                    '<td style="padding:10px 8px;color:#64748b;font-size:12px;">' + new Date(wr.created_at).toLocaleString('zh-CN') + '</td>' +
                    '<td style="padding:10px 8px;text-align:center;">' +
                      (wr.status === 'pending' || wr.status === 'processing' ?
                        '<button class="btn-primary btn-sm" style="margin-right:4px;" onclick="handleWithdrawal(' + wr.id + ',&quot;complete&quot;)">✅ 已转账</button>' +
                        '<button class="btn-danger btn-sm" onclick="handleWithdrawal(' + wr.id + ',&quot;reject&quot;)">拒绝</button>'
                        : (wr.admin_note ? '<span style="color:#64748b;font-size:11px;">' + wr.admin_note + '</span>' : '-')) +
                    '</td></tr>';
                }).join('') +
                '</tbody></table></div>';
          }
        });
      };

      window.handleWithdrawal = function(id, action) {
        var adminNote = '';
        if (action === 'reject') {
          adminNote = prompt('请输入拒绝原因:');
          if (adminNote === null) return;
        }
        if (action === 'complete') {
          if (!confirm('请确认您已通过线下方式（支付宝/微信/银行）完成转账。点击确定将标记提现为已完成。')) return;
        }
        api('/admin/seller/withdrawals/' + id, {
          method: 'PUT',
          body: { action: action, adminNote: adminNote || (action === 'complete' ? '管理员确认已转账' : '') }
        }).then(function(res) {
          if (res.code === 200) {
            showToast(action === 'complete' ? '提现已标记为完成' : '提现已拒绝', 'success');
            loadWithdrawals();
          } else {
            showToast(res.message || '操作失败', 'error');
          }
        });
      };

      // ========== 支付设置 ==========
      var pendingPaymentConfig = null; // 待保存的支付配置
      var paymentVerifyCallback = null; // 验证成功后的回调
      var paymentConfigLoaded = false; // 是否已加载过配置
      var paymentConfigDirty = false; // 用户是否有未保存的修改

      // 标记支付配置为已修改
      function markPaymentConfigDirty() {
        paymentConfigDirty = true;
      }

      // 更新支付状态栏
      function updatePaymentStatusBar(s1, s2) {
        var bar = $('payment-status-bar');
        if (!bar) return;
        
        if (!s1 && !s2) {
          bar.style.background = 'rgba(239,68,68,0.1)';
          bar.style.borderColor = 'rgba(239,68,68,0.3)';
          bar.style.color = '#fca5a5';
          bar.innerHTML = '⚠️ 所有支付系统均为关闭状态，前端将显示"维护模式"。请开启至少一个支付系统并保存。';
        } else {
          var active = [];
          if (s1) active.push('API网关支付');
          if (s2) active.push('二维码支付');
          bar.style.background = 'rgba(34,197,94,0.1)';
          bar.style.borderColor = 'rgba(34,197,94,0.3)';
          bar.style.color = '#86efac';
          bar.innerHTML = '✅ 当前已启用: ' + active.join('、') + ' — 前端支付页面正常显示';
        }
      }

      // 加载支付配置
      function loadPaymentConfig(forceReload) {
        // 如果已加载过且用户有未保存的修改，不再重新加载（除非强制刷新）
        if (paymentConfigLoaded && paymentConfigDirty && !forceReload) {
          console.log('[LoadConfig] 跳过加载（用户有未保存修改）');
          return;
        }
        
        console.log('[LoadConfig] 开始加载支付配置... forceReload:', !!forceReload);
        
        api('/admin/payment-config').then(function(res) {
          console.log('[LoadConfig] API 响应:', res.code);
          if (res.code === 200) {
            var data = res.data;
            console.log('[LoadConfig] 数据库中的开关状态:', {
              system1_enabled: data.system1_enabled,
              system2_enabled: data.system2_enabled,
              hasQrCode: !!(data.system2_config && data.system2_config.qrCodeImageUrl)
            });
            
            $('system1-enabled').checked = !!data.system1_enabled;
            $('system1-api-url').value = data.system1_config.apiUrl || '';
            $('system1-pid').value = data.system1_config.pid || '';
            $('system1-key').value = ''; // 密钥不回显
            $('system1-key').placeholder = data.system1_config.keySet ? '••••••••（已设置，留空不修改）' : '输入商户密钥';
            $('system1-notify-url').value = data.system1_config.notifyUrl || '';
            
            $('system2-enabled').checked = !!data.system2_enabled;
            $('system2-instruction').value = data.system2_config.instructionText || '';
            
            // 二维码预览
            if (data.system2_config.qrCodeImageUrl) {
              $('system2-qr-url').value = data.system2_config.qrCodeImageUrl;
              $('payment-qr-preview-img').src = data.system2_config.qrCodeImageUrl;
              $('payment-qr-preview').classList.remove('hidden');
              $('payment-qr-upload-zone').classList.add('hidden');
            } else {
              $('payment-qr-preview').classList.add('hidden');
              $('payment-qr-upload-zone').classList.remove('hidden');
            }
            
            paymentConfigLoaded = true;
            paymentConfigDirty = false;
            
            console.log('[LoadConfig] 加载完成! checkbox状态:', {
              system1: $('system1-enabled').checked,
              system2: $('system2-enabled').checked
            });
            
            // 更新状态栏
            updatePaymentStatusBar(data.system1_enabled, data.system2_enabled);
          }
        }).catch(function(err) {
          console.error('[LoadConfig] 加载失败:', err);
        });
      }
      
      // 监听支付设置字段变化
      ['system1-enabled', 'system1-api-url', 'system1-pid', 'system1-key', 'system1-notify-url', 
       'system2-enabled', 'system2-instruction'].forEach(function(id) {
        var el = $(id);
        if (el) {
          el.addEventListener('change', function() {
            markPaymentConfigDirty();
            // 开关切换时给出提示和更新状态栏
            if (id === 'system1-enabled' || id === 'system2-enabled') {
              var isOn = el.checked;
              var name = id === 'system1-enabled' ? 'API网关支付' : '二维码支付';
              showToast(name + (isOn ? ' 已开启' : ' 已关闭') + '（需点击下方"保存"按钮才能生效！）', 'info');
              // 实时预览状态栏
              var s1 = $('system1-enabled') ? $('system1-enabled').checked : false;
              var s2 = $('system2-enabled') ? $('system2-enabled').checked : false;
              updatePaymentStatusBar(s1, s2);
            }
          });
          el.addEventListener('input', markPaymentConfigDirty);
        }
      });

      // 二维码上传
      var paymentQrUploadZone = $('payment-qr-upload-zone');
      var paymentQrInput = $('payment-qr-file');
      
      if (paymentQrUploadZone && paymentQrInput) {
        // 点击上传区域触发文件选择
        paymentQrUploadZone.onclick = function() { paymentQrInput.click(); };
        
        // 拖拽效果
        paymentQrUploadZone.ondragover = function(e) {
          e.preventDefault();
          paymentQrUploadZone.classList.add('dragover');
        };
        paymentQrUploadZone.ondragleave = function() {
          paymentQrUploadZone.classList.remove('dragover');
        };
        paymentQrUploadZone.ondrop = function(e) {
          e.preventDefault();
          paymentQrUploadZone.classList.remove('dragover');
          var file = e.dataTransfer.files[0];
          if (file && file.type.startsWith('image/')) {
            handlePaymentQrFile(file);
          }
        };
        
        // 文件选择处理
        paymentQrInput.onchange = function(e) {
          var file = e.target.files[0];
          if (file) handlePaymentQrFile(file);
        };
      }
      
      // 处理二维码文件
      function handlePaymentQrFile(file) {
        var reader = new FileReader();
        reader.onload = function(ev) {
          var base64 = ev.target.result;
          $('system2-qr-url').value = base64;
          $('payment-qr-preview-img').src = base64;
          $('payment-qr-preview').classList.remove('hidden');
          $('payment-qr-upload-zone').classList.add('hidden');
          markPaymentConfigDirty(); // 标记为已修改
        };
        reader.readAsDataURL(file);
      }

      // 清除二维码
      if ($('clear-payment-qr')) {
        $('clear-payment-qr').onclick = function() {
          $('system2-qr-url').value = '';
          $('payment-qr-preview').classList.add('hidden');
          $('payment-qr-upload-zone').classList.remove('hidden');
          paymentQrInput.value = '';
          markPaymentConfigDirty(); // 标记为已修改
        };
      }

      // 密钥显示/隐藏
      if ($('toggle-key-visibility')) {
        $('toggle-key-visibility').onclick = function() {
          var keyInput = $('system1-key');
          if (keyInput.type === 'password') {
            keyInput.type = 'text';
            this.textContent = '🙈';
          } else {
            keyInput.type = 'password';
            this.textContent = '👁️';
          }
        };
      }

      // ========== 保存支付配置按钮 ==========
      // 流程: 点击保存 -> 验证支付密码 -> 获取临时令牌 -> 发送PUT请求 -> 刷新数据
      if ($('save-payment-config')) {
        $('save-payment-config').onclick = function() {
          var saveBtn = this;
          console.log('[PaymentConfig] 保存按钮点击');
          
          // 步骤1: 检查是否已设置支付密码
          api('/admin/security/security-status').then(function(statusRes) {
            if (statusRes.code !== 200) {
              showToast('获取安全状态失败', 'error');
              return;
            }
            
            // 如果未设置支付密码，引导用户去设置
            if (!statusRes.data.hasPaymentPassword) {
              showToast('请先在"安全中心"设置支付密码', 'error');
              setTimeout(function() {
                document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
                document.querySelector('.tab[data-tab="security"]').classList.add('active');
                document.querySelectorAll('[id$="-tab"]').forEach(function(t) { t.classList.add('hidden'); });
                $('security-tab').classList.remove('hidden');
                loadSecurityStatus();
              }, 1500);
              return;
            }
            
            // 步骤2: 收集表单数据（不立即发送请求）
            var qrUrlValue = $('system2-qr-url') ? $('system2-qr-url').value : '';
            
            pendingPaymentConfig = {
              system1_enabled: $('system1-enabled') ? $('system1-enabled').checked : false,
              system1_config: {
                apiUrl: $('system1-api-url') ? $('system1-api-url').value.trim() : '',
                pid: $('system1-pid') ? $('system1-pid').value.trim() : '',
                key: $('system1-key') && $('system1-key').value.trim() ? $('system1-key').value.trim() : undefined,
                notifyUrl: $('system1-notify-url') ? $('system1-notify-url').value.trim() : ''
              },
              system2_enabled: $('system2-enabled') ? $('system2-enabled').checked : false,
              system2_config: {
                qrCodeImageUrl: qrUrlValue,
                instructionText: $('system2-instruction') ? $('system2-instruction').value.trim() : ''
              }
            };
            
            console.log('[PaymentConfig] 配置已收集:', {
              system1_enabled: pendingPaymentConfig.system1_enabled,
              system2_enabled: pendingPaymentConfig.system2_enabled,
              qrLength: qrUrlValue.length
            });
            
            // 步骤3: 打开验证支付密码模态框
            showPaymentVerifyModal(function(paymentToken) {
              // 步骤4: 验证成功，获得临时令牌
              console.log('[PaymentConfig] 回调函数被调用! Token:', paymentToken ? 'YES' : 'NO');
              
              if (!paymentToken) {
                showToast('验证失败：令牌为空', 'error');
                return;
              }
              
              console.log('[PaymentConfig] 令牌获取成功，准备发送 PUT 请求...');
              console.log('[PaymentConfig] 发送数据:', JSON.stringify({
                system1_enabled: pendingPaymentConfig.system1_enabled,
                system2_enabled: pendingPaymentConfig.system2_enabled,
                system1_config_keys: Object.keys(pendingPaymentConfig.system1_config || {}),
                system2_config_keys: Object.keys(pendingPaymentConfig.system2_config || {})
              }));
              
              // 显示保存中状态
              saveBtn.disabled = true;
              saveBtn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;"><span class="spinner" style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></span> 保存中...</span>';
              showToast('正在保存配置...', 'info');
              
              // 步骤5: 发送 PUT 请求，带上令牌
              fetch('/api/admin/payment-config', {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + token,
                  'X-Payment-Token': paymentToken
                },
                body: JSON.stringify(pendingPaymentConfig)
              }).then(function(response) {
                console.log('[PaymentConfig] PUT 响应状态:', response.status);
                return response.json().then(function(data) {
                  return { status: response.status, ok: response.ok, data: data };
                });
              }).then(function(result) {
                // 恢复按钮状态
                saveBtn.disabled = false;
                saveBtn.innerHTML = '🔒 保存支付设置';
                
                if (!result.ok || result.data.code !== 200) {
                  // 保存失败
                  var errorMsg = result.data.message || ('HTTP ' + result.status);
                  console.error('[PaymentConfig] 保存失败:', errorMsg, result.data);
                  showToast('保存失败: ' + errorMsg, 'error');
                  return;
                }
                
                // 步骤6: 保存成功
                console.log('[PaymentConfig] 保存成功!', result.data);
                
                // 构建成功信息
                var s1 = pendingPaymentConfig.system1_enabled ? 'ON' : 'OFF';
                var s2 = pendingPaymentConfig.system2_enabled ? 'ON' : 'OFF';
                showToast('保存成功! API支付:' + s1 + ' / 二维码支付:' + s2, 'success');
                
                // 重置脏数据标志
                paymentConfigDirty = false;
                
                // 步骤7: 刷新数据 - 强制重新加载最新配置
                setTimeout(function() {
                  loadPaymentConfig(true);
                }, 500);
                
              }).catch(function(err) {
                // 网络错误
                saveBtn.disabled = false;
                saveBtn.innerHTML = '🔒 保存支付设置';
                console.error('[PaymentConfig] 网络错误:', err);
                showToast('网络错误: ' + err.message, 'error');
              });
            });
            
          }).catch(function(err) {
            console.error('[PaymentConfig] 安全状态检查失败:', err);
            showToast('检查安全状态失败', 'error');
          });
        };
      }

      // 显示支付验证模态框
      function showPaymentVerifyModal(callback) {
        console.log('[Modal] showPaymentVerifyModal 被调用');
        paymentVerifyCallback = callback;
        
        var modalEl = $('payment-verify-modal');
        var pwdInput = $('verify-payment-pwd');
        var errorEl = $('verify-error');
        
        if (!modalEl) {
          showToast('界面错误：找不到验证模态框', 'error');
          return;
        }
        
        // 重置表单
        if (pwdInput) pwdInput.value = '';
        if (errorEl) errorEl.classList.remove('show');
        
        // 显示模态框
        modalEl.classList.add('active');
        console.log('[Modal] 模态框已显示');
        
        // 每次显示模态框时，重新绑定确认按钮事件（确保事件有效）
        var confirmBtn = document.querySelector('#payment-verify-form button[type="submit"]');
        if (confirmBtn) {
          confirmBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[Modal] 确认按钮被点击!');
            doVerifyPaymentPassword();
            return false;
          };
          console.log('[Modal] 确认按钮事件已重新绑定');
        } else {
          console.error('[Modal] 找不到确认按钮!');
        }
        
        // 聚焦输入框
        setTimeout(function() { 
          if (pwdInput) pwdInput.focus();
        }, 100);
      }

      // 关闭验证模态框
      function closePaymentVerifyModal() {
        $('payment-verify-modal').classList.remove('active');
        paymentVerifyCallback = null;
      }

      if ($('cancel-verify')) {
        $('cancel-verify').onclick = closePaymentVerifyModal;
      }

      // 点击背景关闭
      if ($('payment-verify-modal')) {
        $('payment-verify-modal').onclick = function(e) {
          if (e.target === this) closePaymentVerifyModal();
        };
      }

      // ========== 验证支付密码 - 独立函数 ==========
      function doVerifyPaymentPassword() {
        console.log('[VerifyPwd] 开始验证支付密码...');
        
        var pwd = $('verify-payment-pwd') ? $('verify-payment-pwd').value : '';
        var submitBtn = document.querySelector('#payment-verify-form button[type="submit"]');
        var errorEl = $('verify-error');
        
        console.log('[VerifyPwd] 密码长度:', pwd ? pwd.length : 0);
        
        if (!pwd) {
          if (errorEl) {
            errorEl.textContent = '请输入支付密码';
            errorEl.classList.add('show');
          }
          return;
        }
        
        // 显示验证中状态
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '验证中...';
        }
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.classList.remove('show');
        }
        
        console.log('[VerifyPwd] 发送 API 请求...');
        
        fetch('/api/admin/security/verify-payment-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ paymentPassword: pwd })
        })
        .then(function(response) {
          console.log('[VerifyPwd] HTTP 状态:', response.status);
          return response.json();
        })
        .then(function(res) {
          console.log('[VerifyPwd] API 响应:', res);
          
          // 恢复按钮状态
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🔓 确认';
          }
          
          if (res.code === 200 && res.data && res.data.paymentToken) {
            console.log('[VerifyPwd] 验证成功');
            // 先保存回调引用，再关闭模态框（closePaymentVerifyModal 会清空 paymentVerifyCallback）
            var savedCallback = paymentVerifyCallback;
            closePaymentVerifyModal();
            if (savedCallback) {
              console.log('[VerifyPwd] 调用回调函数...');
              savedCallback(res.data.paymentToken);
            } else {
              console.error('[VerifyPwd] paymentVerifyCallback 未定义!');
              showToast('系统错误: 回调函数丢失', 'error');
            }
          } else if (res.needSetup) {
            if (errorEl) {
              errorEl.textContent = '请先设置支付密码';
              errorEl.classList.add('show');
            }
          } else {
            if (errorEl) {
              errorEl.textContent = res.message || '密码错误';
              errorEl.classList.add('show');
            }
          }
        })
        .catch(function(err) {
          console.error('[VerifyPwd] 网络错误:', err);
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '🔓 确认';
          }
          if (errorEl) {
            errorEl.textContent = '网络错误';
            errorEl.classList.add('show');
          }
        });
      }
      
      // 绑定验证表单事件
      var verifyForm = $('payment-verify-form');
      console.log('[Init] payment-verify-form:', verifyForm ? '找到' : '未找到');
      
      if (verifyForm) {
        // 表单提交
        verifyForm.onsubmit = function(e) {
          e.preventDefault();
          e.stopPropagation();
          console.log('[VerifyForm] 表单提交触发');
          doVerifyPaymentPassword();
          return false;
        };
        
        // 确认按钮直接点击
        var confirmBtn = verifyForm.querySelector('button[type="submit"]');
        if (confirmBtn) {
          confirmBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[VerifyBtn] 确认按钮点击');
            doVerifyPaymentPassword();
            return false;
          };
          console.log('[Init] 确认按钮事件已绑定');
        }
      }

      // 忘记密码链接
      if ($('modal-forgot-pwd')) {
        $('modal-forgot-pwd').onclick = function() {
          closePaymentVerifyModal();
          // 切换到安全中心标签
          document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
          document.querySelector('.tab[data-tab="security"]').classList.add('active');
          document.querySelectorAll('[id$="-tab"]').forEach(function(t) { t.classList.add('hidden'); });
          $('security-tab').classList.remove('hidden');
          loadSecurityStatus();
        };
      }

      // ========== 安全中心 ==========
      function loadSecurityStatus() {
        api('/admin/security/security-status').then(function(res) {
          if (res.code === 200) {
            var data = res.data;
            
            if (data.hasPaymentPassword) {
              // 已设置支付密码
              $('payment-pwd-icon').textContent = '✅';
              $('payment-pwd-text').textContent = '支付密码已设置';
              $('payment-pwd-hint').textContent = '可用于保护敏感操作';
              $('setup-payment-pwd-form-container').classList.add('hidden');
              $('change-payment-pwd-form-container').classList.remove('hidden');
              
              // 显示密保重置区域
              if (data.hasSecurityQuestion) {
                $('display-security-question').textContent = data.securityQuestion;
                $('reset-payment-pwd-container').classList.remove('hidden');
                $('no-security-question-hint').classList.add('hidden');
              }
            } else {
              // 未设置支付密码
              $('payment-pwd-icon').textContent = '⚠️';
              $('payment-pwd-text').textContent = '尚未设置支付密码';
              $('payment-pwd-hint').textContent = '请设置支付密码以保护支付配置';
              $('setup-payment-pwd-form-container').classList.remove('hidden');
              $('change-payment-pwd-form-container').classList.add('hidden');
              $('reset-payment-pwd-container').classList.add('hidden');
              $('no-security-question-hint').classList.remove('hidden');
            }
          }
        });
      }

      // 首次设置支付密码
      if ($('setup-payment-pwd-form')) {
        $('setup-payment-pwd-form').onsubmit = function(e) {
          e.preventDefault();
          var pwd = $('setup-payment-pwd').value;
          var confirmPwd = $('setup-payment-pwd-confirm').value;
          var question = $('setup-security-question').value;
          var answer = $('setup-security-answer').value;
          
          if (pwd !== confirmPwd) {
            showToast('两次输入的密码不一致', 'error');
            return;
          }
          if (!question) {
            showToast('请选择密保问题', 'error');
            return;
          }
          
          api('/admin/security/setup-security', {
            method: 'POST',
            body: {
              paymentPassword: pwd,
              securityQuestion: question,
              securityAnswer: answer
            }
          }).then(function(res) {
            if (res.code === 200) {
              showToast('支付密码设置成功', 'success');
              $('setup-payment-pwd-form').reset();
              loadSecurityStatus();
            } else {
              showToast(res.message || '设置失败', 'error');
            }
          });
        };
      }

      // 修改支付密码
      if ($('change-payment-pwd-form')) {
        $('change-payment-pwd-form').onsubmit = function(e) {
          e.preventDefault();
          var currentPwd = $('change-current-payment-pwd').value;
          var newPwd = $('change-new-payment-pwd').value;
          var confirmPwd = $('change-confirm-payment-pwd').value;
          
          if (newPwd !== confirmPwd) {
            showToast('两次输入的新密码不一致', 'error');
            return;
          }
          
          api('/admin/security/change-payment-password', {
            method: 'POST',
            body: {
              currentPassword: currentPwd,
              newPassword: newPwd
            }
          }).then(function(res) {
            if (res.code === 200) {
              showToast('支付密码修改成功', 'success');
              $('change-payment-pwd-form').reset();
            } else {
              showToast(res.message || '修改失败', 'error');
            }
          });
        };
      }

      // 忘记支付密码链接
      if ($('forgot-payment-pwd-link')) {
        $('forgot-payment-pwd-link').onclick = function() {
          // 滚动到密保重置区域
          $('reset-payment-pwd-container').scrollIntoView({ behavior: 'smooth' });
        };
      }

      // 重置支付密码
      if ($('reset-payment-pwd-form')) {
        $('reset-payment-pwd-form').onsubmit = function(e) {
          e.preventDefault();
          var answer = $('reset-security-answer').value;
          var newPwd = $('reset-new-payment-pwd').value;
          var confirmPwd = $('reset-confirm-payment-pwd').value;
          
          if (newPwd !== confirmPwd) {
            showToast('两次输入的新密码不一致', 'error');
            return;
          }
          
          api('/admin/security/reset-payment-password', {
            method: 'POST',
            body: {
              securityAnswer: answer,
              newPaymentPassword: newPwd
            }
          }).then(function(res) {
            if (res.code === 200) {
              showToast('支付密码重置成功', 'success');
              $('reset-payment-pwd-form').reset();
            } else {
              showToast(res.message || '重置失败', 'error');
            }
          });
        };
      }

      // 初始化
      if (token) {
        api('/auth/verify').then(function(res) {
          if (res.code === 200) showPage(true);
          else { token = null; localStorage.removeItem('admin_token'); showPage(false); }
        }).catch(function() { showPage(false); });
      } else {
        showPage(false);
      }
    })();
  </script>
</body>
</html>`;

app.get('/admin', (req, res) => {
    res.type('html').send(adminHTML);
});

// ========== 前端路由 ==========

// SPA 客户端路由中间件 — 注入动态主题色后返回 index.html
// 消除背景色闪烁：服务端直接注入 CSS 变量到 HTML
let cachedTheme = null;
let themeLastFetch = 0;

// 提供清除缓存的方法给其他模块使用
app.clearSiteThemeCache = function() { cachedTheme = null; themeLastFetch = 0; };

async function getSiteTheme() {
    if (cachedTheme && Date.now() - themeLastFetch < 30000) return cachedTheme;
    try {
        const rows = await db.query('SELECT site_name, page_title, favicon_url, site_logo_url, theme_color, bg_color, default_product_image, contact_email, support_hours, footer_description, site_description FROM site_settings WHERE id = 1');
        if (rows.length > 0) {
            const r = rows[0];
            cachedTheme = {
                primary: r.theme_color || '#6366f1',
                bg: r.bg_color || '#0f172a',
                siteName: r.site_name || '',
                pageTitle: r.page_title || '',
                faviconUrl: r.favicon_url || '',
                siteLogo: r.site_logo_url || '',
                defaultImg: r.default_product_image || '',
                contactEmail: r.contact_email || '',
                supportHours: r.support_hours || '',
                footerDesc: r.footer_description || r.site_description || ''
            };
        }
    } catch (e) {
        cachedTheme = { primary: '#6366f1', bg: '#0f172a', siteName: '', pageTitle: '', faviconUrl: '', siteLogo: '', defaultImg: '' };
    }
    themeLastFetch = Date.now();
    return cachedTheme || { primary: '#6366f1', bg: '#0f172a' };
}

// ========== Open Graph SEO 工具函数 ==========

/**
 * 转义 HTML 特殊字符（用于 OG meta content）
 */
function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * 截断文本到指定长度
 */
function truncate(str, maxLen = 160) {
    if (!str) return '';
    const s = String(str).replace(/\s+/g, ' ').trim();
    return s.length > maxLen ? s.slice(0, maxLen) + '...' : s;
}

/**
 * 构建 OG meta 标签 HTML
 * @param {object} og - { title, description, image, url, siteName, type }
 * @returns {string} HTML meta tags
 */
function buildOgTags(og) {
    const tags = [];

    // Open Graph
    tags.push(`<meta property="og:type" content="${escHtml(og.type || 'website')}">`);
    if (og.title) tags.push(`<meta property="og:title" content="${escHtml(og.title)}">`);
    if (og.description) tags.push(`<meta property="og:description" content="${escHtml(og.description)}">`);
    if (og.image) tags.push(`<meta property="og:image" content="${escHtml(og.image)}">`);
    if (og.url) tags.push(`<meta property="og:url" content="${escHtml(og.url)}">`);
    if (og.siteName) tags.push(`<meta property="og:site_name" content="${escHtml(og.siteName)}">`);

    // Twitter Card
    tags.push(`<meta name="twitter:card" content="${og.image ? 'summary_large_image' : 'summary'}">`);
    if (og.title) tags.push(`<meta name="twitter:title" content="${escHtml(og.title)}">`);
    if (og.description) tags.push(`<meta name="twitter:description" content="${escHtml(og.description)}">`);
    if (og.image) tags.push(`<meta name="twitter:image" content="${escHtml(og.image)}">`);

    return tags.join('\n    ');
}

/**
 * 获取商品 OG 数据
 */
async function getProductOg(productId) {
    try {
        const rows = await db.query(
            `SELECT p.title, p.description, p.price, p.image_url, p.type,
                    u.username AS seller_name, u.nickname AS seller_nickname
             FROM products p
             LEFT JOIN users u ON p.seller_id = u.id
             WHERE p.id = ? AND p.audit_status = 'approved' AND p.status = 1`,
            [Number(productId)]
        );
        if (rows.length === 0) return null;
        const p = rows[0];
        return {
            title: p.title || '商品详情',
            description: p.description || '',
            price: parseFloat(p.price || 0).toFixed(2),
            image: p.image_url || '',
            seller: p.seller_nickname || p.seller_name || '',
            type: p.type || 'VIRTUAL',
        };
    } catch (e) {
        console.error('getProductOg error:', e.message);
        return null;
    }
}

/**
 * 获取用户公开资料 OG 数据
 */
async function getUserOg(userId) {
    try {
        const rows = await db.query(
            `SELECT username, nickname, avatar, avatar_url, rating, review_count, sold_count,
                    is_student_verified, badge_excellent_seller
             FROM users WHERE id = ? AND status = 1`,
            [Number(userId)]
        );
        if (rows.length === 0) return null;
        const u = rows[0];
        return {
            name: u.nickname || u.username || '用户',
            avatar: u.avatar_url || u.avatar || '',
            rating: parseFloat(u.rating || 5.0).toFixed(1),
            reviewCount: u.review_count || 0,
            soldCount: u.sold_count || 0,
            verified: !!u.is_student_verified,
            excellent: !!u.badge_excellent_seller,
        };
    } catch (e) {
        console.error('getUserOg error:', e.message);
        return null;
    }
}

// ========== SPA 前端路由 + OG 注入 ==========

if (hasBuiltFrontend) {
    const indexHtml = fs.readFileSync(path.join(distPath, 'index.html'), 'utf-8');
    
    app.get('*', async (req, res, next) => {
        if (req.path.startsWith('/api/')) return next();
        if (req.path === '/admin') return next();
        if (req.path.match(/\.\w+$/)) return next();
        
        // 获取站点主题 & 配置
        const theme = await getSiteTheme();
        const configJson = JSON.stringify(theme).replace(/</g, '\\u003c');
        const siteName = theme.siteName || '星际卡密商城';
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        let injectedHtml = indexHtml;
        
        // ====== 构建页面级 OG 标签 ======
        let ogHtml = '';
        let pageTitle = theme.pageTitle || siteName;
        let pageDescription = '';

        try {
            // ── 商品详情页: /p/:id ──
            const productMatch = req.path.match(/^\/p\/(\d+)$/);
            if (productMatch) {
                const product = await getProductOg(productMatch[1]);
                if (product) {
                    pageTitle = `${product.title} - ¥${product.price} | ${siteName}`;
                    pageDescription = truncate(product.description || `${product.title} - 在${siteName}上查看`, 160);
                    const ogImage = product.image && !product.image.startsWith('data:')
                        ? (product.image.startsWith('http') ? product.image : baseUrl + product.image)
                        : (theme.defaultImg || '');
                    ogHtml = buildOgTags({
                        type: 'product',
                        title: `${product.title} - ¥${product.price}`,
                        description: pageDescription,
                        image: ogImage,
                        url: `${baseUrl}/p/${productMatch[1]}`,
                        siteName,
                    });
                }
            }

            // ── 用户主页: /u/:id ──
            const userMatch = req.path.match(/^\/u\/(\d+)$/);
            if (userMatch) {
                const user = await getUserOg(userMatch[1]);
                if (user) {
                    const badgeText = [
                        user.verified ? '🎓已认证' : '',
                        user.excellent ? '🏆优秀卖家' : '',
                    ].filter(Boolean).join(' ');
                    pageTitle = `${user.name} 的主页 | ${siteName}`;
                    pageDescription = `⭐ ${user.rating} 评分 · 已售 ${user.soldCount} 件 · ${user.reviewCount} 条评价${badgeText ? ' · ' + badgeText : ''}`;
                    const ogAvatar = user.avatar && !user.avatar.startsWith('data:')
                        ? (user.avatar.startsWith('http') ? user.avatar : baseUrl + user.avatar)
                        : '';
                    ogHtml = buildOgTags({
                        type: 'profile',
                        title: pageTitle,
                        description: pageDescription,
                        image: ogAvatar || (theme.siteLogo || ''),
                        url: `${baseUrl}/u/${userMatch[1]}`,
                        siteName,
                    });
                }
            }

            // ── 首页默认 OG ──
            if (!ogHtml) {
                pageDescription = theme.footerDesc || '专业数字商品自动发卡平台';
                ogHtml = buildOgTags({
                    type: 'website',
                    title: siteName,
                    description: pageDescription,
                    image: theme.siteLogo || '',
                    url: baseUrl + req.path,
                    siteName,
                });
            }
        } catch (ogErr) {
            console.error('OG tag generation error:', ogErr.message);
        }
        
        // ====== 替换页面标题 ======
        injectedHtml = injectedHtml.replace(/<title>[^<]*<\/title>/, '<title>' + escHtml(pageTitle) + '</title>');
        
        // ====== 替换 description ======
        if (pageDescription) {
            injectedHtml = injectedHtml.replace(
                /<meta name="description"[^>]*>/,
                `<meta name="description" content="${escHtml(truncate(pageDescription, 200))}">`
            );
        }
        
        // ====== 替换 favicon ======
        if (theme.faviconUrl) {
            injectedHtml = injectedHtml.replace(
                /<link rel="icon"[^>]*>/,
                '<link rel="icon" href="' + theme.faviconUrl.replace(/"/g, '&quot;') + '">'
            );
        }
        
        // ====== 注入 OG 标签 + CSS 变量 + 站点配置 ======
        injectedHtml = injectedHtml.replace(
            '</head>',
            `    ${ogHtml}\n    <style>:root{--primary:${theme.primary};--bg-color:${theme.bg}}body{background-color:${theme.bg}}</style><script>window.__SITE_CONFIG__=${configJson}</script>\n</head>`
        );
        res.type('html').send(injectedHtml);
    });
}

// Fallback: if SEO middleware didn't handle it (e.g., dev mode without built frontend)
app.get('*', (req, res) => {
    // 静态资源（.js/.css/.png 等）如果走到这里说明文件不存在，返回 404 而非 index.html
    // 否则浏览器会收到 text/html 导致 MIME type 错误
    if (req.path.match(/\.\w{2,}$/)) {
        return res.status(404).end();
    }
    if (hasBuiltFrontend) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        // 开发模式：提示用户使用 Vite 开发服务器
        res.send(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>星际卡密商城 - 开发模式</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            min-height: 100vh; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            color: #f8fafc;
            font-family: system-ui, -apple-system, sans-serif;
        }
        .container {
            text-align: center;
            padding: 2rem;
            max-width: 600px;
        }
        h1 { font-size: 2rem; margin-bottom: 1rem; }
        .emoji { font-size: 4rem; margin-bottom: 1rem; }
        p { color: #94a3b8; margin-bottom: 1.5rem; line-height: 1.6; }
        .status { 
            background: #22c55e20; 
            border: 1px solid #22c55e; 
            color: #22c55e;
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            display: inline-block;
            margin-bottom: 2rem;
        }
        .code {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 0.75rem;
            padding: 1.5rem;
            text-align: left;
            margin: 1rem 0;
        }
        .code pre {
            color: #6366f1;
            font-family: 'Consolas', monospace;
            font-size: 0.9rem;
            line-height: 1.8;
        }
        .link {
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 0.5rem;
            text-decoration: none;
            font-weight: 500;
            margin-top: 1rem;
            transition: background 0.2s;
        }
        .link:hover { background: #4f46e5; }
        .note { font-size: 0.85rem; color: #64748b; margin-top: 1.5rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="emoji">🚀</div>
        <h1>星际卡密商城</h1>
        <div class="status">✓ 后端 API 服务运行中</div>
        <p>你正在访问后端服务器。在开发模式下，前端需要通过 Vite 开发服务器访问。</p>
        
        <div class="code">
            <pre># 打开新终端，启动前端开发服务器
cd frontend
npm install
npm run dev</pre>
        </div>
        
        <a href="http://localhost:5173" class="link">访问前端 (localhost:5173)</a>
        
        <p class="note">
            后端 API 地址: <a href="/api" style="color:#6366f1">/api</a><br>
            前端开发地址: http://localhost:5173
        </p>
    </div>
</body>
</html>
        `);
    }
});

// ========== 错误处理 ==========

// 404 处理
app.use((req, res, next) => {
    res.status(404).json({
        code: 404,
        message: '接口不存在'
    });
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        code: 500,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ========== 启动服务 ==========

async function startServer() {
    // 测试数据库连接
    const dbConnected = await db.testConnection();
    
    if (!dbConnected) {
        console.error('数据库连接失败，请检查配置');
        console.log('请确保：');
        console.log('1. MySQL 服务已启动');
        console.log('2. .env 文件中的数据库配置正确');
        process.exit(1);
    }
    
    // 自动初始化数据库表和数据
    const dbInitialized = await initDatabase();
    if (!dbInitialized) {
        console.error('数据库初始化失败');
        process.exit(1);
    }
    
    // 绑定到 0.0.0.0 以便 Railway 等云平台可以正确访问
    app.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('========================================');
        console.log('  🚀 Space Card Shop 后端服务已启动');
        console.log('========================================');
        console.log(`  > 端口: ${PORT}`);
        console.log(`  > 绑定: 0.0.0.0`);
        console.log('========================================');
        
        if (hasBuiltFrontend) {
            console.log('  ✓ 检测到前端构建文件');
            console.log(`  > 前端地址: http://localhost:${PORT}`);
        } else {
            console.log('  ⚠ 开发模式 - 请启动 Vite 开发服务器');
            console.log('');
            console.log('  启动前端:');
            console.log('    cd frontend');
            console.log('    npm install');
            console.log('    npm run dev');
            console.log('');
            console.log('  > 前端地址: http://localhost:5173');
        }
        
        console.log('========================================');
        
        // 内置定时任务：每 5 分钟清理超时未支付订单
        setInterval(async () => {
            try {
                const db = require('./config/db');
                const expired = await db.query(
                    "SELECT id, order_no, product_id, quantity FROM orders WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)"
                );
                if (expired.length === 0) return;
                
                for (const order of expired) {
                    await db.query("UPDATE orders SET status = 'cancelled', remark = '系统自动取消：超时未支付' WHERE id = ? AND status = 'pending'", [order.id]);
                    await db.query('UPDATE card_keys SET status = 0, order_id = NULL, sold_at = NULL WHERE order_id = ?', [order.id]);
                    const stock = await db.query('SELECT COUNT(*) AS c FROM card_keys WHERE product_id = ? AND status = 0', [order.product_id]);
                    await db.query('UPDATE products SET stock = ? WHERE id = ?', [stock[0]?.c || 0, order.product_id]);
                }
                console.log('[Cron] 自动取消 ' + expired.length + ' 个超时订单');
            } catch (e) {
                console.error('[Cron] 清理失败:', e.message);
            }
        }, 5 * 60 * 1000); // 每5分钟
        console.log('  ✓ 定时任务已启动（每5分钟清理超时订单）');
    });
}

startServer();
