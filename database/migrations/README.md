# 数据库迁移说明

## 执行迁移

### 方法一：使用 MySQL 命令行

```bash
# 进入 MySQL
mysql -u root -p

# 执行迁移脚本
source database/migrations/add_settings_tables.sql
```

### 方法二：使用 MySQL Workbench 或其他 GUI 工具

1. 打开 `database/migrations/add_settings_tables.sql` 文件
2. 复制全部内容
3. 在 MySQL 客户端中执行

### 方法三：使用 Node.js 脚本（推荐）

在项目根目录创建并运行迁移脚本：

```bash
node backend/scripts/migrate.js
```

## 迁移内容

此迁移脚本会创建以下表：

1. **site_settings** - 站点设置表
   - 基本信息（站点名称、描述、页脚等）
   - 外观设置（Logo、Favicon、主题颜色等）
   - 核心优势徽章（3个）
   - 联系方式（邮箱、电话、微信、QQ、二维码等）
   - 社交账号（微博、抖音、小红书、B站等）
   - 支付设置（API网关、手动二维码）
   - 财务设置（提现手续费等）

2. **trust_badges** - 信任徽章表（备用，目前核心优势使用 site_settings）
   - 用于展示网站的信任标识

3. **info_pages** - 信息页面表
   - 用于服务条款、隐私政策等静态页面

## 验证迁移

执行以下 SQL 查询验证表是否创建成功：

```sql
USE space_card_shop;

-- 查看表是否存在
SHOW TABLES LIKE 'site_settings';
SHOW TABLES LIKE 'trust_badges';
SHOW TABLES LIKE 'info_pages';

-- 查看数据
SELECT * FROM site_settings;
SELECT * FROM trust_badges;
SELECT * FROM info_pages;
```

## 回滚（如需要）

如果需要删除这些表：

```sql
USE space_card_shop;

DROP TABLE IF EXISTS info_pages;
DROP TABLE IF EXISTS trust_badges;
DROP TABLE IF EXISTS site_settings;
```

## 注意事项

- 此迁移脚本使用 `CREATE TABLE IF NOT EXISTS`，可以安全地重复执行
- 默认数据使用 `ON DUPLICATE KEY UPDATE`，不会重复插入
- 执行前请确保已备份数据库
