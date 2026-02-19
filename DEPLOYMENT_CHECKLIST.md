# 部署前检查清单

## ✅ 已修复的问题

### 1. 后端路由更新
- 文件：`backend/routes/admin.js`
- 修复：添加了详细日志和所有支付设置字段到白名单
- 状态：✅ 完成

### 2. 数据库初始化脚本
- 文件：`backend/config/initDB.js`
- 修复：
  - 将 `db.pool.query()` 改为 `db.query()`
  - 添加了缺失的社交媒体字段（contact_qq, social_weibo, social_douyin, social_xiaohongshu, social_bilibili）
- 状态：✅ 完成

### 3. 自动字段添加
- `initDB.js` 会在服务器启动时自动添加支付设置字段
- 包含 23 个字段的自动迁移逻辑
- 状态：✅ 完成

## 🔍 部署失败排查

### 常见原因

1. **数据库连接失败**
   - 检查环境变量 `DATABASE_URL` 是否正确配置
   - 确认数据库服务是否正常运行
   - 验证数据库用户权限

2. **环境变量缺失**
   - `DATABASE_URL` - 数据库连接字符串
   - `JWT_SECRET` - JWT 密钥
   - `PORT` - 服务端口（默认 3000）
   - `CORS_ORIGINS` - 允许的跨域来源

3. **依赖安装失败**
   - 确认 `package.json` 中的依赖都已安装
   - 检查 Node.js 版本是否兼容

4. **数据库表不存在**
   - 首次部署时，`initDB.js` 会自动创建所有表
   - 如果失败，检查数据库用户是否有 CREATE TABLE 权限

## 📋 Render 部署配置

### 环境变量设置

在 Render Dashboard 中设置以下环境变量：

```
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-here
PORT=3000
NODE_ENV=production
CORS_ORIGINS=https://your-frontend-domain.com,https://your-admin-domain.com
```

### 构建命令
```bash
npm install
```

### 启动命令
```bash
npm start
```

### 健康检查路径
```
/api/health
```

## 🚀 部署步骤

### 1. 提交代码到 Git

```bash
git add .
git commit -m "fix: 修复支付设置功能和数据库初始化"
git push origin main
```

### 2. 在 Render 中触发部署

- 方式 1：自动部署（如果已配置）
- 方式 2：手动点击 "Deploy latest commit"

### 3. 查看部署日志

关注以下关键日志：
- `✓ 数据库连接成功 (PostgreSQL)`
- `✓ site_settings 表已就绪`
- `✓ site_settings 支付字段已就绪`
- `Server running on port 3000`

### 4. 验证部署成功

```bash
# 检查健康状态
curl https://your-backend-url.com/api/health

# 检查系统设置
curl https://your-backend-url.com/api/settings
```

## ⚠️ 如果部署仍然失败

### 查看详细错误日志

1. 在 Render Dashboard 中打开 "Logs" 标签
2. 查找错误信息（通常以 `Error:` 或 `✗` 开头）
3. 记录完整的错误堆栈

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `ECONNREFUSED` | 数据库连接失败 | 检查 DATABASE_URL 是否正确 |
| `relation "xxx" does not exist` | 表不存在 | 确认 initDB.js 是否执行成功 |
| `column "xxx" does not exist` | 字段不存在 | 检查 initDB.js 中的字段添加逻辑 |
| `Exited with status 1` | 启动失败 | 查看完整日志，找到具体错误 |
| `Cannot find module` | 依赖缺失 | 运行 `npm install` |

### 手动数据库迁移

如果自动迁移失败，可以手动执行：

1. 连接到 Render 的 PostgreSQL 数据库
2. 执行 `ADD_PAYMENT_COLUMNS.sql` 文件中的 SQL
3. 重新部署服务

## 📞 需要帮助？

如果问题仍未解决，请提供：
1. 完整的部署日志（最后 50 行）
2. 环境变量配置（隐藏敏感信息）
3. 数据库类型和版本
4. 错误截图

## 🎯 部署成功标志

当你看到以下日志时，说明部署成功：

```
✓ 数据库连接成功 (PostgreSQL)
正在检查数据库表 (PostgreSQL)...
✓ users 表已就绪
✓ categories 表已就绪
✓ products 表已就绪
✓ orders 表已就绪
✓ card_keys 表已就绪
✓ site_settings 表已就绪
✓ site_settings 支付字段已就绪
✓ announcements 表已就绪
...
========================================
  数据库初始化完成 (PostgreSQL)
========================================
Server running on port 3000
```

此时可以访问：
- 前端：https://your-frontend-url.com
- 管理后台：https://your-admin-url.com
- API：https://your-backend-url.com/api
