/**
 * 生成密码哈希脚本
 * 运行: node scripts/generate-hash.js
 */

const bcrypt = require('bcryptjs');

const password = 'admin123';
const saltRounds = 10;

const hash = bcrypt.hashSync(password, saltRounds);

console.log('========================================');
console.log('密码: [已隐藏]');
console.log('哈希:', hash);
console.log('========================================');

// 验证
const isMatch = bcrypt.compareSync(password, hash);
console.log('验证结果:', isMatch ? '✓ 正确' : '✗ 错误');
