/**
 * ========================================
 * 卡密管理路由
 * Card Keys Routes
 * ========================================
 */

const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

// 确保 card_keys 表存在 (PostgreSQL)
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS card_keys (
                id SERIAL PRIMARY KEY,
                product_id INT NOT NULL,
                card_key VARCHAR(500) NOT NULL,
                status SMALLINT DEFAULT 0,
                order_id INT DEFAULT NULL,
                sold_at TIMESTAMP DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 创建索引
        await db.query(`
            CREATE INDEX IF NOT EXISTS idx_cardkeys_product_status ON card_keys(product_id, status)
        `).catch(() => {});
        
        // 确保 orders 表有 card_keys 字段
        await db.query(`
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS card_keys TEXT
        `).catch(() => {});
        
        console.log('Card keys table initialized');
    } catch (error) {
        console.error('Failed to initialize card_keys table:', error.message);
    }
})();

/**
 * 获取商品的卡密列表
 * GET /api/cardkeys/:productId
 */
router.get('/:productId', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        const { status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        
        let sql = 'SELECT * FROM card_keys WHERE product_id = ?';
        let countSql = 'SELECT COUNT(*) AS total FROM card_keys WHERE product_id = ?';
        const params = [Number(productId)];
        
        if (status !== undefined && status !== '') {
            sql += ' AND status = ?';
            countSql += ' AND status = ?';
            params.push(Number(status));
        }
        
        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        
        const [cardKeys, countResult] = await Promise.all([
            db.query(sql, [...params, Number(limit), Number(offset)]),
            db.query(countSql, params)
        ]);
        
        // 统计信息
        const stats = await db.query(`
            SELECT 
                COUNT(*) AS total,
                SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) AS available,
                SUM(CASE WHEN status = 1 THEN 1 ELSE 0 END) AS sold
            FROM card_keys WHERE product_id = ?
        `, [Number(productId)]);
        
        res.json({
            code: 200,
            data: {
                list: cardKeys,
                stats: stats[0] || { total: 0, available: 0, sold: 0 },
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: countResult[0]?.total || 0
                }
            }
        });
    } catch (error) {
        console.error('获取卡密列表失败:', error);
        res.status(500).json({ code: 500, message: '获取卡密列表失败' });
    }
});

/**
 * 批量导入卡密
 * POST /api/cardkeys/:productId/import
 * 
 * Body: { card_keys: "卡密1；卡密2；卡密3" } 或 { card_keys: ["卡密1", "卡密2"] }
 * 
 * 卡密用"；"或";"或换行符分隔
 */
router.post('/:productId/import', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        let { card_keys, allow_duplicates } = req.body;
        
        if (!card_keys) {
            return res.status(400).json({ code: 400, message: '请提供卡密内容' });
        }
        
        const products = await db.query('SELECT * FROM products WHERE id = ?', [Number(productId)]);
        if (products.length === 0) {
            return res.status(404).json({ code: 404, message: '商品不存在' });
        }
        
        let keyList = [];
        if (Array.isArray(card_keys)) {
            keyList = card_keys;
        } else if (typeof card_keys === 'string') {
            keyList = card_keys.split(/[;；\n\r]+/).map(k => k.trim()).filter(k => k);
        }
        
        if (keyList.length === 0) {
            return res.status(400).json({ code: 400, message: '未检测到有效的卡密' });
        }
        
        // 检查重复卡密数量（仅作提示，不阻止导入）
        const existingKeys = await db.query(
            'SELECT card_key FROM card_keys WHERE product_id = ?',
            [Number(productId)]
        );
        const existingSet = new Set(existingKeys.map(k => k.card_key));
        const duplicateCount = keyList.filter(k => existingSet.has(k)).length;
        
        // 始终导入所有卡密（包括重复的）
        const insertValues = keyList.map(key => [Number(productId), key, 0]);
        await db.query(
            'INSERT INTO card_keys (product_id, card_key, status) VALUES ?',
            [insertValues]
        );
        
        // 更新商品库存（库存 = 可用卡密数量）
        const stockResult = await db.query(
            'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
            [Number(productId)]
        );
        await db.update(
            'UPDATE products SET stock = ? WHERE id = ?',
            [stockResult[0].count, Number(productId)]
        );
        
        const msg = duplicateCount > 0
            ? `成功导入 ${keyList.length} 个卡密（其中 ${duplicateCount} 个与已有卡密重复）`
            : `成功导入 ${keyList.length} 个卡密`;
        
        res.json({
            code: 200,
            message: msg,
            data: {
                imported: keyList.length,
                duplicates: duplicateCount,
                newStock: stockResult[0].count
            }
        });
    } catch (error) {
        console.error('导入卡密失败:', error);
        res.status(500).json({ code: 500, message: '导入卡密失败：' + error.message });
    }
});

/**
 * 删除单个卡密
 * DELETE /api/cardkeys/:id
 */
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // 检查卡密是否存在
        const cardKeys = await db.query('SELECT * FROM card_keys WHERE id = ?', [Number(id)]);
        if (cardKeys.length === 0) {
            return res.status(404).json({ code: 404, message: '卡密不存在' });
        }
        
        const cardKey = cardKeys[0];
        
        // 删除卡密（允许删除已售出的卡密记录）
        await db.update('DELETE FROM card_keys WHERE id = ?', [Number(id)]);
        
        // 更新商品库存
        const stockResult = await db.query(
            'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
            [cardKey.product_id]
        );
        await db.update(
            'UPDATE products SET stock = ? WHERE id = ?',
            [stockResult[0].count, cardKey.product_id]
        );
        
        res.json({ code: 200, message: '卡密删除成功' });
    } catch (error) {
        console.error('删除卡密失败:', error);
        res.status(500).json({ code: 500, message: '删除卡密失败' });
    }
});

/**
 * 批量删除卡密（仅未售出的）
 * POST /api/cardkeys/batch-delete
 */
router.post('/batch-delete', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { ids, productId } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ code: 400, message: '请提供要删除的卡密ID列表' });
        }
        
        // 删除选中的卡密（包括已售出的）
        const result = await db.update(
            'DELETE FROM card_keys WHERE id IN (?)',
            [ids.map(id => Number(id))]
        );
        
        // 如果提供了商品ID，更新该商品库存
        if (productId) {
            const stockResult = await db.query(
                'SELECT COUNT(*) AS count FROM card_keys WHERE product_id = ? AND status = 0',
                [Number(productId)]
            );
            await db.update(
                'UPDATE products SET stock = ? WHERE id = ?',
                [stockResult[0].count, Number(productId)]
            );
        }
        
        res.json({ 
            code: 200, 
            message: `成功删除 ${result.affectedRows || 0} 个卡密` 
        });
    } catch (error) {
        console.error('批量删除卡密失败:', error);
        res.status(500).json({ code: 500, message: '批量删除卡密失败' });
    }
});

/**
 * 清空商品的所有未售出卡密
 * DELETE /api/cardkeys/product/:productId/clear
 */
router.delete('/product/:productId/clear', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { productId } = req.params;
        
        // 删除未售出的卡密
        const result = await db.update(
            'DELETE FROM card_keys WHERE product_id = ? AND status = 0',
            [Number(productId)]
        );
        
        // 更新商品库存为0
        await db.update('UPDATE products SET stock = 0 WHERE id = ?', [Number(productId)]);
        
        res.json({ 
            code: 200, 
            message: `成功清空 ${result.affectedRows || 0} 个未售出卡密` 
        });
    } catch (error) {
        console.error('清空卡密失败:', error);
        res.status(500).json({ code: 500, message: '清空卡密失败' });
    }
});

module.exports = router;
