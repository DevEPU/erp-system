const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getProductGroups = async (req, res) => {
    try {
        const [groups] = await db.query('SELECT * FROM user_product_groups ORDER BY name ASC');
        
        const enrichedGroups = await Promise.all(groups.map(async (group) => {
            // Fetch Category IDs
            const [categories] = await db.execute(
                'SELECT category_id FROM user_product_group_has_categories WHERE group_id = ?',
                [group.id]
            );
            group.categories = categories.map(c => c.category_id);

            // Fetch Product IDs
            const [products] = await db.execute(
                'SELECT product_id FROM user_product_group_has_products WHERE group_id = ?',
                [group.id]
            );
            group.products = products.map(p => p.product_id);

            return group;
        }));

        res.json(serialize(enrichedGroups));
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.createProductGroup = async (req, res) => {
    const { name, categories, products } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [result] = await connection.execute(
            'INSERT INTO user_product_groups (name, created_at, updated_at) VALUES (?, NOW(), NOW())',
            [name]
        );
        const groupId = result.insertId;

        if (categories && Array.isArray(categories)) {
            for (const catId of categories) {
                await connection.execute(
                    'INSERT INTO user_product_group_has_categories (group_id, category_id) VALUES (?, ?)',
                    [groupId, catId]
                );
            }
        }

        if (products && Array.isArray(products)) {
            for (const prodId of products) {
                await connection.execute(
                    'INSERT INTO user_product_group_has_products (group_id, product_id) VALUES (?, ?)',
                    [groupId, prodId]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Product Group created successfully', id: groupId.toString() });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
};

exports.updateProductGroup = async (req, res) => {
    const { id } = req.params;
    const { name, categories, products } = req.body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(
            'UPDATE user_product_groups SET name = ?, updated_at = NOW() WHERE id = ?',
            [name, id]
        );

        // Sync Categories
        await connection.execute('DELETE FROM user_product_group_has_categories WHERE group_id = ?', [id]);
        if (categories && Array.isArray(categories)) {
            for (const catId of categories) {
                await connection.execute(
                    'INSERT INTO user_product_group_has_categories (group_id, category_id) VALUES (?, ?)',
                    [id, catId]
                );
            }
        }

        // Sync Products
        await connection.execute('DELETE FROM user_product_group_has_products WHERE group_id = ?', [id]);
        if (products && Array.isArray(products)) {
            for (const prodId of products) {
                await connection.execute(
                    'INSERT INTO user_product_group_has_products (group_id, product_id) VALUES (?, ?)',
                    [id, prodId]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Product Group updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    } finally {
        connection.release();
    }
};

exports.deleteProductGroup = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM user_product_groups WHERE id = ?', [id]);
        res.json({ message: 'Product Group deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
