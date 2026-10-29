const db = require('../config/db');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

// 1. Currencies
exports.getCurrencies = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM currencies ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createCurrency = async (req, res) => {
    const { currency_name, code, symbol, thousand_separator, decimal_separator, exchange_rate } = req.body;
    try {
        await db.execute(
            'INSERT INTO currencies (currency_name, code, symbol, thousand_separator, decimal_separator, exchange_rate, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
            [currency_name, (code || '').toUpperCase(), symbol, thousand_separator, decimal_separator, exchange_rate]
        );
        return res.status(201).json({ success: true, message: 'Currency created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateCurrency = async (req, res) => {
    const { id } = req.params;
    const { currency_name, code, symbol, thousand_separator, decimal_separator, exchange_rate } = req.body;
    try {
        await db.execute(
            'UPDATE currencies SET currency_name = ?, code = ?, symbol = ?, thousand_separator = ?, decimal_separator = ?, exchange_rate = ?, updated_at = NOW() WHERE id = ?',
            [currency_name, (code || '').toUpperCase(), symbol, thousand_separator, decimal_separator, exchange_rate, id]
        );
        return res.json({ success: true, message: 'Currency updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteCurrency = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if used by suppliers
        const [suppliers] = await db.execute('SELECT id FROM suppliers WHERE currency_id = ? LIMIT 1', [id]);
        if (suppliers.length > 0) return res.status(400).json({ success: false, message: 'Cannot delete currency used by suppliers' });
        
        await db.execute('DELETE FROM currencies WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Currency deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 2. Units
exports.getUnits = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM units ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createUnit = async (req, res) => {
    const { name, short_name } = req.body;
    try {
        await db.execute('INSERT INTO units (name, short_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [name, short_name]);
        return res.status(201).json({ success: true, message: 'Unit created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateUnit = async (req, res) => {
    const { id } = req.params;
    const { name, short_name } = req.body;
    try {
        await db.execute('UPDATE units SET name = ?, short_name = ?, updated_at = NOW() WHERE id = ?', [name, short_name, id]);
        return res.json({ success: true, message: 'Unit updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteUnit = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM units WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Unit deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 3. Product Categories
exports.getProductCategories = async (req, res) => {
    try {
        const [categories] = await db.execute(`
            SELECT c.*, p.category_name as parent_name 
            FROM categories c 
            LEFT JOIN categories p ON c.parent_id = p.id
        `);
        const [products] = await db.execute('SELECT id, category_id FROM products');
        const [productSuppliers] = await db.execute('SELECT product_id FROM product_suppliers');

        const productExpansionCounts = {};
        for (const p of products) {
            const mappedCount = productSuppliers.filter(ps => ps.product_id === p.id).length;
            productExpansionCounts[p.id] = mappedCount > 0 ? mappedCount : 1;
        }

        const rows = categories.map(c => {
            const productsInCategory = products.filter(p => p.category_id === c.id);
            const count = productsInCategory.reduce((sum, p) => sum + (productExpansionCounts[p.id] || 1), 0);
            return {
                ...c,
                products_count: count
            };
        });

        const unassociatedProducts = products.filter(p => p.category_id === null || p.category_id === 0);
        const unassociatedCount = unassociatedProducts.reduce((sum, p) => sum + (productExpansionCounts[p.id] || 1), 0);

        rows.sort((a, b) => b.id - a.id);

        return res.json({ 
            data: serialize(rows),
            unassociated_count: unassociatedCount
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getCategoryDetail = async (req, res) => {
    const { id } = req.params;
    try {
        let products = [];
        let categoryData = {};

        if (id === 'unassociated' || id === '0') {
            categoryData = {
                id: 0,
                category_code: 'BT',
                category_name: 'Belum Terkait'
            };
            const [rows] = await db.execute('SELECT p.* FROM products p WHERE p.category_id IS NULL OR p.category_id = 0');
            products = rows;
        } else {
            const [catRows] = await db.execute('SELECT * FROM categories WHERE id = ?', [id]);
            if (catRows.length === 0) return res.status(404).json({ success: false, message: 'Category not found' });
            categoryData = catRows[0];
            const [rows] = await db.execute('SELECT p.* FROM products p WHERE p.category_id = ?', [id]);
            products = rows;
        }

        const productIds = products.map(p => p.id);
        let expandedProducts = [];

        if (productIds.length > 0) {
            const [productSuppliers] = await db.query(
                `SELECT ps.*, s.supplier_name, s.supplier_code
                 FROM product_suppliers ps
                 JOIN suppliers s ON ps.supplier_id = s.id
                 WHERE ps.product_id IN (${productIds.join(',')})`
            );

            for (const p of products) {
                const mappedSuppliers = productSuppliers.filter(ps => ps.product_id === p.id);
                if (mappedSuppliers.length === 0) {
                    expandedProducts.push({
                        ...p,
                        is_asset: !!p.is_asset,
                        is_mandatory: !!p.is_mandatory
                    });
                } else {
                    for (const ps of mappedSuppliers) {
                        expandedProducts.push({
                            ...p,
                            id: p.id,
                            product_name: ps.product_name ? `${ps.product_name} (${ps.supplier_name})` : `${p.product_name} (${ps.supplier_name})`,
                            product_code: ps.product_code || ps.supplier_part_number || p.product_code,
                            supplier: {
                                id: ps.supplier_id,
                                supplier_name: ps.supplier_name,
                                supplier_code: ps.supplier_code
                            },
                            product_price: Number(ps.purchase_price),
                            is_asset: ps.is_asset !== null ? !!ps.is_asset : !!p.is_asset,
                            is_mandatory: ps.is_mandatory !== null ? !!ps.is_mandatory : !!p.is_mandatory,
                            product_unit: p.product_unit
                        });
                    }
                }
            }
        }

        return res.json({ 
            success: true, 
            data: serialize(categoryData), 
            products: serialize(expandedProducts) 
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createProductCategory = async (req, res) => {
    const { category_code, category_name, parent_id, valuation_method, description, is_active } = req.body;
    try {
        await db.execute(
            'INSERT INTO categories (category_code, category_name, parent_id, valuation_method, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())', 
            [
                category_code, 
                category_name, 
                parent_id ? Number(parent_id) : null, 
                valuation_method || 'AVCO', 
                description || null, 
                is_active !== undefined ? (is_active ? 1 : 0) : 1
            ]
        );
        return res.status(201).json({ success: true, message: 'Category created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateProductCategory = async (req, res) => {
    const { id } = req.params;
    const { category_code, category_name, parent_id, valuation_method, description, is_active } = req.body;
    try {
        await db.execute(
            'UPDATE categories SET category_code = ?, category_name = ?, parent_id = ?, valuation_method = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?', 
            [
                category_code, 
                category_name, 
                parent_id ? Number(parent_id) : null, 
                valuation_method || 'AVCO', 
                description || null, 
                is_active !== undefined ? (is_active ? 1 : 0) : 1, 
                id
            ]
        );
        return res.json({ success: true, message: 'Category updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteProductCategory = async (req, res) => {
    const { id } = req.params;
    try {
        const [products] = await db.execute('SELECT id FROM products WHERE category_id = ? LIMIT 1', [id]);
        if (products.length > 0) return res.status(400).json({ success: false, message: 'Cannot delete category with associated products' });
        
        await db.execute('DELETE FROM categories WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Category deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 4. PPN & PPH
exports.getPpn = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM ppns ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createPpn = async (req, res) => {
    const { name, rate } = req.body;
    try {
        await db.execute('INSERT INTO ppns (name, rate, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [name, rate]);
        return res.status(201).json({ success: true, message: 'PPN created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updatePpn = async (req, res) => {
    const { id } = req.params;
    const { name, rate } = req.body;
    try {
        await db.execute('UPDATE ppns SET name = ?, rate = ?, updated_at = NOW() WHERE id = ?', [name, rate, id]);
        return res.json({ success: true, message: 'PPN updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deletePpn = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM ppns WHERE id = ?', [id]);
        return res.json({ success: true, message: 'PPN deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getPph = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM pphs ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createPph = async (req, res) => {
    const { name, rate } = req.body;
    try {
        await db.execute('INSERT INTO pphs (name, rate, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [name, rate]);
        return res.status(201).json({ success: true, message: 'PPH created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updatePph = async (req, res) => {
    const { id } = req.params;
    const { name, rate } = req.body;
    try {
        await db.execute('UPDATE pphs SET name = ?, rate = ?, updated_at = NOW() WHERE id = ?', [name, rate, id]);
        return res.json({ success: true, message: 'PPH updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deletePph = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM pphs WHERE id = ?', [id]);
        return res.json({ success: true, message: 'PPH deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 5. Departments
exports.getDepartments = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM departments ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createDepartment = async (req, res) => {
    const { department_code, department_name } = req.body;
    try {
        await db.execute('INSERT INTO departments (department_code, department_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())', [department_code, department_name]);
        return res.status(201).json({ success: true, message: 'Department created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateDepartment = async (req, res) => {
    const { id } = req.params;
    const { department_code, department_name } = req.body;
    try {
        await db.execute('UPDATE departments SET department_code = ?, department_name = ?, updated_at = NOW() WHERE id = ?', [department_code, department_name, id]);
        return res.json({ success: true, message: 'Department updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteDepartment = async (req, res) => {
    const { id } = req.params;
    try {
        const [budgets] = await db.execute('SELECT id FROM master_budget WHERE department_id = ? LIMIT 1', [id]);
        if (budgets.length > 0) return res.status(400).json({ success: false, message: 'Cannot delete department with active budgets' });
        
        await db.execute('DELETE FROM departments WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Department deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 6. Suppliers
exports.getSuppliers = async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT s.*, sg.name as group_name, pt.name as payment_term_name 
            FROM suppliers s 
            LEFT JOIN supplier_groups sg ON s.group_id = sg.id
            LEFT JOIN payment_terms pt ON s.payment_term_id = pt.id
            ORDER BY s.id DESC
        `);
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getSupplierFormData = async (req, res) => {
    try {
        const [ppns] = await db.execute('SELECT id, name, rate FROM ppns');
        const [pphs] = await db.execute('SELECT id, name, rate FROM pphs');
        const [currencies] = await db.execute('SELECT id, code, currency_name, symbol FROM currencies');
        const [groups] = await db.execute('SELECT id, name FROM supplier_groups');
        const [paymentTerms] = await db.execute('SELECT id, name, days FROM payment_terms');
        
        return res.json({ 
            ppns: serialize(ppns), 
            pphs: serialize(pphs), 
            currencies: serialize(currencies), 
            groups: serialize(groups), 
            payment_terms: serialize(paymentTerms) 
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

// 7. Supplier Groups
exports.getSupplierGroups = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM supplier_groups ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createSupplierGroup = async (req, res) => {
    const { code, name, description } = req.body;
    try {
        await db.execute('INSERT INTO supplier_groups (code, name, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [code, name, description]);
        return res.status(201).json({ success: true, message: 'Supplier Group created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateSupplierGroup = async (req, res) => {
    const { id } = req.params;
    const { code, name, description } = req.body;
    try {
        await db.execute('UPDATE supplier_groups SET code = ?, name = ?, description = ?, updated_at = NOW() WHERE id = ?', [code, name, description, id]);
        return res.json({ success: true, message: 'Supplier Group updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteSupplierGroup = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM supplier_groups WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Supplier Group deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 8. Payment Terms
exports.getPaymentTerms = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM payment_terms ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createPaymentTerm = async (req, res) => {
    const { name, days, description } = req.body;
    try {
        await db.execute('INSERT INTO payment_terms (name, days, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [name, days, description]);
        return res.status(201).json({ success: true, message: 'Payment Term created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updatePaymentTerm = async (req, res) => {
    const { id } = req.params;
    const { name, days, description } = req.body;
    try {
        await db.execute('UPDATE payment_terms SET name = ?, days = ?, description = ?, updated_at = NOW() WHERE id = ?', [name, days, description, id]);
        return res.json({ success: true, message: 'Payment Term updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deletePaymentTerm = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM payment_terms WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Payment Term deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 9. Chart of Accounts
exports.getChartOfAccounts = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM chart_of_accounts ORDER BY code ASC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createChartOfAccount = async (req, res) => {
    const { code, name, type, is_active } = req.body;
    try {
        await db.execute('INSERT INTO chart_of_accounts (code, name, type, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', 
            [code, name, type, is_active !== undefined ? is_active : 1]);
        return res.status(201).json({ success: true, message: 'Chart of Account created' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateChartOfAccount = async (req, res) => {
    const { id } = req.params;
    const { code, name, type, is_active } = req.body;
    try {
        await db.execute('UPDATE chart_of_accounts SET code = ?, name = ?, type = ?, is_active = ?, updated_at = NOW() WHERE id = ?', 
            [code, name, type, is_active, id]);
        return res.json({ success: true, message: 'Chart of Account updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteChartOfAccount = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM chart_of_accounts WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Chart of Account deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

// 10. Tipe Barang Jadi
exports.getTipeBarangJadi = async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM tipe_barang_jadi ORDER BY id DESC');
        return res.json({ data: serialize(rows) });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createTipeBarangJadi = async (req, res) => {
    const { code, name, description, is_active } = req.body;
    try {
        await db.execute(
            'INSERT INTO tipe_barang_jadi (code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())', 
            [code, name, description || null, is_active !== undefined ? (is_active ? 1 : 0) : 1]
        );
        return res.status(201).json({ success: true, message: 'Tipe Barang Jadi created successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.updateTipeBarangJadi = async (req, res) => {
    const { id } = req.params;
    const { code, name, description, is_active } = req.body;
    try {
        await db.execute(
            'UPDATE tipe_barang_jadi SET code = ?, name = ?, description = ?, is_active = ?, updated_at = NOW() WHERE id = ?', 
            [code, name, description || null, is_active ? 1 : 0, id]
        );
        return res.json({ success: true, message: 'Tipe Barang Jadi updated successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.deleteTipeBarangJadi = async (req, res) => {
    const { id } = req.params;
    try {
        await db.execute('DELETE FROM tipe_barang_jadi WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Tipe Barang Jadi deleted successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};
