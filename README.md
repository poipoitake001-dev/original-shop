# 🚀 星际卡密商城

一个基于 React + Node.js + MySQL 的电商发卡平台。

## 技术栈

### 前端
- **React 18** - UI 框架
- **Tailwind CSS** - 样式框架
- **Lucide React** - 图标库
- **Vite** - 构建工具

### 后端
- **Node.js + Express** - 服务端框架
- **MySQL** - 数据库
- **JWT** - 身份认证

## 项目结构

```
space-card-shop/
├── frontend/                 # 前端项目
│   ├── src/
│   │   ├── components/       # React 组件
│   │   │   ├── Toast.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── PurchaseModal.jsx
│   │   │   ├── OrderTracker.jsx
│   │   │   └── FloatingServiceWidget.jsx
│   │   ├── utils/
│   │   │   ├── api.js        # API 请求
│   │   │   └── storage.js    # LocalStorage 工具
│   │   ├── App.jsx           # 主应用组件
│   │   ├── main.jsx          # 入口文件
│   │   └── index.css         # Tailwind 样式
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── postcss.config.js
├── backend/                  # 后端项目
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── server.js
│   └── package.json
├── database/
│   └── init.sql              # 数据库初始化脚本
├── start.bat                 # 后端启动脚本
├── start-frontend.bat        # 前端启动脚本
└── README.md
```

## 快速启动

### 1. 初始化数据库

```sql
-- 在 MySQL 中执行
source database/init.sql
```

### 2. 配置后端环境变量

编辑 `backend/.env`：
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=space_card_shop
JWT_SECRET=your-jwt-secret
PORT=3000
```

### 3. 启动后端

```bash
# 方式一：使用启动脚本
双击运行 start.bat

# 方式二：手动启动
cd backend
npm install
npm start
```

### 4. 启动前端

```bash
# 方式一：使用启动脚本
双击运行 start-frontend.bat

# 方式二：手动启动
cd frontend
npm install
npm run dev
```

### 5. 访问应用

- **前端开发服务器**: http://localhost:5173
- **后端 API 服务器**: http://localhost:3000

## 功能模块

### Module 1: 商品交互 (SPA)
- 点击商品卡片打开购买弹窗，无页面跳转
- 商品展示图片占位符

### Module 2: 库存与价格逻辑
- 数量选择器 (+/- 按钮)
- 价格动态计算 (单价 × 数量)
- 库存限制 (不能超过上限，禁用按钮)

### Module 3: 支付模拟流程
- Step 1: 邮箱输入 + 正则验证
- Step 2: 扫码支付视图 + "我已支付"按钮

### Module 4: 订单持久化
- 订单保存到 LocalStorage
- 订单追踪功能 (邮箱 + 订单号查询)

### Module 5: 浮动客服按钮
- 固定在右下角
- 悬停显示客服二维码

## 图片占位符

代码中包含以下占位符，需要替换为实际图片：

```javascript
// TODO: REPLACE WITH USER IMAGE 1  → 支付宝收款二维码
// TODO: REPLACE WITH USER IMAGE 2  → 客服微信二维码
// TODO: REPLACE WITH USER IMAGE 3  → 商品图片/头像
```

## API 端点

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/products | 获取商品列表 |
| GET | /api/products/:id | 获取商品详情 |
| POST | /api/users/register | 用户注册 |
| POST | /api/users/login | 用户登录 |
| POST | /api/orders | 创建订单 |
| GET | /api/orders/query/:orderNo | 查询订单 |

## 默认管理员账号

- 用户名: `admin`
- 密码: `admin123`

## License

MIT
