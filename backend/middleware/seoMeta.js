/**
 * ========================================
 * SEO Meta Injection Middleware
 * ========================================
 * 
 * PROBLEM: Vite+React SPA renders everything client-side.
 * Baidu's crawler does NOT execute JavaScript, so it sees
 * an empty <div id="root"></div> with no content.
 *
 * SOLUTION: This middleware intercepts the SPA's index.html
 * before sending it to the browser/crawler, and injects:
 *   1. Dynamic <title> and <meta> tags
 *   2. Open Graph tags (for social sharing)
 *   3. JSON-LD structured data (for rich search results)
 *   4. A <noscript> block with real HTML content (for crawlers)
 *
 * This gives Baidu/Google real content to index WITHOUT
 * needing to rewrite the entire frontend as SSR.
 */

const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// ========== Default SEO Config ==========

const DEFAULT_SEO = {
    title: '星际卡密商城 - 正版软件激活码 | Cursor账号 | Steam充值 | 自动发货',
    description: '星际卡密商城 - 专业数字商品自动发卡平台。提供Cursor账号、Steam充值卡、Office激活码、游戏点卡等正版软件密钥，7×24小时自动发货，安全快捷，售后保障。',
    keywords: 'Cursor账号,Cursor月卡,Steam充值,Steam充值卡,自动发货,卡密商城,正版激活码,Office激活码,游戏点卡,数字商品,发卡平台',
    ogImage: '/assets/og-image.png',
};

// ========== Middleware ==========

function seoMetaMiddleware(distPath) {
    // Pre-read and cache the index.html template
    let indexHtmlTemplate = null;

    function getTemplate() {
        if (indexHtmlTemplate) return indexHtmlTemplate;
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
            indexHtmlTemplate = fs.readFileSync(indexPath, 'utf-8');
        }
        return indexHtmlTemplate;
    }

    return async function (req, res, next) {
        // Only intercept GET requests for HTML pages (not API, not static assets)
        if (req.method !== 'GET') return next();
        if (req.path.startsWith('/api/')) return next();
        if (req.path.startsWith('/admin')) return next();
        if (req.path.match(/\.\w+$/)) return next(); // has file extension = static asset

        const template = getTemplate();
        if (!template) return next(); // no built frontend

        try {
            const seo = await buildSeoData(req);
            const html = injectSeo(template, seo, req);

            res.header('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } catch (error) {
            console.error('[SEO] Meta injection error:', error.message);
            next(); // Fall through to default static file serving
        }
    };
}

// ========== Build SEO Data ==========

async function buildSeoData(req) {
    const baseUrl = getBaseUrl(req);
    const query = req.query || {};

    const seo = {
        title: DEFAULT_SEO.title,
        description: DEFAULT_SEO.description,
        keywords: DEFAULT_SEO.keywords,
        ogImage: baseUrl + DEFAULT_SEO.ogImage,
        ogUrl: baseUrl + req.originalUrl,
        ogType: 'website',
        jsonLd: null,
        noscriptContent: '',
    };

    // ---- If a specific product is being viewed ----
    if (query.product) {
        try {
            const products = await db.query(
                'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ? AND p.status = 1',
                [parseInt(query.product)]
            );

            if (products.length > 0) {
                const p = products[0];
                seo.title = `${p.title} - 星际卡密商城 | 正版${p.category_name || ''}自动发货`;
                seo.description = p.description || `${p.title} - ¥${p.price}，正版授权，自动发货。${DEFAULT_SEO.description}`;
                seo.keywords = `${p.title},${p.category_name || ''},${DEFAULT_SEO.keywords}`;
                seo.ogType = 'product';

                if (p.image_url && !p.image_url.startsWith('data:')) {
                    seo.ogImage = p.image_url;
                }

                // Product JSON-LD
                seo.jsonLd = {
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: p.title,
                    description: p.description || p.title,
                    image: seo.ogImage,
                    url: seo.ogUrl,
                    brand: {
                        '@type': 'Brand',
                        name: '星际卡密商城',
                    },
                    offers: {
                        '@type': 'Offer',
                        price: p.price,
                        priceCurrency: 'CNY',
                        availability: p.stock > 0
                            ? 'https://schema.org/InStock'
                            : 'https://schema.org/OutOfStock',
                        seller: {
                            '@type': 'Organization',
                            name: '星际卡密商城',
                        },
                    },
                };

                // Noscript content for crawlers
                seo.noscriptContent = `
                    <h1>${escapeHtml(p.title)}</h1>
                    <p>${escapeHtml(p.description || '')}</p>
                    <p>价格: ¥${p.price}</p>
                    <p>库存: ${p.stock > 0 ? '有货' : '缺货'}</p>
                    <p>分类: ${escapeHtml(p.category_name || '')}</p>
                `;
            }
        } catch (e) {
            // Ignore DB errors, use defaults
        }
    }

    // ---- If a category is being viewed ----
    else if (query.category) {
        try {
            const cats = await db.query(
                'SELECT * FROM categories WHERE slug = ? AND status = 1',
                [query.category]
            );

            if (cats.length > 0) {
                const cat = cats[0];
                seo.title = `${cat.name} - 星际卡密商城 | 正版${cat.name}自动发货`;
                seo.description = cat.description
                    || `${cat.name}专区 - 正版${cat.name}，7×24小时自动发货，安全可靠。`;
                seo.keywords = `${cat.name},${DEFAULT_SEO.keywords}`;
            }
        } catch (e) {
            // Ignore
        }
    }

    // ---- Default: Homepage ----
    if (!seo.jsonLd) {
        // Build product list for homepage JSON-LD
        try {
            const products = await db.query(
                'SELECT id, title, description, price, stock, image_url FROM products WHERE status = 1 ORDER BY sales DESC LIMIT 20'
            );

            // WebSite schema
            seo.jsonLd = {
                '@context': 'https://schema.org',
                '@graph': [
                    {
                        '@type': 'WebSite',
                        name: '星际卡密商城',
                        url: baseUrl,
                        description: DEFAULT_SEO.description,
                        potentialAction: {
                            '@type': 'SearchAction',
                            target: `${baseUrl}/?search={search_term_string}`,
                            'query-input': 'required name=search_term_string',
                        },
                    },
                    {
                        '@type': 'Organization',
                        name: '星际卡密商城',
                        url: baseUrl,
                        logo: baseUrl + '/vite.svg',
                    },
                    {
                        '@type': 'ItemList',
                        name: '热门商品',
                        numberOfItems: products.length,
                        itemListElement: products.map((p, i) => ({
                            '@type': 'ListItem',
                            position: i + 1,
                            item: {
                                '@type': 'Product',
                                name: p.title,
                                description: p.description || p.title,
                                url: `${baseUrl}/?product=${p.id}`,
                                offers: {
                                    '@type': 'Offer',
                                    price: p.price,
                                    priceCurrency: 'CNY',
                                    availability: p.stock > 0
                                        ? 'https://schema.org/InStock'
                                        : 'https://schema.org/OutOfStock',
                                },
                            },
                        })),
                    },
                ],
            };

            // Noscript product listing for crawlers
            seo.noscriptContent = `
                <h1>星际卡密商城 - 正版数字商品自动发卡平台</h1>
                <p>专业的数字商品自动发卡平台，提供正版软件激活码、游戏点卡、会员充值等服务。</p>
                <h2>商品列表</h2>
                <ul>
                    ${products.map(p => `<li><a href="/?product=${p.id}">${escapeHtml(p.title)} - ¥${p.price}</a></li>`).join('\n                    ')}
                </ul>
                <p>关键词：Cursor账号、Steam充值、自动发货、正版激活码、游戏点卡</p>
            `;
        } catch (e) {
            // Use minimal defaults
        }
    }

    return seo;
}

// ========== Inject SEO into HTML ==========

function injectSeo(template, seo, req) {
    const baseUrl = getBaseUrl(req);

    // Build meta tags string
    const metaTags = [
        // Basic SEO
        `<title>${escapeHtml(seo.title)}</title>`,
        `<meta name="description" content="${escapeAttr(seo.description)}">`,
        `<meta name="keywords" content="${escapeAttr(seo.keywords)}">`,

        // Canonical URL
        `<link rel="canonical" href="${escapeAttr(seo.ogUrl)}">`,

        // Open Graph (Facebook, WeChat, etc.)
        `<meta property="og:type" content="${seo.ogType}">`,
        `<meta property="og:title" content="${escapeAttr(seo.title)}">`,
        `<meta property="og:description" content="${escapeAttr(seo.description)}">`,
        `<meta property="og:image" content="${escapeAttr(seo.ogImage)}">`,
        `<meta property="og:url" content="${escapeAttr(seo.ogUrl)}">`,
        `<meta property="og:site_name" content="星际卡密商城">`,
        `<meta property="og:locale" content="zh_CN">`,

        // Twitter Card
        `<meta name="twitter:card" content="summary_large_image">`,
        `<meta name="twitter:title" content="${escapeAttr(seo.title)}">`,
        `<meta name="twitter:description" content="${escapeAttr(seo.description)}">`,
        `<meta name="twitter:image" content="${escapeAttr(seo.ogImage)}">`,

        // Baidu verification (replace with your actual code)
        // `<meta name="baidu-site-verification" content="YOUR_BAIDU_CODE">`,

        // Google verification (replace with your actual code)
        // `<meta name="google-site-verification" content="YOUR_GOOGLE_CODE">`,

        // Additional SEO hints
        `<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">`,
        `<meta name="author" content="星际卡密商城">`,
    ].join('\n    ');

    // JSON-LD structured data
    const jsonLdScript = seo.jsonLd
        ? `<script type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>`
        : '';

    // Noscript block (visible to crawlers that don't run JS)
    const noscriptBlock = seo.noscriptContent
        ? `<noscript><div class="seo-content">${seo.noscriptContent}</div></noscript>`
        : '';

    let html = template;

    // Replace existing <title> tag
    html = html.replace(/<title>[^<]*<\/title>/, '');

    // Inject meta tags before </head>
    html = html.replace(
        '</head>',
        `    ${metaTags}\n    ${jsonLdScript}\n</head>`
    );

    // Inject noscript content after <div id="root">
    if (noscriptBlock) {
        html = html.replace(
            '<div id="root"></div>',
            `<div id="root"></div>\n    ${noscriptBlock}`
        );
    }

    return html;
}

// ========== Utilities ==========

function getBaseUrl(req) {
    if (process.env.FRONTEND_URL) {
        return process.env.FRONTEND_URL.replace(/\/$/, '');
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

module.exports = seoMetaMiddleware;
