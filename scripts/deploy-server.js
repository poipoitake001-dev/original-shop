#!/usr/bin/env node
/**
 * ============================================================
 * Space Card Shop — Deployment Assistant v3.1 (Web GUI)
 * 
 * Zero-dependency Node.js server. Features:
 *   - System prerequisite checker
 *   - Domain configuration (read/write .env + vercel.json)
 *   - Docker .env generator with auto-generated secrets
 *   - Cloud deploy (git push) + Docker deploy
 *   - Nginx domain auto-configuration
 *   - Database backup & restore
 *   - Service health monitor
 *   - Real-time SSE log streaming
 *
 * Usage:  npm run deploy
 * ============================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync, spawn } = require('child_process');
const os = require('os');

const PORT = 9527;
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(__dirname, 'public');

// ======================== Utility Functions ========================

function readEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf-8');
    const env = {};
    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        env[trimmed.substring(0, eqIdx).trim()] = trimmed.substring(eqIdx + 1).trim();
    }
    return env;
}

function writeEnv(filePath, updates) {
    let lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split('\n') : [];
    const updated = new Set();
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq === -1) continue;
        const key = t.substring(0, eq).trim();
        if (key in updates) { lines[i] = `${key}=${updates[key]}`; updated.add(key); }
    }
    for (const [k, v] of Object.entries(updates)) {
        if (!updated.has(k)) lines.push(`${k}=${v}`);
    }
    fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
}

function tryExec(cmd) {
    try { return execSync(cmd, { encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }).trim(); }
    catch { return null; }
}

function randomSecret(len) {
    return crypto.randomBytes(len).toString('base64url').substring(0, len);
}

function fileExists(p) { return fs.existsSync(p); }
function fileSize(p) { try { return fs.statSync(p).size; } catch { return 0; } }

// ======================== SSE Broadcast ========================

let sseClients = [];
function broadcast(type, data) {
    const msg = `data: ${JSON.stringify({ type, data, ts: Date.now() })}\n\n`;
    sseClients = sseClients.filter(r => { try { r.write(msg); return true; } catch { return false; } });
}
function log(m)        { broadcast('log', m); console.log(m); }
function logSuccess(m) { broadcast('success', m); console.log('[OK]', m); }
function logError(m)   { broadcast('error', m); console.error('[ERR]', m); }

// ======================== Shell Runner ========================

function runShell(cmd, cwd) {
    return new Promise(resolve => {
        log(`$ ${cmd}`);
        const isWin = os.platform() === 'win32';
        const child = spawn(isWin ? 'cmd.exe' : '/bin/bash', isWin ? ['/c', cmd] : ['-c', cmd],
            { cwd: cwd || ROOT, env: { ...process.env, FORCE_COLOR: '0' } });
        let output = '';
        child.stdout.on('data', d => { const s = d.toString(); output += s; s.split('\n').filter(l => l.trim()).forEach(l => broadcast('log', l.trim())); });
        child.stderr.on('data', d => { const s = d.toString(); output += s; s.split('\n').filter(l => l.trim()).forEach(l => broadcast('log', l.trim())); });
        child.on('close', code => { resolve({ code, output }); });
        child.on('error', e => { logError(e.message); resolve({ code: 1, output: e.message }); });
    });
}

// ======================== API: System Check ========================

function systemCheck() {
    const c = {};
    const nodeV = tryExec('node --version');
    c.node = { ok: !!nodeV, version: nodeV || 'Not found', label: 'Node.js', required: true };

    const gitV = tryExec('git --version');
    c.git = { ok: !!gitV, version: gitV || 'Not found', label: 'Git', required: true,
              fix: !gitV ? 'https://git-scm.com/downloads' : null };

    const npmV = tryExec('npm --version');
    c.npm = { ok: !!npmV, version: npmV ? `v${npmV}` : 'Not found', label: 'npm', required: true };

    const dockerV = tryExec('docker --version');
    c.docker = { ok: !!dockerV, version: dockerV || 'Not installed', label: 'Docker', required: false,
                 fix: !dockerV ? 'https://docs.docker.com/get-docker/' : null };

    const composeV = tryExec('docker compose version');
    c.compose = { ok: !!composeV, version: composeV || 'Not installed', label: 'Docker Compose', required: false };

    const vercelV = tryExec('vercel --version');
    c.vercel = { ok: !!vercelV, version: vercelV ? `v${vercelV}` : 'Not installed', label: 'Vercel CLI', required: false };

    const remote = tryExec(`git -C "${ROOT}" remote get-url origin`);
    c.remote = { ok: !!remote, version: remote || 'No remote', label: 'Git Remote', required: false };

    c.dockerfile = { ok: fileExists(path.join(ROOT, 'Dockerfile')), version: fileExists(path.join(ROOT, 'Dockerfile')) ? 'Found' : 'Missing', label: 'Dockerfile', required: false };
    c.dockerCompose = { ok: fileExists(path.join(ROOT, 'docker-compose.yml')), version: fileExists(path.join(ROOT, 'docker-compose.yml')) ? 'Found' : 'Missing', label: 'docker-compose.yml', required: false };

    // Project health
    const fePackage = fileExists(path.join(ROOT, 'frontend', 'package.json'));
    const bePackage = fileExists(path.join(ROOT, 'backend', 'package.json'));
    c.project = { ok: fePackage && bePackage, version: fePackage && bePackage ? 'frontend + backend OK' : 'Incomplete', label: 'Project Files', required: true };

    return c;
}

// ======================== API: Project Info ========================

function getProjectInfo() {
    const feEnv = readEnv(path.join(ROOT, 'frontend', '.env'));
    const beEnv = readEnv(path.join(ROOT, 'backend', '.env'));
    const rootEnv = readEnv(path.join(ROOT, '.env'));

    let currentBackend = '';
    try {
        const vj = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend', 'vercel.json'), 'utf-8'));
        for (const r of (vj.rewrites || [])) {
            if (r.source === '/api/:path*') {
                const m = r.destination.match(/https?:\/\/([^/]+)/);
                if (m) currentBackend = m[1];
            }
        }
    } catch {}

    // Docker .env presence
    const hasDockerEnv = fileExists(path.join(ROOT, '.env'));

    return {
        frontendApiUrl: feEnv.VITE_API_URL || '',
        backendFrontendUrl: beEnv.FRONTEND_URL || '',
        backendPort: beEnv.PORT || '3000',
        currentBackend,
        jwtSet: !!(beEnv.JWT_SECRET || rootEnv.JWT_SECRET),
        mysqlHost: beEnv.DB_HOST || rootEnv.MYSQL_USER || '',
        hasDockerEnv,
        dockerEnv: hasDockerEnv ? {
            domain: (rootEnv.FRONTEND_URL || '').replace(/^https?:\/\//, ''),
            mysqlUser: rootEnv.MYSQL_USER || '',
            mysqlDb: rootEnv.MYSQL_DATABASE || '',
        } : null
    };
}

// ======================== API: Save Domain ========================

function saveDomainConfig(frontendDomain, backendDomain) {
    frontendDomain = frontendDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    backendDomain = backendDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const results = [];

    // frontend/.env
    writeEnv(path.join(ROOT, 'frontend', '.env'), { VITE_API_URL: `https://${backendDomain}/api` });
    results.push({ file: 'frontend/.env', key: 'VITE_API_URL', ok: true });

    // frontend/vercel.json
    const vjPath = path.join(ROOT, 'frontend', 'vercel.json');
    try {
        const vj = JSON.parse(fs.readFileSync(vjPath, 'utf-8'));
        for (const r of (vj.rewrites || [])) {
            if (r.source === '/api/:path*') r.destination = `https://${backendDomain}/api/:path*`;
        }
        fs.writeFileSync(vjPath, JSON.stringify(vj, null, 2), 'utf-8');
        results.push({ file: 'frontend/vercel.json', key: 'rewrites', ok: true });
    } catch { results.push({ file: 'frontend/vercel.json', key: 'rewrites', ok: false }); }

    // backend/.env
    const bePath = path.join(ROOT, 'backend', '.env');
    if (fileExists(bePath)) {
        writeEnv(bePath, { FRONTEND_URL: `https://${frontendDomain}` });
        results.push({ file: 'backend/.env', key: 'FRONTEND_URL', ok: true });
    }

    return results;
}

// ======================== API: Generate Docker .env ========================

function generateDockerEnv(domain) {
    domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const envPath = path.join(ROOT, '.env');
    const content = [
        `# Auto-generated by Deploy Assistant on ${new Date().toISOString()}`,
        '',
        `FRONTEND_URL=https://${domain}`,
        '',
        `MYSQL_ROOT_PASSWORD=${randomSecret(32)}`,
        `MYSQL_DATABASE=space_card_shop`,
        `MYSQL_USER=cardshop`,
        `MYSQL_PASSWORD=${randomSecret(32)}`,
        `MYSQL_EXTERNAL_PORT=127.0.0.1:3307`,
        '',
        `JWT_SECRET=${randomSecret(64)}`,
        `JWT_EXPIRES_IN=7d`,
        '',
        `NODE_ENV=production`,
        `PORT=3000`,
    ].join('\n');

    fs.writeFileSync(envPath, content, 'utf-8');
    fs.chmodSync(envPath, 0o600);
    return { ok: true, domain };
}

// ======================== API: Nginx Config ========================

function updateNginxDomain(domain) {
    domain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const confPath = path.join(ROOT, 'nginx', 'conf.d', 'default.conf');
    const initPath = path.join(ROOT, 'nginx', 'conf.d', 'default.conf.initial');
    const results = [];

    // Use initial template if conf doesn't exist
    const templatePath = fileExists(confPath) ? confPath : initPath;
    if (!fileExists(templatePath)) {
        return [{ file: 'nginx config', ok: false, msg: 'Template not found' }];
    }

    let content = fs.readFileSync(templatePath, 'utf-8');
    // Replace any placeholder or old domain
    content = content.replace(/YOUR_DOMAIN\.com/g, domain);
    content = content.replace(/server_name\s+[^;]+;/g, `server_name ${domain} www.${domain};`);

    fs.writeFileSync(confPath, content, 'utf-8');
    results.push({ file: 'nginx/conf.d/default.conf', ok: true, msg: `Domain set to ${domain}` });
    return results;
}

// ======================== API: Database Backup ========================

async function backupDatabase() {
    const rootEnv = readEnv(path.join(ROOT, '.env'));
    const beEnv = readEnv(path.join(ROOT, 'backend', '.env'));
    const dbPassword = rootEnv.MYSQL_ROOT_PASSWORD || beEnv.DB_PASSWORD;
    const dbName = rootEnv.MYSQL_DATABASE || beEnv.DB_NAME || 'space_card_shop';

    if (!dbPassword) return { ok: false, msg: 'No database password found in .env' };

    const backupDir = path.join(ROOT, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const filename = `backup_${ts}.sql`;
    const filePath = path.join(backupDir, filename);

    // Try Docker first, then local mysql
    let result;
    if (tryExec('docker compose ps mysql')) {
        log('Backing up from Docker MySQL...');
        result = await runShell(
            `docker compose exec -T mysql mysqldump -u root -p"${dbPassword}" --single-transaction ${dbName} > "${filePath}"`,
            ROOT
        );
    } else {
        log('Backing up from local MySQL...');
        const host = beEnv.DB_HOST || 'localhost';
        const port = beEnv.DB_PORT || '3306';
        const user = beEnv.DB_USER || 'root';
        result = await runShell(
            `mysqldump -h ${host} -P ${port} -u ${user} -p"${dbPassword}" --single-transaction ${dbName} > "${filePath}"`,
            ROOT
        );
    }

    if (result.code === 0 && fileSize(filePath) > 100) {
        const size = (fileSize(filePath) / 1024).toFixed(1);
        logSuccess(`Backup saved: ${filename} (${size} KB)`);
        return { ok: true, file: filename, size: `${size} KB` };
    } else {
        try { fs.unlinkSync(filePath); } catch {}
        logError('Backup failed or empty');
        return { ok: false, msg: 'Backup command failed' };
    }
}

function listBackups() {
    const dir = path.join(ROOT, 'backups');
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
        .filter(f => f.endsWith('.sql') || f.endsWith('.sql.gz'))
        .map(f => ({
            name: f,
            size: `${(fileSize(path.join(dir, f)) / 1024).toFixed(1)} KB`,
            date: fs.statSync(path.join(dir, f)).mtime.toISOString(),
        }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 20);
}

// ======================== API: Health Check ========================

async function healthCheck() {
    const services = {};

    // Backend API
    try {
        const beEnv = readEnv(path.join(ROOT, 'backend', '.env'));
        const port = beEnv.PORT || '3000';
        const ok = await httpPing(`http://localhost:${port}/api/products`, 3000);
        services.backend = { ok, label: 'Backend API', url: `localhost:${port}` };
    } catch { services.backend = { ok: false, label: 'Backend API', url: '' }; }

    // Docker containers
    if (tryExec('docker compose ps')) {
        const ps = tryExec(`docker compose -f "${path.join(ROOT, 'docker-compose.yml')}" ps --format "{{.Name}}:{{.Status}}"`);
        if (ps) {
            for (const line of ps.split('\n')) {
                const [name, status] = line.split(':');
                if (name && status) {
                    services['docker_' + name.trim()] = {
                        ok: status.toLowerCase().includes('up'),
                        label: name.trim(),
                        url: status.trim()
                    };
                }
            }
        }
    }

    return services;
}

function httpPing(url, timeout) {
    return new Promise(resolve => {
        const req = http.get(url, { timeout }, res => {
            resolve(res.statusCode >= 200 && res.statusCode < 500);
            res.resume();
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => { req.destroy(); resolve(false); });
    });
}

// ======================== HTTP Server ========================

const MIME = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'application/javascript',
    '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // SSE
    if (url.pathname === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
        res.write(`data: ${JSON.stringify({ type: 'connected', data: 'ok' })}\n\n`);
        sseClients.push(res);
        req.on('close', () => { sseClients = sseClients.filter(c => c !== res); });
        return;
    }

    // API
    if (url.pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');
        let body = {};
        if (req.method === 'POST') {
            const chunks = [];
            for await (const c of req) chunks.push(c);
            try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch {}
        }
        try {
            return await handleApi(url.pathname, req.method, body, res);
        } catch (e) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: e.message }));
        }
    }

    // Static
    let fp = url.pathname === '/' ? '/index.html' : url.pathname;
    fp = path.join(PUBLIC, fp);
    if (!fs.existsSync(fp)) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', MIME[path.extname(fp)] || 'application/octet-stream');
    fs.createReadStream(fp).pipe(res);
});

async function handleApi(pathname, method, body, res) {
    const json = d => res.end(JSON.stringify(d));
    const fail = (c, m) => { res.statusCode = c; json({ error: m }); };

    switch (pathname) {
        case '/api/system-check':
            return json(systemCheck());

        case '/api/project-info':
            return json(getProjectInfo());

        case '/api/health':
            return json(await healthCheck());

        case '/api/backups':
            return json(listBackups());

        case '/api/save-domain':
            if (method !== 'POST') return fail(405, 'POST only');
            if (!body.frontendDomain || !body.backendDomain) return fail(400, 'Both domains required');
            log('Saving domain configuration...');
            const domainResults = saveDomainConfig(body.frontendDomain, body.backendDomain);
            domainResults.filter(r => r.ok).forEach(r => log(`  ${r.file} -> ${r.key} updated`));
            logSuccess('Domain configuration saved');
            return json({ ok: true, results: domainResults });

        case '/api/generate-docker-env':
            if (method !== 'POST') return fail(405, 'POST only');
            if (!body.domain) return fail(400, 'Domain required');
            log('Generating Docker .env with secure secrets...');
            const envResult = generateDockerEnv(body.domain);
            logSuccess(`.env created for ${envResult.domain}`);
            return json(envResult);

        case '/api/update-nginx':
            if (method !== 'POST') return fail(405, 'POST only');
            if (!body.domain) return fail(400, 'Domain required');
            log('Updating Nginx configuration...');
            const nginxResults = updateNginxDomain(body.domain);
            nginxResults.filter(r => r.ok).forEach(r => log(`  ${r.msg}`));
            return json({ ok: true, results: nginxResults });

        case '/api/deploy-cloud':
            if (method !== 'POST') return fail(405, 'POST only');
            log('=== Cloud Deployment ===');
            await runShell('git add frontend/.env frontend/vercel.json', ROOT);
            await runShell(`git commit -m "${body.commitMsg || 'chore: update config'}" --allow-empty`, ROOT);
            const push = await runShell('git push', ROOT);
            if (push.code === 0) logSuccess('Pushed to remote! Vercel will auto-redeploy.');
            else logError('Git push failed');
            return json({ ok: push.code === 0 });

        case '/api/deploy-docker':
            if (method !== 'POST') return fail(405, 'POST only');
            log('=== Docker Deployment ===');
            if (!fileExists(path.join(ROOT, '.env'))) {
                logError('Missing .env — generate it in Step 2 first');
                return json({ ok: false, msg: 'Missing .env' });
            }
            log('Building images (may take several minutes)...');
            const build = await runShell('docker compose build', ROOT);
            if (build.code !== 0) { logError('Build failed'); return json({ ok: false }); }
            log('Starting containers...');
            const up = await runShell('docker compose up -d', ROOT);
            if (up.code === 0) {
                logSuccess('All containers running!');
                // Wait and check
                await new Promise(r => setTimeout(r, 5000));
                const health = await healthCheck();
                return json({ ok: true, health });
            }
            logError('docker compose up failed');
            return json({ ok: false });

        case '/api/backup-db':
            if (method !== 'POST') return fail(405, 'POST only');
            log('=== Database Backup ===');
            const bkResult = await backupDatabase();
            return json(bkResult);

        case '/api/stop-docker':
            if (method !== 'POST') return fail(405, 'POST only');
            log('Stopping all containers...');
            const stop = await runShell('docker compose down', ROOT);
            if (stop.code === 0) logSuccess('All containers stopped');
            return json({ ok: stop.code === 0 });

        case '/api/restart-docker':
            if (method !== 'POST') return fail(405, 'POST only');
            log('Restarting containers...');
            const restart = await runShell('docker compose restart', ROOT);
            if (restart.code === 0) logSuccess('All containers restarted');
            return json({ ok: restart.code === 0 });

        default:
            return fail(404, 'Unknown API');
    }
}

// ======================== Start ========================

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log('');
    console.log('  \x1b[36m╔══════════════════════════════════════════════╗\x1b[0m');
    console.log('  \x1b[36m║\x1b[0m  \x1b[1mSpace Card Shop — Deploy Assistant v3.1\x1b[0m     \x1b[36m║\x1b[0m');
    console.log(`  \x1b[36m║\x1b[0m  ${url}                          \x1b[36m║\x1b[0m`);
    console.log('  \x1b[36m╚══════════════════════════════════════════════╝\x1b[0m');
    console.log('');
    const opener = os.platform() === 'win32' ? 'start' : os.platform() === 'darwin' ? 'open' : 'xdg-open';
    try { execSync(`${opener} ${url}`, { stdio: 'ignore' }); } catch { console.log(`  Open: ${url}`); }
});
