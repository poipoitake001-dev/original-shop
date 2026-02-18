/**
 * ========================================
 * SEO Routes — sitemap.xml / robots.txt
 * Dynamically generated from database
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');

/**
 * GET /sitemap.xml
 * 
 * Generates a complete XML sitemap including:
 * - Static pages (homepage, categories)
 * - Dynamic product pages (fetched from DB)
 * - Proper lastmod, changefreq, priority
 */
router.get('/sitemap.xml', async (req, res) => {
    try {
        const baseUrl = getBaseUrl(req);

        // Fetch all active products
        const products = await db.query(
            'SELECT id, title, updated_at FROM products WHERE status = 1 ORDER BY id ASC'
        );

        // Fetch all active categories
        const categories = await db.query(
            'SELECT id, slug, updated_at FROM categories WHERE status = 1 ORDER BY id ASC'
        );

        const now = new Date().toISOString().split('T')[0];

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
        xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

        // --- Homepage (highest priority) ---
        xml += buildUrl(baseUrl, '/', now, 'daily', '1.0');

        // --- Category pages ---
        for (const cat of categories) {
            const lastmod = cat.updated_at
                ? new Date(cat.updated_at).toISOString().split('T')[0]
                : now;
            xml += buildUrl(baseUrl, `/?category=${cat.slug}`, lastmod, 'weekly', '0.8');
        }

        // --- Product pages ---
        for (const product of products) {
            const lastmod = product.updated_at
                ? new Date(product.updated_at).toISOString().split('T')[0]
                : now;
            xml += buildUrl(baseUrl, `/?product=${product.id}`, lastmod, 'weekly', '0.7');
        }

        xml += '</urlset>';

        res.header('Content-Type', 'application/xml; charset=utf-8');
        res.header('Cache-Control', 'public, max-age=3600'); // 1 hour cache
        res.send(xml);

    } catch (error) {
        console.error('[SEO] Sitemap generation error:', error.message);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><urlset></urlset>');
    }
});

/**
 * GET /robots.txt
 */
router.get('/robots.txt', (req, res) => {
    const baseUrl = getBaseUrl(req);

    const robotsTxt = [
        '# Space Card Shop - robots.txt',
        '',
        'User-agent: *',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /admin',
        '',
        '# Baidu Spider',
        'User-agent: Baiduspider',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /admin',
        '',
        '# Google Bot',
        'User-agent: Googlebot',
        'Allow: /',
        'Disallow: /api/',
        'Disallow: /admin',
        '',
        `Sitemap: ${baseUrl}/sitemap.xml`,
        '',
    ].join('\n');

    res.header('Content-Type', 'text/plain; charset=utf-8');
    res.header('Cache-Control', 'public, max-age=86400'); // 24h cache
    res.send(robotsTxt);
});

/**
 * GET /sitemap-urls.json
 * 
 * JSON endpoint returning all URLs (used by baidu-push.js script)
 */
router.get('/sitemap-urls.json', async (req, res) => {
    try {
        const baseUrl = getBaseUrl(req);

        const products = await db.query(
            'SELECT id FROM products WHERE status = 1 ORDER BY id ASC'
        );
        const categories = await db.query(
            'SELECT slug FROM categories WHERE status = 1 ORDER BY id ASC'
        );

        const urls = [
            baseUrl + '/',
            ...categories.map(c => `${baseUrl}/?category=${c.slug}`),
            ...products.map(p => `${baseUrl}/?product=${p.id}`),
        ];

        res.json({ total: urls.length, urls });
    } catch (error) {
        console.error('[SEO] sitemap-urls error:', error.message);
        res.status(500).json({ total: 0, urls: [] });
    }
});

// ========== Helpers ==========

function getBaseUrl(req) {
    if (process.env.FRONTEND_URL) {
        return process.env.FRONTEND_URL.replace(/\/$/, '');
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}`;
}

function buildUrl(base, path, lastmod, changefreq, priority) {
    return [
        '  <url>',
        `    <loc>${base}${path}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        `    <changefreq>${changefreq}</changefreq>`,
        `    <priority>${priority}</priority>`,
        '  </url>\n',
    ].join('\n');
}

module.exports = router;
