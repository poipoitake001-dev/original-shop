#!/usr/bin/env node
/**
 * ========================================
 * Baidu URL Push Script
 * 百度搜索资源平台 - URL 主动推送
 * ========================================
 *
 * This script fetches all URLs from the sitemap endpoint
 * and pushes them to Baidu's Webmaster API for indexing.
 *
 * Prerequisites:
 *   1. Register at https://ziyuan.baidu.com
 *   2. Verify your domain ownership
 *   3. Get your push token from: 搜索服务 → 资源提交 → API提交
 *
 * Usage:
 *   node scripts/baidu-push.js --site=https://yoursite.com --token=YOUR_TOKEN
 *
 * Or with environment variables:
 *   BAIDU_PUSH_SITE=https://yoursite.com BAIDU_PUSH_TOKEN=xxx node scripts/baidu-push.js
 *
 * Or via npm script (add to package.json):
 *   "scripts": { "baidu-push": "node scripts/baidu-push.js" }
 *
 * Recommended: Run daily via cron
 *   0 6 * * * cd /opt/space-card-shop && node scripts/baidu-push.js >> /var/log/baidu-push.log 2>&1
 */

const http = require('http');
const https = require('https');

// ========== Configuration ==========

function getConfig() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        const [key, val] = arg.replace(/^--/, '').split('=');
        if (key && val) args[key] = val;
    });

    const site = args.site || process.env.BAIDU_PUSH_SITE || '';
    const token = args.token || process.env.BAIDU_PUSH_TOKEN || '';

    if (!site || !token) {
        console.error('');
        console.error('  ❌ Missing required parameters');
        console.error('');
        console.error('  Usage:');
        console.error('    node scripts/baidu-push.js --site=https://yoursite.com --token=YOUR_BAIDU_TOKEN');
        console.error('');
        console.error('  Or set environment variables:');
        console.error('    BAIDU_PUSH_SITE=https://yoursite.com');
        console.error('    BAIDU_PUSH_TOKEN=YOUR_BAIDU_TOKEN');
        console.error('');
        console.error('  Get your token from:');
        console.error('    https://ziyuan.baidu.com → 搜索服务 → 资源提交 → API提交');
        console.error('');
        process.exit(1);
    }

    return { site: site.replace(/\/$/, ''), token };
}

// ========== Fetch Sitemap URLs ==========

async function fetchSitemapUrls(site) {
    const sitemapUrl = `${site}/sitemap-urls.json`;

    console.log(`  [1/3] Fetching URLs from: ${sitemapUrl}`);

    return new Promise((resolve, reject) => {
        const client = sitemapUrl.startsWith('https') ? https : http;

        client.get(sitemapUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json.urls || []);
                } catch (e) {
                    // Fallback: parse sitemap.xml
                    console.log('  [!] JSON endpoint not available, trying sitemap.xml...');
                    fetchSitemapXml(site).then(resolve).catch(reject);
                }
            });
        }).on('error', (err) => {
            console.log('  [!] Cannot reach sitemap-urls.json, trying sitemap.xml...');
            fetchSitemapXml(site).then(resolve).catch(reject);
        });
    });
}

async function fetchSitemapXml(site) {
    const sitemapUrl = `${site}/sitemap.xml`;

    return new Promise((resolve, reject) => {
        const client = sitemapUrl.startsWith('https') ? https : http;

        client.get(sitemapUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Simple XML parsing for <loc>...</loc>
                const urls = [];
                const regex = /<loc>([^<]+)<\/loc>/g;
                let match;
                while ((match = regex.exec(data)) !== null) {
                    urls.push(match[1]);
                }
                resolve(urls);
            });
        }).on('error', reject);
    });
}

// ========== Push to Baidu ==========

async function pushToBaidu(site, token, urls) {
    if (urls.length === 0) {
        console.log('  [!] No URLs to push');
        return;
    }

    console.log(`  [2/3] Pushing ${urls.length} URLs to Baidu...`);

    // Baidu API endpoint
    const apiUrl = `http://data.zz.baidu.com/urls?site=${encodeURIComponent(site)}&token=${token}`;

    // Baidu expects one URL per line
    const body = urls.join('\n');

    return new Promise((resolve, reject) => {
        const urlObj = new URL(apiUrl);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 80,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain',
                'Content-Length': Buffer.byteLength(body),
            },
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    resolve({ raw: data });
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ========== Main ==========

async function main() {
    console.log('');
    console.log('  ═══════════════════════════════════════');
    console.log('   Baidu URL Push — 百度主动推送');
    console.log('  ═══════════════════════════════════════');
    console.log('');

    const { site, token } = getConfig();
    console.log(`  Site:  ${site}`);
    console.log(`  Token: ${token.substring(0, 8)}...`);
    console.log('');

    try {
        // Step 1: Fetch URLs
        const urls = await fetchSitemapUrls(site);
        console.log(`  [✓] Found ${urls.length} URLs`);

        if (urls.length > 0) {
            console.log('');
            urls.forEach((u, i) => console.log(`      ${i + 1}. ${u}`));
            console.log('');
        }

        // Step 2: Push to Baidu
        const result = await pushToBaidu(site, token, urls);

        // Step 3: Report
        console.log('  [3/3] Baidu Response:');
        console.log('');

        if (result.success !== undefined) {
            console.log(`    ✅ Success: ${result.success} URLs accepted`);
            if (result.remain !== undefined) {
                console.log(`    📊 Remaining quota today: ${result.remain}`);
            }
            if (result.not_same_site && result.not_same_site.length > 0) {
                console.log(`    ⚠️  Not same site: ${result.not_same_site.join(', ')}`);
            }
            if (result.not_valid && result.not_valid.length > 0) {
                console.log(`    ⚠️  Invalid URLs: ${result.not_valid.join(', ')}`);
            }
        } else if (result.error !== undefined) {
            console.log(`    ❌ Error ${result.error}: ${result.message || 'Unknown error'}`);
            console.log('');
            console.log('    Common errors:');
            console.log('      400: Token mismatch or site not verified');
            console.log('      401: Invalid token');
            console.log('      404: Site not registered in Baidu Webmaster');
            console.log('      500: Baidu server error, try again later');
        } else {
            console.log('    Response:', JSON.stringify(result, null, 2));
        }

        console.log('');
        console.log('  ═══════════════════════════════════════');
        console.log(`  Completed at: ${new Date().toLocaleString('zh-CN')}`);
        console.log('  ═══════════════════════════════════════');
        console.log('');

    } catch (error) {
        console.error(`  ❌ Error: ${error.message}`);
        process.exit(1);
    }
}

main();
