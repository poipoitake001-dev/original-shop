/**
 * ========================================
 * 商品控制器
 * Product Controller
 * ========================================
 */

const db = require('../config/db');

/**
 * 获取商品列表
 * GET /api/products
 * 查询参数: category, status, page, pageSize, keyword
 */
async function getProducts(req, res) {
    try {
        const { category, status, page, pageSize, keyword, all } = req.query;
        
        // 解析分页参数
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const offset = (pageNum - 1) * pageSizeNum;
        
        // all=1 时返回所有商品（管理员后台用），否则只返回已审核通过的
        const auditFilter = all === '1' ? '1=1' : "p.audit_status = 'approved'";
        
        let sql, countSql;
        if (all === '1') {
            sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                          u.username AS seller_name, u.nickname AS seller_nickname,
                          u.is_student_verified AS seller_verified,
                          u.rating AS seller_rating, u.review_count AS seller_review_count,
                          u.avatar AS seller_avatar, u.avatar_url AS seller_avatar_url,
                          u.badge_excellent_seller, u.badge_excellent_buyer,
                          u.sold_count AS seller_sold_count
                   FROM products p
                   LEFT JOIN categories c ON p.category_id = c.id
                   LEFT JOIN users u ON p.seller_id = u.id
                   WHERE 1=1`;
            countSql = 'SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
        } else {
            sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                          u.username AS seller_name, u.nickname AS seller_nickname,
                          u.is_student_verified AS seller_verified,
                          u.rating AS seller_rating, u.review_count AS seller_review_count,
                          u.avatar AS seller_avatar, u.avatar_url AS seller_avatar_url,
                          u.badge_excellent_seller, u.badge_excellent_buyer,
                          u.sold_count AS seller_sold_count
                   FROM products p
                   LEFT JOIN categories c ON p.category_id = c.id
                   LEFT JOIN users u ON p.seller_id = u.id
                   WHERE p.audit_status = 'approved'`;
            countSql = "SELECT COUNT(*) AS total FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.audit_status = 'approved'";
        }
        let params = [];
        let countParams = [];
        
        // 按分类筛选
        if (category) {
            sql += ' AND c.slug = ?';
            countSql += ' AND c.slug = ?';
            params.push(String(category));
            countParams.push(String(category));
        }
        
        // 按状态筛选
        if (status !== undefined && status !== '') {
            sql += ' AND p.status = ?';
            countSql += ' AND p.status = ?';
            params.push(Number(status));
            countParams.push(Number(status));
        }
        
        // 关键词搜索
        if (keyword) {
            sql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
            countSql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
            const likeKeyword = '%' + String(keyword) + '%';
            params.push(likeKeyword, likeKeyword);
            countParams.push(likeKeyword, likeKeyword);
        }
        
        // 排序
        sql += ' ORDER BY p.id ASC';
        
        // 分页
        sql += ' LIMIT ' + pageSizeNum + ' OFFSET ' + offset;
        
        // 执行查询
        const products = await db.query(sql, params);
        const countResult = await db.query(countSql, countParams);
        const total = countResult[0] ? countResult[0].total : 0;
        
        // 处理specs字段
        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            if (product.specs && typeof product.specs === 'string') {
                try {
                    product.specs = JSON.parse(product.specs);
                } catch (e) {
                    product.specs = [];
                }
            }
            if (!product.specs) {
                product.specs = [];
            }
        }
        
        res.json({
            code: 200,
            message: 'success',
            data: {
                list: products,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    total: total,
                    totalPages: Math.ceil(total / pageSizeNum)
                }
            }
        });
    } catch (error) {
        console.error('获取商品列表失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取商品列表失败：' + error.message
        });
    }
}

/**
 * 获取商品详情
 * GET /api/products/:id
 */
async function getProductById(req, res) {
    try {
        const { id } = req.params;
        
        const products = await db.query(`
            SELECT p.*, c.name AS category_name, c.slug AS category_slug,
                   u.username AS seller_name, u.nickname AS seller_nickname,
                   u.is_student_verified AS seller_verified,
                   u.rating AS seller_rating, u.review_count AS seller_review_count,
                   u.avatar AS seller_avatar, u.avatar_url AS seller_avatar_url,
                   u.badge_excellent_seller, u.badge_excellent_buyer,
                   u.sold_count AS seller_sold_count
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN users u ON p.seller_id = u.id
            WHERE p.id = ? AND p.audit_status = 'approved'
        `, [Number(id)]);
        
        if (products.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '商品不存在'
            });
        }
        
        const product = products[0];
        
        // 自增浏览次数（异步，不阻塞响应）
        db.query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [Number(id)]).catch(() => {});
        
        // 处理specs字段
        if (product.specs && typeof product.specs === 'string') {
            try {
                product.specs = JSON.parse(product.specs);
            } catch (e) {
                product.specs = [];
            }
        }
        if (!product.specs) {
            product.specs = [];
        }
        
        res.json({
            code: 200,
            message: 'success',
            data: product
        });
    } catch (error) {
        console.error('获取商品详情失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取商品详情失败：' + error.message
        });
    }
}

/**
 * 新增商品（管理员）
 * POST /api/products
 * 
 * 支持混合市场：
 * - type: 'VIRTUAL' (虚拟卡密，默认) / 'PHYSICAL' (实物商品)
 * - VIRTUAL: delivery_type=auto, 库存由卡密数量决定
 * - PHYSICAL: delivery_type=manual, 库存手动设置, 需要image_url
 * 
 * 审核逻辑：
 * - 管理员创建的商品默认 approved
 * - 如传入 seller_id，检查该卖家 canSkipAudit 权限
 */
async function createProduct(req, res) {
    try {
        const {
            category_id,
            title,
            description,
            detail,
            icon,
            image_url,
            price,
            stock,
            specs,
            status,
            delivery_type,
            type,
            seller_id
        } = req.body;
        
        if (!title || price === undefined) {
            return res.status(400).json({ code: 400, message: '标题和价格不能为空' });
        }
        
        const finalCategoryId = category_id || 1;
        const categories = await db.query('SELECT id FROM categories WHERE id = ?', [Number(finalCategoryId)]);
        if (categories.length === 0) {
            return res.status(400).json({ code: 400, message: '商品分类不存在' });
        }

        // 商品类型：VIRTUAL(默认) / PHYSICAL
        const productType = type === 'PHYSICAL' ? 'PHYSICAL' : 'VIRTUAL';

        // PHYSICAL 商品必须有图片
        if (productType === 'PHYSICAL' && !image_url) {
            return res.status(400).json({ code: 400, message: '实物商品必须上传商品图片' });
        }
        
        let specsJson = null;
        if (specs) {
            specsJson = typeof specs === 'string' ? specs : JSON.stringify(specs);
        }

        // 根据商品类型决定发货方式和库存逻辑
        let dtype, initialStock;
        if (productType === 'PHYSICAL') {
            // 实物商品：强制手动发货，库存手动设置
            dtype = 'manual';
            initialStock = Number(stock) || 0;
        } else {
            // 虚拟商品：沿用原有逻辑
            dtype = delivery_type === 'manual' ? 'manual' : 'auto';
            initialStock = dtype === 'manual' ? (Number(stock) || 0) : 0;
        }

        // 审核状态：管理员创建默认 approved
        let auditStatus = 'approved';
        
        const productId = await db.insert(`
            INSERT INTO products 
            (category_id, seller_id, delivery_type, type, title, description, detail, icon, image_url, price, stock, specs, audit_status, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            Number(finalCategoryId),
            seller_id ? Number(seller_id) : null,
            dtype,
            productType,
            String(title),
            description || null,
            detail || null,
            icon || '⚡',
            image_url || null,
            Number(price),
            initialStock,
            specsJson,
            auditStatus,
            status !== undefined ? Number(status) : 1
        ]);
        
        res.status(201).json({
            code: 200,
            message: '商品创建成功',
            data: { id: productId, type: productType, audit_status: auditStatus }
        });
    } catch (error) {
        console.error('创建商品失败:', error);
        res.status(500).json({
            code: 500,
            message: '创建商品失败：' + error.message
        });
    }
}

/**
 * 更新商品（管理员）
 * PUT /api/products/:id
 */
async function updateProduct(req, res) {
    try {
        const { id } = req.params;
        const {
            category_id, title, description, detail, icon, image_url,
            price, stock, specs, status, delivery_type
        } = req.body;
        
        const products = await db.query('SELECT id, delivery_type, type FROM products WHERE id = ?', [Number(id)]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在' });
        }
        
        const currentType = products[0].delivery_type || 'auto';
        const updateFields = [];
        const params = [];

        // 更新商品类型
        const { type } = req.body;
        if (type !== undefined && ['VIRTUAL', 'PHYSICAL'].includes(type)) {
            updateFields.push('type = ?');
            params.push(type);
            // PHYSICAL 商品强制 manual 发货
            if (type === 'PHYSICAL') {
                updateFields.push("delivery_type = 'manual'");
            }
        }
        
        if (delivery_type !== undefined && ['auto', 'manual'].includes(delivery_type)) {
            // PHYSICAL 商品不允许改为 auto
            const effectiveProductType = type || products[0].type || 'VIRTUAL';
            if (effectiveProductType === 'PHYSICAL' && delivery_type === 'auto') {
                return res.status(400).json({ code: 400, message: '实物商品不支持自动发货' });
            }
            updateFields.push('delivery_type = ?');
            params.push(delivery_type);
        }
        if (category_id !== undefined) { updateFields.push('category_id = ?'); params.push(Number(category_id)); }
        if (title !== undefined) { updateFields.push('title = ?'); params.push(String(title)); }
        if (description !== undefined) { updateFields.push('description = ?'); params.push(description); }
        if (detail !== undefined) { updateFields.push('detail = ?'); params.push(detail); }
        if (icon !== undefined) { updateFields.push('icon = ?'); params.push(icon); }
        if (image_url !== undefined) { updateFields.push('image_url = ?'); params.push(image_url); }
        if (price !== undefined) { updateFields.push('price = ?'); params.push(Number(price)); }
        // stock: 仅 manual 类型可直接修改库存；auto 类型库存由卡密数量决定
        const effectiveType = delivery_type || currentType;
        if (stock !== undefined && effectiveType === 'manual') {
            updateFields.push('stock = ?');
            params.push(Number(stock));
        }
        if (specs !== undefined) {
            const specsJson = typeof specs === 'string' ? specs : JSON.stringify(specs);
            updateFields.push('specs = ?');
            params.push(specsJson);
        }
        if (status !== undefined) {
            updateFields.push('status = ?');
            params.push(Number(status));
        }
        
        if (updateFields.length === 0) {
            return res.status(400).json({
                code: 400,
                message: '没有要更新的字段'
            });
        }
        
        params.push(Number(id));
        
        await db.update(
            'UPDATE products SET ' + updateFields.join(', ') + ' WHERE id = ?',
            params
        );
        
        res.json({
            code: 200,
            message: '商品更新成功'
        });
    } catch (error) {
        console.error('更新商品失败:', error);
        res.status(500).json({
            code: 500,
            message: '更新商品失败：' + error.message
        });
    }
}

/**
 * 删除商品（管理员）
 * DELETE /api/products/:id
 */
async function deleteProduct(req, res) {
    try {
        const { id } = req.params;
        
        // 检查商品是否存在
        const products = await db.query(
            'SELECT id FROM products WHERE id = ?',
            [Number(id)]
        );
        if (products.length === 0) {
            return res.status(404).json({
                code: 404,
                message: '商品不存在'
            });
        }
        
        // 检查是否有关联订单
        const orders = await db.query(
            'SELECT id FROM orders WHERE product_id = ? LIMIT 1',
            [Number(id)]
        );
        if (orders.length > 0) {
            return res.status(400).json({
                code: 400,
                message: '该商品已有订单记录，无法删除，建议下架'
            });
        }
        
        // 删除商品
        await db.update('DELETE FROM products WHERE id = ?', [Number(id)]);
        
        res.json({
            code: 200,
            message: '商品删除成功'
        });
    } catch (error) {
        console.error('删除商品失败:', error);
        res.status(500).json({
            code: 500,
            message: '删除商品失败：' + error.message
        });
    }
}

/**
 * 获取分类列表
 * GET /api/categories
 */
async function getCategories(req, res) {
    try {
        const categories = await db.query(`
            SELECT c.*, 
                   (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 1 AND p.audit_status = 'approved') AS product_count
            FROM categories c
            WHERE c.status = 1
            ORDER BY c.sort_order ASC
        `, []);
        
        res.json({
            code: 200,
            message: 'success',
            data: categories
        });
    } catch (error) {
        console.error('获取分类列表失败:', error);
        res.status(500).json({
            code: 500,
            message: '获取分类列表失败：' + error.message
        });
    }
}

/**
 * 更新商品库存（管理员）
 * PATCH /api/products/:id/stock
 */
async function updateStock(req, res) {
    try {
        const { id } = req.params;
        const { stock, action } = req.body;
        
        if (stock === undefined) {
            return res.status(400).json({
                code: 400,
                message: '库存数量不能为空'
            });
        }
        
        // 检查商品是否存在
        const products = await db.query(
            'SELECT id, stock, delivery_type FROM products WHERE id = ?',
            [Number(id)]
        );
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在' });
        }
        
        // 自动发卡类型不允许直接修改库存
        if ((products[0].delivery_type || 'auto') === 'auto') {
            return res.status(400).json({ code: 400, message: '自动发卡商品的库存由卡密数量决定，不能直接修改' });
        }
        
        let newStock = Number(stock);
        
        // 如果是增减操作
        if (action === 'add') {
            newStock = products[0].stock + Number(stock);
        }
        if (action === 'reduce') {
            newStock = products[0].stock - Number(stock);
            if (newStock < 0) {
                newStock = 0;
            }
        }
        
        await db.update(
            'UPDATE products SET stock = ? WHERE id = ?',
            [newStock, Number(id)]
        );
        
        res.json({
            code: 200,
            message: '库存更新成功',
            data: { stock: newStock }
        });
    } catch (error) {
        console.error('更新库存失败:', error);
        res.status(500).json({
            code: 500,
            message: '更新库存失败：' + error.message
        });
    }
}

/**
 * 切换"想要"状态
 * POST /api/products/:id/want
 * 需要登录，toggle 当前用户对该商品的想要状态
 */
async function toggleWant(req, res) {
    try {
        const userId = req.user.id;
        const productId = Number(req.params.id);

        // 检查商品是否存在
        const products = await db.query('SELECT id FROM products WHERE id = ?', [productId]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在' });
        }

        // 检查是否已标记
        const existing = await db.query(
            'SELECT id FROM product_wants WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        let wanted;
        if (existing.length > 0) {
            // 取消想要
            await db.query('DELETE FROM product_wants WHERE user_id = ? AND product_id = ?', [userId, productId]);
            await db.query('UPDATE products SET want_count = GREATEST(want_count - 1, 0) WHERE id = ?', [productId]);
            wanted = false;
        } else {
            // 标记想要
            await db.query('INSERT INTO product_wants (user_id, product_id) VALUES (?, ?)', [userId, productId]);
            await db.query('UPDATE products SET want_count = want_count + 1 WHERE id = ?', [productId]);
            wanted = true;
        }

        // 获取最新计数
        const countResult = await db.query('SELECT want_count FROM products WHERE id = ?', [productId]);
        const wantCount = countResult[0]?.want_count || 0;

        res.json({
            code: 200,
            message: wanted ? '已标记想要' : '已取消想要',
            data: { wanted, wantCount }
        });
    } catch (error) {
        console.error('切换想要状态失败:', error);
        res.status(500).json({ code: 500, message: '操作失败：' + error.message });
    }
}

/**
 * 获取当前用户对商品的想要状态
 * GET /api/products/:id/want-status
 * 需要登录
 */
async function getWantStatus(req, res) {
    try {
        const userId = req.user.id;
        const productId = Number(req.params.id);

        const existing = await db.query(
            'SELECT id FROM product_wants WHERE user_id = ? AND product_id = ?',
            [userId, productId]
        );

        res.json({
            code: 200,
            data: { wanted: existing.length > 0 }
        });
    } catch (error) {
        res.status(500).json({ code: 500, message: '查询失败' });
    }
}

module.exports = {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getCategories,
    updateStock,
    toggleWant,
    getWantStatus
};
