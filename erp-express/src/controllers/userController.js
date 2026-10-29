const db = require('../config/db');
const bcrypt = require('bcryptjs');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

exports.getUsers = async (req, res) => {
    try {
        const { search, page = 1 } = req.query;
        const limit = 10;
        const offset = (parseInt(page) - 1) * limit;

        let query = 'SELECT u.*, d.department_name FROM users u LEFT JOIN departments d ON u.department_id = d.id';
        let conditions = [];
        let params = [];

        if (search && search !== 'undefined') {
            conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
            params.push(`%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const countParams = [...params];

        query += ` ORDER BY u.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        const [rows] = await db.query(query, countParams);
        
        // Enrich rows with roles, categories, and products
        const enrichedRows = await Promise.all(rows.map(async (user) => {
            // Map department_name to department object for frontend compatibility
            if (user.department_name) {
                user.department = {
                    id: user.department_id,
                    department_name: user.department_name
                };
            }
            
            // Fetch Roles
            const [roles] = await db.execute(
                'SELECT r.id, r.name FROM roles r JOIN model_has_roles mhr ON r.id = mhr.role_id WHERE mhr.model_id = ? AND mhr.model_type = ?',
                [user.id, 'App\\Models\\User']
            );
            user.roles = roles;

            // Fetch Assigned Categories
            const [categories] = await db.execute(
                'SELECT c.id, c.category_name FROM categories c JOIN user_categories uc ON c.id = uc.category_id WHERE uc.user_id = ?',
                [user.id]
            );
            user.categories = categories;

            // Fetch Assigned Products
            const [products] = await db.execute(
                'SELECT p.id, p.product_name, p.product_code FROM products p JOIN user_categories uc ON p.id = uc.product_id WHERE uc.user_id = ?',
                [user.id]
            );
            user.products = products;

            return user;
        }));

        // Count query must handle filters
        let countQuery = 'SELECT COUNT(*) as count FROM users u';
        if (conditions.length > 0) {
            countQuery += ' WHERE ' + conditions.join(' AND ');
        }
        const [countRows] = await db.query(countQuery, countParams);
        const count = countRows[0].count;

        return res.json({
            data: serialize(enrichedRows),
            current_page: parseInt(page),
            last_page: Math.ceil(count / limit),
            total: count
        });
    } catch (error) {
        console.error('getUsers error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.getFormData = async (req, res) => {
    try {
        const [departments] = await db.execute('SELECT id, department_name FROM departments');
        const [roles] = await db.execute('SELECT id, name FROM roles WHERE name != "Super Admin"');
        const [categories] = await db.execute('SELECT id, category_name FROM categories');
        const [products] = await db.execute('SELECT id, product_name, product_code FROM products');
        
        // Fetch Product Groups with their mappings
        const [groups] = await db.query('SELECT id, name FROM user_product_groups ORDER BY name ASC');
        const enrichedGroups = await Promise.all(groups.map(async (group) => {
            const [catRows] = await db.execute(
                'SELECT category_id FROM user_product_group_has_categories WHERE group_id = ?',
                [group.id]
            );
            group.categories = catRows.map(c => c.category_id);

            const [prodRows] = await db.execute(
                'SELECT product_id FROM user_product_group_has_products WHERE group_id = ?',
                [group.id]
            );
            group.products = prodRows.map(p => p.product_id);
            return group;
        }));

        return res.json({
            departments: serialize(departments),
            roles: serialize(roles),
            categories: serialize(categories),
            products: serialize(products),
            productGroups: serialize(enrichedGroups)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, password, department_id, role, is_active, categories, products } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password, department_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
            [name, email, hashedPassword, department_id, is_active ? 1 : 0]
        );
        
        const userId = result.insertId;

        // Role assignment
        if (role) {
            const [roleRows] = await db.execute('SELECT id FROM roles WHERE name = ?', [role]);
            if (roleRows.length > 0) {
                await db.execute(
                    'INSERT INTO model_has_roles (role_id, model_id, model_type) VALUES (?, ?, ?)',
                    [roleRows[0].id, userId, 'App\\Models\\User']
                );
            }
        }

        // Sync Categories
        if (categories && Array.isArray(categories)) {
            for (let catId of categories) {
                await db.execute('INSERT INTO user_categories (user_id, category_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [userId, catId]);
            }
        }

        // Sync Products
        if (products && Array.isArray(products)) {
            for (let prodId of products) {
                await db.execute('INSERT INTO user_categories (user_id, product_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [userId, prodId]);
            }
        }

        return res.status(201).json({ message: 'User created successfully', userId: userId.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, password, department_id, role, is_active, categories, products } = req.body;
    try {
        let updateQuery = 'UPDATE users SET name = ?, email = ?, department_id = ?, is_active = ?, updated_at = NOW()';
        let params = [name, email, department_id, is_active ? 1 : 0];

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password = ?';
            params.push(hashedPassword);
        }

        updateQuery += ' WHERE id = ?';
        params.push(id);

        await db.execute(updateQuery, params);

        // Update role
        if (role) {
            const [roleRows] = await db.execute('SELECT id FROM roles WHERE name = ?', [role]);
            if (roleRows.length > 0) {
                await db.execute('DELETE FROM model_has_roles WHERE model_id = ? AND model_type = ?', [id, 'App\\Models\\User']);
                await db.execute(
                    'INSERT INTO model_has_roles (role_id, model_id, model_type) VALUES (?, ?, ?)',
                    [roleRows[0].id, id, 'App\\Models\\User']
                );
            }
        }

        // Sync Categories & Products
        await db.execute('DELETE FROM user_categories WHERE user_id = ?', [id]);
        
        if (categories && Array.isArray(categories)) {
            for (let catId of categories) {
                await db.execute('INSERT INTO user_categories (user_id, category_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [id, catId]);
            }
        }

        if (products && Array.isArray(products)) {
            for (let prodId of products) {
                await db.execute('INSERT INTO user_categories (user_id, product_id, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [id, prodId]);
            }
        }

        return res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        if (id == 1) return res.status(403).json({ message: 'Cannot delete the main Administrator account.' });
        
        // Cleanup relationships
        await db.execute('DELETE FROM model_has_roles WHERE model_id = ? AND model_type = ?', [id, 'App\\Models\\User']);
        await db.execute('DELETE FROM user_categories WHERE user_id = ?', [id]);
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        
        return res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
};
