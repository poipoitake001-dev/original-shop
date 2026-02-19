// 测试 convertSQL 对 admin.js 生成的 SQL 的处理
function convertSQL(sql) {
    let paramIndex = 0;
    let convertedSQL = sql
        .replace(/\?/g, () => `$${++paramIndex}`)
        .replace(/NOW\(\)/gi, 'NOW()')
        .replace(/TINYINT\(1\)/gi, 'BOOLEAN')
        .replace(/TINYINT/gi, 'SMALLINT')
        .replace(/DATETIME/gi, 'TIMESTAMP')
        .replace(/`/g, '"');
    return convertedSQL;
}

// 模拟 admin.js PUT /settings 生成的 SQL
const sql = 'UPDATE site_settings SET feature_1_title = ?, feature_1_desc = ?, gateway_enabled = ?, updated_at = NOW() WHERE id = ?';
console.log('Input:', sql);
console.log('Output:', convertSQL(sql));
