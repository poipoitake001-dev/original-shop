# 测试数据库迁移

## 步骤 1：检查数据库连接

首先确保数据库连接正常。在项目根目录执行：

```bash
# 测试数据库连接
node -e "const db = require('./backend/config/db'); db.query('SELECT 1').then(() => console.log('✓ 数据库连接成功')).catch(e => console.error('✗ 数据库连接失败:', e.message))"
```

## 步骤 2：执行数据库迁移

```bash
node backend/scripts/migrate.js
```

预期输出：
```
开始执行数据库迁移...

共 XX 条 SQL 语句需要执行

✓ 创建表: site_settings
✓ 插入数据: site_settings
✓ 创建表: trust_badges
✓ 插入数据: trust_badges
✓ 创建表: info_pages
✓ 插入数据: info_pages

数据库迁移完成！

验证迁移结果：
- site_settings 表: 1 条记录
- trust_badges 表: 3 条记录
- info_pages 表: 3 条记录

迁移成功！可以启动应用了。
```

## 步骤 3：手动验证（可选）

如果迁移脚本执行失败，可以手动验证：

```sql
-- 连接到数据库
mysql -u root -p

-- 切换到项目数据库
USE space_card_shop;

-- 检查表是否存在
SHOW TABLES LIKE 'site_settings';
SHOW TABLES LIKE 'trust_badges';
SHOW TABLES LIKE 'info_pages';

-- 查看表结构
DESC site_settings;

-- 查看数据
SELECT * FROM site_settings;
SELECT * FROM trust_badges;
```

## 步骤 4：测试 API

启动后端服务后，测试 API 是否正常：

```bash
# 启动后端
cd backend
npm start
```

在另一个终端测试：

```bash
# 测试获取设置（公开接口）
curl http://localhost:3000/api/settings/public

# 预期返回：
# {"code":200,"data":{"site_name":"星际卡密商城",...}}
```

## 步骤 5：测试管理后台保存

1. 启动管理后台：
```bash
cd admin
npm run dev
```

2. 访问 http://localhost:5173
3. 登录（admin / admin123）
4. 进入"支付设置"页面
5. 开启"手动二维码支付"
6. 点击"保存设置"
7. 打开浏览器开发者工具（F12）-> Network 标签
8. 查看请求详情：
   - 请求 URL: http://localhost:3000/api/settings
   - 请求方法: PUT
   - 请求头: Authorization: Bearer xxx
   - 请求体: {"manual_qr_enabled":true,...}
   - 响应: {"code":200,"message":"设置更新成功"}

## 常见问题排查

### 问题 1：迁移脚本报错 "Cannot find module"

**原因**：在错误的目录执行脚本

**解决**：确保在项目根目录执行：
```bash
pwd  # 确认当前目录
# 应该显示类似：/path/to/space-card-shop-original

node backend/scripts/migrate.js
```

### 问题 2：数据库连接失败

**原因**：数据库配置不正确或数据库未启动

**解决**：
1. 检查 `backend/.env` 文件中的数据库配置
2. 确认 MySQL 服务已启动
3. 测试连接：
```bash
mysql -u root -p -e "SELECT 1"
```

### 问题 3：表已存在错误

**原因**：之前已经创建过表

**解决**：这不是错误，迁移脚本使用 `CREATE TABLE IF NOT EXISTS`，可以安全忽略

### 问题 4：保存设置时返回 401 Unauthorized

**原因**：Token 过期或无效

**解决**：
1. 退出登录
2. 重新登录
3. 再次尝试保存

### 问题 5：保存设置时返回 500 Internal Server Error

**原因**：数据库表不存在或字段不匹配

**解决**：
1. 检查后端控制台错误日志
2. 确认数据库迁移是否成功执行
3. 手动检查表结构：
```sql
DESC site_settings;
-- 应该包含 gateway_enabled, manual_qr_enabled 等字段
```

### 问题 6：保存成功但刷新后数据丢失

**原因**：前端读取的字段名与后端不一致

**解决**：
1. 检查浏览器控制台是否有错误
2. 查看 Network 标签中 GET /api/settings 的响应
3. 确认返回的数据包含你保存的字段

## 调试技巧

### 1. 查看后端日志

后端控制台会显示所有请求和错误：
```
[2026-02-18 10:30:45] PUT /api/settings
更新设置失败: Error: Unknown column 'gateway_enabled' in 'field list'
```

### 2. 查看前端 Network

浏览器 F12 -> Network -> 找到 settings 请求 -> 查看：
- Request Headers（请求头）
- Request Payload（请求体）
- Response（响应）

### 3. 直接测试 SQL

在 MySQL 中直接测试更新语句：
```sql
USE space_card_shop;

-- 测试更新
UPDATE site_settings 
SET gateway_enabled = 1, manual_qr_enabled = 1 
WHERE id = 1;

-- 查看结果
SELECT gateway_enabled, manual_qr_enabled FROM site_settings WHERE id = 1;
```

## 成功标志

当你看到以下情况时，说明一切正常：

1. ✅ 迁移脚本执行成功，显示"迁移成功！"
2. ✅ 后端启动无错误
3. ✅ 管理后台可以正常登录
4. ✅ 点击"保存设置"后显示"保存成功"
5. ✅ 刷新页面后，设置仍然保留
6. ✅ 浏览器 Network 显示 200 响应

如果以上都正常，你的支付设置功能就可以正常使用了！
