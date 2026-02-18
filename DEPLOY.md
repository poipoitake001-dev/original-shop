# 🚀 分离部署指南（方案 B）

本指南介绍如何将项目分离部署到免费云平台。**管理后台已并入后端，部署一次即可同时使用 API + 管理后台（同库）。**

## 📦 部署架构

```
用户浏览器
    ↓
[Vercel] ← 前端购物页（免费）
    ↓ API 请求
[Railway] ← 后端 Node.js + 管理后台（免费额度 $5/月）
    ↓
[Railway MySQL / PlanetScale] ← 数据库
```

- **购物页**：Vercel 前端 → 请求 Railway 后端 API  
- **管理后台**：`https://你的后端域名/admin` → 与后端同库，改商品后刷新购物页即可看到

---

## 第一步：准备代码仓库

### 1.1 创建 GitHub 仓库

1. 登录 [GitHub](https://github.com)
2. 点击 "New repository"
3. 仓库名称：`space-card-shop`
4. 设为 Private（私有）或 Public（公开）

### 1.2 上传代码

```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/space-card-shop.git
git push -u origin main
```

---

## 第二步：部署数据库（Railway MySQL）

### 2.1 创建 Railway 账号

1. 访问 [Railway](https://railway.app)
2. 使用 GitHub 账号登录

### 2.2 创建 MySQL 数据库

1. 点击 "New Project"
2. 选择 "Provision MySQL"
3. 等待创建完成

### 2.3 获取连接信息

在 MySQL 服务的 "Connect" 面板中找到：
- `DATABASE_URL` - 完整连接字符串

### 2.4 初始化数据库

1. 点击 MySQL 服务
2. 进入 "Data" 标签页
3. 复制 `database/init.sql` 的内容并执行

---

## 第三步：部署后端 + 管理后台（Railway，一键同库）

### 3.1 创建后端服务

1. 在同一个 Railway 项目中，点击 "New Service"
2. 选择 "GitHub Repo"
3. 选择你的 `space-card-shop` 仓库
4. **重要（含管理后台）**：**Root Directory 留空**（使用仓库根目录），这样后端才能访问 `admin/public` 并一起部署。

### 3.2 做法A：Root 留空 + 根目录 Dockerfile（推荐，管理后台一起进镜像）

1. **Root Directory**：留空（使用仓库根目录）。
2. 仓库根目录已有 **Dockerfile**，构建时会复制 `admin/public` 进镜像，部署后 `https://你的域名/admin` 可用。
3. Railway 会检测到根目录 Dockerfile 并自动用其构建，**无需**单独填 Build Command；Start 由镜像 `CMD` 决定，也无需填。
4. 不会出现 `secret FRONTEND_URL: not found`（Dockerfile 未声明任何 build secret）。

**3.2 备选（Root Directory = backend）**  
若必须将 Root Directory 设为 `backend`，则构建上下文只有 backend，没有 admin。需在本地先复制再提交：在项目根目录执行  
`cp -r admin/public backend/admin-public`（Linux/Mac）或  
`xcopy /E /I admin\public backend\admin-public`（Windows），  
把 `backend/admin-public` 提交进仓库；Railway Root 保持 `backend`，Build 填 `npm install`，Start 填 `node server.js`。此时需使用 `backend/Dockerfile`（仅复制 backend，不 COPY admin）。

### 3.3 配置环境变量

在后端服务的 "Variables" 中添加：

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL` | 点击 "Add Reference" 选择 MySQL 的连接字符串 |
| `JWT_SECRET` | 一个复杂的随机字符串（至少32位） |
| `JWT_EXPIRES_IN` | `7d` |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | 先留空，部署前端后填入 |

### 3.4 等待部署

Railway 会执行构建与启动命令并部署。

### 3.5 获取后端地址与管理后台

部署完成后，在 "Settings" > "Domains" 中生成公开域名，例如：
```
https://your-backend-xxx.railway.app
```

- **API**：`https://your-backend-xxx.railway.app/api`
- **管理后台（与后端同库）**：`https://your-backend-xxx.railway.app/admin`  
  用数据库里的管理员账号登录（如 init.sql 中的 admin / admin123），在此改商品后，刷新前端购物页即可看到变化。

---

## 第四步：部署前端（Vercel）

### 4.1 创建 Vercel 账号

1. 访问 [Vercel](https://vercel.com)
2. 使用 GitHub 账号登录

### 4.2 导入项目

1. 点击 "Add New Project"
2. 选择你的 `space-card-shop` 仓库
3. **重要配置**：
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 4.3 配置环境变量

在 "Environment Variables" 中添加：

| 变量名 | 值 |
|--------|-----|
| `VITE_API_URL` | `https://your-backend-xxx.railway.app/api` |

### 4.4 部署

点击 "Deploy"，等待部署完成。

### 4.5 获取前端地址

部署完成后获得地址：
```
https://your-app.vercel.app
```

---

## 第五步：更新 CORS 配置

返回 Railway 后端服务，添加环境变量：

| 变量名 | 值 |
|--------|-----|
| `FRONTEND_URL` | `https://your-app.vercel.app` |

---

## ✅ 部署完成检查清单

- [ ] 数据库已创建并初始化
- [ ] 后端已部署并可访问 `/api`
- [ ] **管理后台可访问**：`https://你的后端域名/admin`，管理员登录（admin / admin123）
- [ ] 前端已部署并可访问
- [ ] 前端能正常调用后端 API
- [ ] 在管理后台改商品后，刷新购物页能看到变化（同库）

---

## 🔧 常见问题

### Q: 前端显示"网络请求失败"

检查：
1. 后端是否正常运行（访问后端地址 + `/api`）
2. 前端的 `VITE_API_URL` 是否正确
3. 后端的 `FRONTEND_URL` 是否正确（CORS）

### Q: 数据库连接失败

检查：
1. `DATABASE_URL` 是否正确
2. 是否执行了 `init.sql` 初始化脚本

### Q: 部署后登录失败

重新在数据库执行 `init.sql` 中的 admin 用户插入语句。

---

## 📊 成本估算

| 服务 | 免费额度 | 超出后价格 |
|------|----------|------------|
| Vercel（前端）| 无限静态站点 | 免费 |
| Railway（后端）| $5/月 | 按使用量计费 |
| Railway MySQL | 包含在 $5 内 | - |

**总计：$0-5/月**（小流量完全免费）

---

## 🔄 后续更新

代码更新后：
1. `git push` 到 GitHub
2. Vercel 和 Railway 会自动重新部署

---

## 📝 备选方案

### 数据库备选：PlanetScale

如果需要更大的免费额度：
1. 访问 [PlanetScale](https://planetscale.com)
2. 创建免费数据库
3. 将连接字符串填入 Railway 的 `DATABASE_URL`

### 后端备选：Render

1. 访问 [Render](https://render.com)
2. 创建 Web Service
3. 连接 GitHub 仓库
4. 设置 Root Directory 为 `backend`
