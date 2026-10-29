const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
    }

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
        
        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = rows[0];

        if (user.is_active !== 1 && !user.is_active) {
            return res.status(403).json({ message: 'Your account is deactivated!' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Fetch Roles
        const [roles] = await db.execute(`
            SELECT r.* 
            FROM roles r 
            JOIN model_has_roles mhr ON r.id = mhr.role_id 
            WHERE mhr.model_id = ? AND mhr.model_type = "App\\\\Models\\\\User"
        `, [user.id]);

        const roleNames = roles.map(r => r.name);

        // Fetch Permissions
        const [directPermissions] = await db.execute(`
            SELECT p.name 
            FROM permissions p 
            JOIN model_has_permissions mhp ON p.id = mhp.permission_id 
            WHERE mhp.model_id = ? AND mhp.model_type = "App\\\\Models\\\\User"
        `, [user.id]);

        const [rolePermissions] = await db.execute(`
            SELECT p.name 
            FROM permissions p 
            JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
            JOIN model_has_roles mhr ON rhp.role_id = mhr.role_id 
            WHERE mhr.model_id = ? AND mhr.model_type = "App\\\\Models\\\\User"
        `, [user.id]);

        const allPermissions = [...new Set([
            ...directPermissions.map(p => p.name),
            ...rolePermissions.map(p => p.name)
        ])];

        // Fetch Categories
        const [categories] = await db.execute(`
            SELECT c.*, uc.user_id, uc.category_id as pivot_category_id, uc.created_at as pivot_created_at, uc.updated_at as pivot_updated_at
            FROM categories c 
            JOIN user_categories uc ON c.id = uc.category_id 
            WHERE uc.user_id = ?
        `, [user.id]);

        // Format categories with pivot field like Laravel
        const formattedCategories = categories.map(c => {
            const pivot = {
                user_id: c.user_id,
                category_id: c.pivot_category_id,
                created_at: c.pivot_created_at,
                updated_at: c.pivot_updated_at
            };
            delete c.user_id;
            delete c.pivot_category_id;
            delete c.pivot_created_at;
            delete c.pivot_updated_at;
            return { ...c, pivot };
        });

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '24h' }
        );

        // Remove sensitive data before sending back
        delete user.password;

        // Construct complete user object
        const finalUser = {
            ...user,
            roles: roles,
            role_names: roleNames,
            permissions: allPermissions,
            categories: formattedCategories,
            media: [] // Media table logic is complex, returning empty for now
        };

        // BigInt serialization fix
        const serializedUser = JSON.parse(JSON.stringify(finalUser, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return res.json({
            message: 'Login successful',
            token,
            user: serializedUser
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

exports.me = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = rows[0];

        // Fetch Roles
        const [roles] = await db.execute(`
            SELECT r.* 
            FROM roles r 
            JOIN model_has_roles mhr ON r.id = mhr.role_id 
            WHERE mhr.model_id = ? AND mhr.model_type = "App\\\\Models\\\\User"
        `, [user.id]);

        const roleNames = roles.map(r => r.name);

        // Fetch Permissions
        const [directPermissions] = await db.execute(`
            SELECT p.name 
            FROM permissions p 
            JOIN model_has_permissions mhp ON p.id = mhp.permission_id 
            WHERE mhp.model_id = ? AND mhp.model_type = "App\\\\Models\\\\User"
        `, [user.id]);

        const [rolePermissions] = await db.execute(`
            SELECT p.name 
            FROM permissions p 
            JOIN role_has_permissions rhp ON p.id = rhp.permission_id 
            JOIN model_has_roles mhr ON rhp.role_id = mhr.role_id 
            WHERE mhr.model_id = ? AND mhr.model_type = "App\\\\Models\\\\User"
        `, [user.id]);

        const allPermissions = [...new Set([
            ...directPermissions.map(p => p.name),
            ...rolePermissions.map(p => p.name)
        ])];

        // Fetch Categories
        const [categories] = await db.execute(`
            SELECT c.*, uc.user_id, uc.category_id as pivot_category_id, uc.created_at as pivot_created_at, uc.updated_at as pivot_updated_at
            FROM categories c 
            JOIN user_categories uc ON c.id = uc.category_id 
            WHERE uc.user_id = ?
        `, [user.id]);

        const formattedCategories = categories.map(c => {
            const pivot = {
                user_id: c.user_id,
                category_id: c.pivot_category_id,
                created_at: c.pivot_created_at,
                updated_at: c.pivot_updated_at
            };
            delete c.user_id;
            delete c.pivot_category_id;
            delete c.pivot_created_at;
            delete c.pivot_updated_at;
            return { ...c, pivot };
        });

        delete user.password;

        const finalUser = {
            ...user,
            roles: roles,
            role_names: roleNames,
            permissions: allPermissions,
            categories: formattedCategories,
            media: []
        };

        const serializedUser = JSON.parse(JSON.stringify(finalUser, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));

        return res.json({
            status: 'success',
            user: serializedUser
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        return res.status(500).json({ message: 'Server error: ' + error.message });
    }
};

