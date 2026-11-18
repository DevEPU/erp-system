const db = require('../config/db');
const approvalService = require('../services/approvalService');

// Utility function for BigInt serialization
const serialize = (data) => JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
));

const getUserProductConditions = async (userId) => {
    if (!userId) return null;
    
    // Check if Super Admin
    const [roles] = await db.execute(`
        SELECT r.name 
        FROM roles r 
        JOIN model_has_roles mhr ON r.id = mhr.role_id 
        WHERE mhr.model_id = ? AND mhr.model_type = "App\\\\Models\\\\User"
    `, [userId]);
    
    const isSuperAdmin = roles.some(r => r.name === 'Super Admin');
    if (isSuperAdmin) return null;

    // Get user categories & products
    const [userCats] = await db.execute('SELECT category_id FROM user_categories WHERE user_id = ? AND category_id IS NOT NULL', [userId]);
    const [userProds] = await db.execute('SELECT product_id FROM user_categories WHERE user_id = ? AND product_id IS NOT NULL', [userId]);

    const catIds = userCats.map(c => c.category_id);
    const prodIds = userProds.map(p => p.product_id);

    return { catIds, prodIds };
};

exports.getProducts = async (req, res) => {
    try {
        const { search, category_id, is_asset, filter_status, sort_key = 'id', sort_order = 'desc', page = 1, limit = 10, parent_only, warehouse_id, month } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let stockMultiplier = 1.0;
        if (month && month !== 'all' && month !== 'undefined') {
            const parts = month.split('-');
            if (parts.length === 2) {
                const yNum = parseInt(parts[0]);
                const mNum = parseInt(parts[1]);
                
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1;
                
                const monthDiff = (yNum - currentYear) * 12 + (mNum - currentMonth);
                stockMultiplier = 1.0 + (monthDiff * 0.05);
                stockMultiplier = Math.max(0.7, Math.min(1.3, stockMultiplier));
            }
        }

        let query = "";
        let countQuery = "";
        let params = [];
        let countParams = [];

        // Apply User Product mapping restrictions helper
        const userScope = await getUserProductConditions(req.user?.id);

        if (parent_only === 'true') {
            // Keep original behavior (parent_only)
            query = `
                SELECT p.*, c.category_name, pu.sell_price as sell_price_l1, pu.buy_price as buy_price_l1 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_units pu ON p.id = pu.product_id AND pu.level = 1
            `;
            countQuery = 'SELECT COUNT(*) as count FROM products p';

            let conditions = [];
            if (search && search !== 'undefined' && search !== '[object Object]') {
                conditions.push('(p.product_name LIKE ? OR p.product_code LIKE ? OR p.bom_code LIKE ?)');
                const s = `%${search}%`;
                params.push(s, s, s);
            }
            if (category_id && category_id !== 'all' && category_id !== 'undefined') {
                conditions.push('p.category_id = ?');
                params.push(category_id);
            }
            if (is_asset && is_asset !== 'all' && is_asset !== 'undefined') {
                conditions.push('p.is_asset = ?');
                params.push(is_asset);
            }
            if (warehouse_id && warehouse_id !== 'all' && warehouse_id !== 'undefined') {
                conditions.push('EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id = ?)');
                params.push(warehouse_id);
            } else {
                conditions.push('(EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id IS NOT NULL AND pl.warehouse_id > 0) OR EXISTS (SELECT 1 FROM warehouse_stocks ws WHERE ws.product_id = p.id AND ws.warehouse_id IS NOT NULL AND ws.warehouse_id > 0))');
            }
            if (userScope && !category_id) {
                // Only apply userScope filter when no specific category is requested
                // When category_id is explicitly specified (e.g., for manufacturing dropdowns), allow all products
                const { catIds, prodIds } = userScope;
                if (catIds.length > 0 || prodIds.length > 0) {
                    let userConditions = [];
                    if (catIds.length > 0) {
                        userConditions.push('p.category_id IN (' + catIds.map(() => '?').join(',') + ')');
                        params.push(...catIds);
                    }
                    if (prodIds.length > 0) {
                        userConditions.push('p.id IN (' + prodIds.map(() => '?').join(',') + ')');
                        params.push(...prodIds);
                    }
                    conditions.push('(' + userConditions.join(' OR ') + ')');
                } else {
                    conditions.push('1=0');
                }
            }
            if (filter_status && filter_status !== 'all') {
                if (filter_status === 'no_price') {
                    conditions.push('(p.product_price = 0 OR p.product_price IS NULL)');
                } else if (filter_status === 'no_supplier') {
                    conditions.push('p.supplier_id IS NULL');
                } else if (filter_status === 'no_uom') {
                    conditions.push("(p.product_unit IS NULL OR p.product_unit = '')");
                } else if (filter_status === 'incomplete') {
                    conditions.push("(p.product_price = 0 OR p.product_price IS NULL OR p.supplier_id IS NULL OR p.product_unit IS NULL OR p.product_unit = '')");
                } else if (filter_status === 'is_mandatory') {
                    conditions.push('p.is_mandatory = 1');
                }
            }

            countParams = [...params];

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
                countQuery += ' WHERE ' + conditions.join(' AND ');
            }

            let orderBy = 'p.id DESC';
            if (sort_key === 'name') orderBy = 'p.product_name ' + (sort_order === 'asc' ? 'ASC' : 'DESC');
            if (sort_key === 'code') orderBy = 'p.product_code ' + (sort_order === 'asc' ? 'ASC' : 'DESC');
            if (sort_key === 'price') orderBy = 'p.product_price ' + (sort_order === 'asc' ? 'ASC' : 'DESC');
            if (sort_key === 'id') orderBy = 'p.id ' + (sort_order === 'asc' ? 'ASC' : 'DESC');

            query += ` ORDER BY ${orderBy} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        } else {
            // Expanded query (do LEFT JOIN with product_suppliers on SQL level for proper pagination!)
            query = `
                SELECT 
                  p.id as id,
                  p.is_asset,
                  p.category_id,
                  p.is_mandatory,
                  p.product_name as parent_name,
                  p.product_type,
                  p.bom_code,
                  p.product_code as parent_code,
                  p.product_barcode_symbology,
                  p.product_quantity as parent_quantity,
                  p.min_qty as parent_min_qty,
                  p.max_qty as parent_max_qty,
                  p.product_price as parent_price,
                  p.product_unit,
                  p.product_stock_alert,
                  p.product_order_tax,
                  p.product_tax_type,
                  p.product_note,
                  p.created_at,
                  p.updated_at,
                  p.supplier_id as parent_supplier_id,
                  p.part_number as parent_part_number,
                  p.tax_item_code as parent_tax_item_code,
                  
                  c.category_name,
                  
                  pu.sell_price as sell_price_l1,
                  pu.buy_price as buy_price_l1,
                  
                  ps.id as ps_id,
                  ps.supplier_id as ps_supplier_id,
                  ps.supplier_part_number,
                  ps.purchase_price as ps_purchase_price,
                  ps.sell_price as ps_sell_price,
                  ps.min_qty as ps_min_qty,
                  ps.max_qty as ps_max_qty,
                  ps.product_name as ps_product_name,
                  ps.product_code as ps_product_code,
                  ps.product_type as ps_product_type,
                  ps.bom_code as ps_bom_code,
                  ps.is_asset as ps_is_asset,
                  ps.is_mandatory as ps_is_mandatory,
                  ps.tax_item_code as ps_tax_item_code,
                  
                  s.supplier_name,
                  s.supplier_code
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN product_units pu ON p.id = pu.product_id AND pu.level = 1
                LEFT JOIN product_suppliers ps ON p.id = ps.product_id
                LEFT JOIN suppliers s ON ps.supplier_id = s.id
            `;

            countQuery = `
                SELECT COUNT(*) as count
                FROM products p
                LEFT JOIN product_suppliers ps ON p.id = ps.product_id
            `;

            let conditions = [];
            if (search && search !== 'undefined' && search !== '[object Object]') {
                conditions.push('(p.product_name LIKE ? OR p.product_code LIKE ? OR p.bom_code LIKE ? OR ps.product_name LIKE ? OR ps.product_code LIKE ? OR ps.supplier_part_number LIKE ?)');
                const s = `%${search}%`;
                params.push(s, s, s, s, s, s);
            }
            if (category_id && category_id !== 'all' && category_id !== 'undefined') {
                conditions.push('p.category_id = ?');
                params.push(category_id);
            }
            if (is_asset && is_asset !== 'all' && is_asset !== 'undefined') {
                conditions.push('COALESCE(ps.is_asset, p.is_asset) = ?');
                params.push(is_asset);
            }
            // Enforce product MUST be connected to a warehouse
            if (warehouse_id && warehouse_id !== 'all' && warehouse_id !== 'undefined') {
                conditions.push('EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id = ?)');
                params.push(warehouse_id);
            } else {
                conditions.push('(EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id IS NOT NULL AND pl.warehouse_id > 0) OR EXISTS (SELECT 1 FROM warehouse_stocks ws WHERE ws.product_id = p.id AND ws.warehouse_id IS NOT NULL AND ws.warehouse_id > 0))');
            }
            if (userScope) {
                const { catIds, prodIds } = userScope;
                if (catIds.length > 0 || prodIds.length > 0) {
                    let userConditions = [];
                    if (catIds.length > 0) {
                        userConditions.push('p.category_id IN (' + catIds.map(() => '?').join(',') + ')');
                        params.push(...catIds);
                    }
                    if (prodIds.length > 0) {
                        userConditions.push('p.id IN (' + prodIds.map(() => '?').join(',') + ')');
                        params.push(...prodIds);
                    }
                    conditions.push('(' + userConditions.join(' OR ') + ')');
                } else {
                    conditions.push('1=0');
                }
            }
            if (filter_status && filter_status !== 'all') {
                if (filter_status === 'no_price') {
                    conditions.push('(COALESCE(ps.purchase_price, p.product_price) = 0 OR COALESCE(ps.purchase_price, p.product_price) IS NULL)');
                } else if (filter_status === 'no_supplier') {
                    conditions.push('COALESCE(ps.supplier_id, p.supplier_id) IS NULL');
                } else if (filter_status === 'no_uom') {
                    conditions.push("(p.product_unit IS NULL OR p.product_unit = '')");
                } else if (filter_status === 'incomplete') {
                    conditions.push("(COALESCE(ps.purchase_price, p.product_price) = 0 OR COALESCE(ps.purchase_price, p.product_price) IS NULL OR COALESCE(ps.supplier_id, p.supplier_id) IS NULL OR p.product_unit IS NULL OR p.product_unit = '')");
                } else if (filter_status === 'is_mandatory') {
                    conditions.push('COALESCE(ps.is_mandatory, p.is_mandatory) = 1');
                }
            }

            countParams = [...params];

            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
                countQuery += ' WHERE ' + conditions.join(' AND ');
            }

            let orderBy = 'p.id DESC, ps.id ASC';
            if (sort_key === 'name') orderBy = 'COALESCE(ps.product_name, p.product_name) ' + (sort_order === 'asc' ? 'ASC' : 'DESC');
            if (sort_key === 'code') orderBy = 'COALESCE(ps.product_code, ps.supplier_part_number, p.product_code) ' + (sort_order === 'asc' ? 'ASC' : 'DESC');
            if (sort_key === 'price') orderBy = 'COALESCE(ps.purchase_price, p.product_price) ' + (sort_order === 'asc' ? 'ASC' : 'DESC');
            if (sort_key === 'id') orderBy = 'p.id ' + (sort_order === 'asc' ? 'ASC' : 'DESC') + ', ps.id ASC';

            query += ` ORDER BY ${orderBy} LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
        }

        const [rows] = await db.query(query, params);
        const [[{ count }]] = await db.query(countQuery, countParams);

        // Fetch locations and stocks for all products in the result set
        const productIds = [...new Set(rows.map(r => r.id))];
        let locations = [];
        let warehouseStocks = [];
        const [warehouses] = await db.query('SELECT id, name, code, short_name FROM warehouses');

        if (productIds.length > 0) {
            const [locRows] = await db.query(
                `SELECT pl.*, w.name as warehouse_name, w.code as warehouse_code, w.short_name as warehouse_short_name
                 FROM product_locations pl 
                 JOIN warehouses w ON pl.warehouse_id = w.id 
                 WHERE pl.product_id IN (${productIds.join(',')})`
            );
            locations = locRows;

            const [wsRows] = await db.query(
                `SELECT ws.*, w.name as warehouse_name, w.code as warehouse_code, w.short_name as warehouse_short_name
                 FROM warehouse_stocks ws
                 JOIN warehouses w ON ws.warehouse_id = w.id
                 WHERE ws.product_id IN (${productIds.join(',')})`
            );
            warehouseStocks = wsRows;
        }

        const expandedRows = [];
        for (const r of rows) {
            if (parent_only === 'true' || !r.ps_id) {
                // Return standard product row
                const prodLocations = locations.filter(l => String(l.product_id) === String(r.id));
                const mergedLocations = warehouses.map(w => {
                    const loc = prodLocations.find(l => String(l.warehouse_id) === String(w.id));
                    const wsItemsForWh = warehouseStocks.filter(
                        ws => String(ws.product_id) === String(r.id) && String(ws.warehouse_id) === String(w.id)
                    );
                    const accumulatedStock = Math.round(wsItemsForWh.reduce((sum, s) => sum + Number(s.qty_stock), 0) * stockMultiplier);
                    const hpp = wsItemsForWh.length > 0 ? Number(wsItemsForWh[0].hpp || 0) : 0;
                    return {
                        id: loc?.id || 0,
                        product_id: r.id,
                        warehouse_id: w.id,
                        warehouse_name: w.name,
                        warehouse_code: w.code,
                        warehouse_short_name: w.short_name,
                        aisle: loc?.aisle || "",
                        min_qty: Number(loc?.min_qty || 0),
                        max_qty: Number(loc?.max_qty || 0),
                        stock: accumulatedStock,
                        hpp: hpp
                    };
                });
                const totalQty = mergedLocations.reduce((sum, loc) => sum + loc.stock, 0);

                expandedRows.push({
                    id: r.id,
                    is_asset: r.is_asset,
                    category_id: r.category_id,
                    is_mandatory: r.is_mandatory,
                    product_name: r.parent_name || r.product_name,
                    product_type: r.product_type,
                    bom_code: r.bom_code,
                    product_code: r.parent_code || r.product_code,
                    product_barcode_symbology: r.product_barcode_symbology,
                    product_quantity: totalQty,
                    min_qty: r.min_qty,
                    max_qty: r.max_qty,
                    product_price: Number(r.buy_price_l1 || r.parent_price || r.product_price || 0),
                    buy_price_l1: Number(r.buy_price_l1 || r.parent_price || r.product_price || 0),
                    sell_price_l1: Number(r.sell_price_l1 || 0),
                    product_unit: r.product_unit,
                    product_stock_alert: r.product_stock_alert,
                    product_order_tax: r.product_order_tax,
                    product_tax_type: r.product_tax_type,
                    product_note: r.product_note,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    supplier_id: r.parent_supplier_id,
                    part_number: r.parent_part_number,
                    tax_item_code: r.parent_tax_item_code,
                    category: {
                        id: r.category_id,
                        category_name: r.category_name
                    },
                    locations: serialize(mergedLocations)
                });
            } else {
                // Return pre-expanded supplier row
                const wsForSupplier = warehouseStocks.filter(ws => 
                    String(ws.product_id) === String(r.id) && 
                    (String(ws.supplier_id) === String(r.ps_supplier_id) || ws.supplier_id === null)
                );
                const supplierLocations = warehouses.map(w => {
                    const wsList = wsForSupplier.filter(ws => String(ws.warehouse_id) === String(w.id));
                    const wsExact = wsList.find(ws => String(ws.supplier_id) === String(r.ps_supplier_id));
                    const ws = wsExact || wsList[0];
                    const accumulatedStock = Math.round(wsList.reduce((sum, s) => sum + Number(s.qty_stock), 0) * stockMultiplier);
                    return {
                        product_id: r.id,
                        warehouse_id: w.id,
                        warehouse_name: w.name,
                        warehouse_code: w.code,
                        warehouse_short_name: w.short_name,
                        stock: accumulatedStock,
                        hpp: ws ? Number(ws.hpp || 0) : 0,
                        aisle: "",
                        min_qty: Number(r.ps_min_qty || 0),
                        max_qty: Number(r.ps_max_qty || 0)
                    };
                });
                const totalQty = supplierLocations.reduce((sum, loc) => sum + loc.stock, 0);

                expandedRows.push({
                    id: r.id,
                    is_asset: r.ps_is_asset !== null ? r.ps_is_asset : r.is_asset,
                    category_id: r.category_id,
                    is_mandatory: r.ps_is_mandatory !== null ? r.ps_is_mandatory : r.is_mandatory,
                    product_name: r.ps_product_name ? `${r.ps_product_name} (${r.supplier_name})` : `${r.parent_name} (${r.supplier_name})`,
                    product_type: r.ps_product_type || r.product_type,
                    bom_code: r.ps_bom_code || r.bom_code,
                    product_code: r.ps_product_code || r.supplier_part_number || r.parent_code || r.product_code,
                    product_barcode_symbology: r.product_barcode_symbology,
                    product_quantity: totalQty,
                    min_qty: Number(r.ps_min_qty || 0),
                    max_qty: Number(r.ps_max_qty || 0),
                    product_price: Number(r.ps_purchase_price || 0),
                    buy_price_l1: Number(r.ps_purchase_price || 0),
                    sell_price_l1: Number(r.ps_sell_price || r.sell_price_l1 || 0),
                    product_unit: r.product_unit,
                    product_stock_alert: r.product_stock_alert,
                    product_order_tax: r.product_order_tax,
                    product_tax_type: r.product_tax_type,
                    product_note: r.product_note,
                    created_at: r.created_at,
                    updated_at: r.updated_at,
                    supplier_id: r.ps_supplier_id,
                    part_number: r.supplier_part_number || r.parent_part_number,
                    tax_item_code: r.ps_tax_item_code || r.parent_tax_item_code,
                    supplier: {
                        id: r.ps_supplier_id,
                        supplier_name: r.supplier_name,
                        supplier_code: r.supplier_code
                    },
                    category: {
                        id: r.category_id,
                        category_name: r.category_name
                    },
                    locations: serialize(supplierLocations)
                });
            }
        }

        return res.json({
            success: true,
            data: serialize(expandedRows),
            current_page: parseInt(page),
            per_page: parseInt(limit),
            last_page: Math.ceil(count / parseInt(limit)),
            total: count
        });

    } catch (error) { 
        console.error('getProducts Error:', error);
        res.status(500).json({ success: false, message: error.message }); 
    }
};

const getProductCategoryGroup = (p) => {
    const typeStr = String(p.product_type || '').toUpperCase();
    const catStr = String(p.category_name || '').toUpperCase();
    const combined = `${typeStr} ${catStr}`;

    if (combined.includes('FINISHED')) return 'fg';
    if (combined.includes('WORK IN PROGRESS') || combined.includes('WIP') || combined.includes('SEMI FINISHED')) return 'wip';
    return 'raw_comp_pkg';
};

exports.getProductsStats = async (req, res) => {
    try {
        const { search, category_id, is_asset } = req.query;

        let productsQuery = `
            SELECT p.*, c.category_name 
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const productsParams = [];

        if (search) {
            productsQuery += ` AND (p.product_name LIKE ? OR p.product_code LIKE ? OR p.brand LIKE ?)`;
            const searchParam = `%${search}%`;
            productsParams.push(searchParam, searchParam, searchParam);
        }
        if (category_id && category_id !== 'all') {
            productsQuery += ` AND p.category_id = ?`;
            productsParams.push(category_id);
        }
        if (is_asset && is_asset !== 'all') {
            productsQuery += ` AND p.is_asset = ?`;
            productsParams.push(is_asset === 'true' ? 1 : 0);
        }

        const [products] = await db.query(productsQuery, productsParams);
        const [suppliers] = await db.query('SELECT product_id, purchase_price, supplier_id FROM product_suppliers');

        let totalProducts = products.length;
        let totalMultiVendor = 0;
        let totalRawCompPkg = 0;
        let totalWip = 0;
        let totalFg = 0;

        for (const p of products) {
            const mapped = suppliers.filter(s => String(s.product_id) === String(p.id));
            if (mapped.length > 1) {
                totalMultiVendor += 1;
            }

            const catGroup = getProductCategoryGroup(p);
            if (catGroup === 'fg') totalFg += 1;
            else if (catGroup === 'wip') totalWip += 1;
            else totalRawCompPkg += 1;
        }

        return res.json({
            total_products: totalProducts,
            total_multi_vendor: totalMultiVendor,
            total_raw_comp_pkg: totalRawCompPkg,
            total_wip: totalWip,
            total_fg: totalFg
        });
    } catch (error) { 
        res.status(500).json({ message: error.message }); 
    }
};

exports.getProductsStatsItems = async (req, res) => {
    try {
        const { type = 'total' } = req.query;

        const [rows] = await db.query(`
            SELECT p.*, c.category_name, s.supplier_name, s.supplier_code,
                   pu.sell_price as sell_price_l1, pu.buy_price as buy_price_l1
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN suppliers s ON p.supplier_id = s.id
            LEFT JOIN product_units pu ON p.id = pu.product_id AND pu.level = 1
            ORDER BY p.id DESC
        `);

        const [productSuppliers] = await db.query(`
            SELECT ps.*, s.supplier_name, s.supplier_code
            FROM product_suppliers ps
            JOIN suppliers s ON ps.supplier_id = s.id
        `);

        const [locations] = await db.query(`
            SELECT pl.*, w.name as warehouse_name, w.code as warehouse_code, w.short_name
            FROM product_locations pl
            JOIN warehouses w ON pl.warehouse_id = w.id
        `);

        // Attach locations & mapped suppliers to each product
        const itemsWithDetails = rows.map(p => {
            const prodLocs = locations.filter(l => String(l.product_id) === String(p.id));
            const pSuppliers = productSuppliers.filter(ps => String(ps.product_id) === String(p.id));
            const isFG = p.category_id === 1 || String(p.product_type).toUpperCase().includes('FINISHED');

            const primarySup = pSuppliers.find(ps => ps.is_primary === 1) || pSuppliers[0];
            const primaryBuyPrice = Number(primarySup?.purchase_price || 0);
            const primarySellPrice = Number(primarySup?.sell_price || 0);

            const buyPrice = Number(p.buy_price_l1 || primaryBuyPrice || p.purchase_price || (!isFG ? p.product_price : 0) || 0);
            const sellPrice = Number(p.sell_price_l1 || primarySellPrice || (isFG ? p.product_price : 0) || 0);
            const effectivePrice = isFG ? sellPrice : buyPrice;

            return {
                ...p,
                category: { category_name: p.category_name },
                supplier: p.supplier_name ? { supplier_name: p.supplier_name, supplier_code: p.supplier_code } : null,
                mapped_suppliers: pSuppliers,
                locations: prodLocs,
                buy_price: buyPrice,
                sell_price: sellPrice,
                effective_price: effectivePrice,
                has_multi_vendor: pSuppliers.length > 1,
                is_fg: isFG
            };
        });

        let filteredItems = itemsWithDetails;

        if (type === 'raw_comp_pkg' || type === 'raw') {
            filteredItems = itemsWithDetails.filter(p => getProductCategoryGroup(p) === 'raw_comp_pkg');
        } else if (type === 'wip') {
            filteredItems = itemsWithDetails.filter(p => getProductCategoryGroup(p) === 'wip');
        } else if (type === 'fg') {
            filteredItems = itemsWithDetails.filter(p => getProductCategoryGroup(p) === 'fg');
        } else if (type === 'multi_vendor') {
            filteredItems = itemsWithDetails.filter(p => p.has_multi_vendor);
        }

        return res.json({
            success: true,
            type,
            total_count: filteredItems.length,
            items: serialize(filteredItems)
        });
    } catch (error) {
        console.error("getProductsStatsItems Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProductsFormData = async (req, res) => {
    console.log('[DIAGNOSTIC] getProductsFormData V2 (with short_name) called');
    try {
        const [categories] = await db.execute('SELECT id, category_name FROM categories');
        const [suppliers] = await db.execute('SELECT id, supplier_name FROM suppliers');
        const [units] = await db.execute('SELECT id, name, short_name FROM units');
        const [warehouses] = await db.execute('SELECT id, name, code, short_name FROM warehouses');
        const [productTypes] = await db.execute('SELECT id, name FROM product_types WHERE is_active = 1 ORDER BY name ASC');
        
        return res.json({
            categories: serialize(categories),
            suppliers: serialize(suppliers),
            units: serialize(units),
            warehouses: serialize(warehouses),
            product_types: serialize(productTypes)
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getProductDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const { supplier_id } = req.query;

        const [rows] = await db.execute(`
            SELECT p.*, c.category_name, s.supplier_name 
            FROM products p 
            LEFT JOIN categories c ON p.category_id = c.id 
            LEFT JOIN suppliers s ON p.supplier_id = s.id 
            WHERE p.id = ?
        `, [id]);
        
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found' });
        
        const product = rows[0];

        // Fetch Units
        const [units] = await db.execute('SELECT * FROM product_units WHERE product_id = ? ORDER BY level ASC', [id]);
        
        // Fetch Locations
        const [locations] = await db.execute('SELECT pl.*, w.name as warehouse_name, w.short_name as warehouse_short_name FROM product_locations pl LEFT JOIN warehouses w ON pl.warehouse_id = w.id WHERE pl.product_id = ?', [id]);

        // Fetch Mapping Suppliers
        const [productSuppliers] = await db.execute(`
            SELECT ps.*, s.supplier_name, s.supplier_code 
            FROM product_suppliers ps 
            LEFT JOIN suppliers s ON ps.supplier_id = s.id 
            WHERE ps.product_id = ?
        `, [id]);

        // Fetch Warehouse Stocks
        let stocksQuery = 'SELECT * FROM warehouse_stocks WHERE product_id = ?';
        let stocksParams = [id];
        if (supplier_id && supplier_id !== 'undefined' && supplier_id !== '') {
            stocksQuery += ' AND supplier_id = ?';
            stocksParams.push(supplier_id);
        }
        const [warehouseStocks] = await db.execute(stocksQuery, stocksParams);

        // Merge stocks into locations
        const mergedLocations = locations.map(loc => {
            const wsItemsForWh = warehouseStocks.filter(
                ws => String(ws.warehouse_id) === String(loc.warehouse_id)
            );
            const accumulatedStock = wsItemsForWh.reduce((sum, s) => sum + Number(s.qty_stock), 0);
            const hpp = wsItemsForWh.length > 0 ? Number(wsItemsForWh[0].hpp || 0) : 0;
            const conditions = {
                ok: wsItemsForWh.filter(s => (s.stock_condition || 'OK') === 'OK').reduce((sum, s) => sum + Number(s.qty_stock), 0),
                ng: wsItemsForWh.filter(s => s.stock_condition === 'NG').reduce((sum, s) => sum + Number(s.qty_stock), 0),
                hold: wsItemsForWh.filter(s => s.stock_condition === 'Hold').reduce((sum, s) => sum + Number(s.qty_stock), 0),
                quarantine: wsItemsForWh.filter(s => s.stock_condition === 'Quarantine').reduce((sum, s) => sum + Number(s.qty_stock), 0),
            };
            return {
                ...loc,
                stock: accumulatedStock,
                conditions,
                hpp: hpp
            };
        });

        const totalQty = mergedLocations.reduce((sum, loc) => sum + loc.stock, 0);

        return res.json({ 
            success: true, 
            data: serialize({
                ...product,
                product_quantity: totalQty,
                units: serialize(units),
                locations: serialize(mergedLocations),
                product_suppliers: serialize(productSuppliers)
            })
        });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.createProduct = async (req, res) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        let { 
            product_code, product_name, category_id, product_unit, product_price, 
            supplier_id, is_asset, is_mandatory, product_note, min_qty, max_qty, min_order, pcs_per_pack,
            product_type, bom_code, units, locations, part_number, tax_item_code,
            product_suppliers,
            brand, barcode, hsn_sat_code, purchase_price, weight_kg, volume_m3,
            shelf_life_days, lead_time_days, valuation_method
        } = req.body;
        
        if (product_code === "" || (typeof product_code === 'string' && product_code.trim() === "")) {
            product_code = null;
        }
        
        // Sync base fields with Level 1 unit if available
        if (units && units.length > 0 && units[0].unit_code) {
            product_unit = units[0].unit_code;
            product_price = units[0].buy_price;
        }

        const [result] = await conn.execute(
            `INSERT INTO products (
                product_code, product_name, category_id, product_unit, product_price, 
                supplier_id, is_asset, is_mandatory, product_note, product_quantity, 
                min_qty, max_qty, min_order, pcs_per_pack, product_stock_alert, product_type, bom_code, 
                part_number, tax_item_code, brand, barcode, hsn_sat_code, 
                purchase_price, weight_kg, volume_m3, shelf_life_days, lead_time_days, 
                valuation_method, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                product_code, product_name, category_id, product_unit, product_price || 0, 
                supplier_id, is_asset || 0, is_mandatory || 0, product_note, 
                min_qty || 0, max_qty || 0, min_order || 0, pcs_per_pack || 1, product_type, bom_code, 
                part_number || null, tax_item_code || null,
                brand || null, barcode || null, hsn_sat_code || null,
                purchase_price || 0, weight_kg || 0, volume_m3 || 0,
                shelf_life_days || 0, lead_time_days || 0, valuation_method || 'AVCO'
            ]
        );
        
        const productId = result.insertId;

        // Insert Units
        if (units && Array.isArray(units)) {
            for (const unit of units) {
                if (unit.unit_code) {
                    await conn.execute(
                        'INSERT INTO product_units (product_id, level, barcode, unit_code, tax_unit, conversion_qty, color, buy_price, sell_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [productId, unit.level, unit.barcode, unit.unit_code, unit.tax_unit, unit.conversion_qty || 0, unit.color, unit.buy_price || 0, unit.sell_price || 0]
                    );
                }
            }
        }

        // Insert Locations
        if (locations && Array.isArray(locations)) {
            for (const loc of locations) {
                if (loc.warehouse_id) {
                    await conn.execute(
                        'INSERT INTO product_locations (product_id, warehouse_id, aisle, min_qty, max_qty) VALUES (?, ?, ?, ?, ?)',
                        [productId, loc.warehouse_id, loc.aisle, loc.min_qty || 0, loc.max_qty || 0]
                    );
                }
            }
        }

        // Insert Product Suppliers
        let insertedSuppliers = 0;
        if (product_suppliers && Array.isArray(product_suppliers)) {
            for (const ps of product_suppliers) {
                if (ps.supplier_id) {
                    const psPcsPack = Number(ps.pcs_per_pack ?? pcs_per_pack ?? 1) || 1;
                    const psMinOrd = Number(ps.min_order ?? min_order ?? 0) || 0;
                    await conn.execute(
                        `INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, sell_price, min_qty, max_qty, min_order, is_primary, allocation_percent, pcs_per_pack, product_name, product_code, product_type, category_id, tax_item_code, bom_code, is_asset, is_mandatory, units_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [productId, ps.supplier_id, ps.supplier_part_number || null, ps.purchase_price || 0, ps.sell_price || 0, ps.min_qty || 0, ps.max_qty || 0, psMinOrd, ps.is_primary ? 1 : 0, Number(ps.allocation_percent) || 100, psPcsPack, ps.product_name || null, ps.product_code || null, ps.product_type || null, ps.category_id || null, ps.tax_item_code || null, ps.bom_code || null, ps.is_asset ? 1 : 0, ps.is_mandatory ? 1 : 0, ps.units_json || null]
                    );
                    insertedSuppliers++;
                }
            }
        }

        // If no rows inserted into product_suppliers, but supplier_id was set on product level
        if (insertedSuppliers === 0 && supplier_id) {
            const rootPcsPack = Number(pcs_per_pack || 1) || 1;
            const rootMinOrd = Number(min_order || 0) || 0;
            await conn.execute(
                `INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, sell_price, min_qty, max_qty, min_order, is_primary, allocation_percent, pcs_per_pack, product_name, product_code, product_type, category_id, tax_item_code, bom_code, is_asset, is_mandatory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 100, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [productId, supplier_id, part_number || null, purchase_price || product_price || 0, 0, min_qty || 0, max_qty || 0, rootMinOrd, rootPcsPack, product_name || null, product_code || null, product_type || null, category_id || null, tax_item_code || null, bom_code || null, is_asset ? 1 : 0, is_mandatory ? 1 : 0]
            );
        }

        await conn.commit();
        return res.status(201).json({ success: true, message: 'Product created successfully', id: productId });
    } catch (error) { 
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message }); 
    } finally {
        conn.release();
    }
};

exports.updateProduct = async (req, res) => {
    const conn = await db.getConnection();
    await conn.beginTransaction();
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?.userId || req.body.user_id || 1;

        // Check if approval rule for Perubahan Master Data Inventory is active
        const [activeInvRules] = await conn.execute(
            `SELECT ar.*, t.id as type_id 
             FROM approval_rules ar 
             JOIN approval_types t ON ar.approval_types_id = t.id 
             WHERE (t.approval_code = 'INV_CHANGE' OR t.approval_name LIKE '%Perubahan Master Data%') 
             AND ar.is_active = 1 LIMIT 1`
        );

        if (activeInvRules.length > 0) {
            // Fetch current product state for old_data comparison
            const [currentProds] = await conn.execute('SELECT * FROM products WHERE id = ?', [id]);
            if (currentProds.length === 0) {
                await conn.rollback();
                conn.release();
                return res.status(404).json({ message: 'Product not found' });
            }
            const currentProd = currentProds[0];
            const [currUnits] = await conn.execute('SELECT * FROM product_units WHERE product_id = ?', [id]);
            const [currLocs] = await conn.execute('SELECT * FROM product_locations WHERE product_id = ?', [id]);
            const [currSups] = await conn.execute('SELECT * FROM product_suppliers WHERE product_id = ?', [id]);
            const oldData = {
                ...currentProd,
                units: currUnits,
                locations: currLocs,
                product_suppliers: currSups
            };

            const now = new Date();
            const todayStr = now.toISOString().slice(0,10).replace(/-/g, '');
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            const requestNumber = `PCR-${todayStr}-${randomSuffix}`;
            const reason = req.body.reason || req.body.change_reason || 'Pengajuan perubahan master data inventaris';

            const [pcrResult] = await conn.execute(
                `INSERT INTO product_change_requests (product_id, request_number, product_name, product_code, old_data, change_data, reason, status, created_by, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?, NOW(), NOW())`,
                [
                    id,
                    requestNumber,
                    req.body.product_name || currentProd.product_name,
                    req.body.product_code || req.body.part_number || currentProd.product_code,
                    JSON.stringify(oldData),
                    JSON.stringify(req.body),
                    reason,
                    userId
                ]
            );
            const changeRequestId = pcrResult.insertId;

            const approvalResponse = await approvalService.createRequest(
                'Modules\\Product\\Entities\\ProductChangeRequest',
                changeRequestId,
                activeInvRules[0].type_id,
                0,
                userId,
                conn
            );

            if (approvalResponse.status === 'approved') {
                // Auto-approved: apply change immediately
                await approvalService.applyProductChange(conn, changeRequestId);
                await conn.execute('UPDATE product_change_requests SET status = "Approved", updated_at = NOW() WHERE id = ?', [changeRequestId]);
                await conn.commit();
                conn.release();
                return res.json({
                    success: true,
                    message: 'Perubahan master data produk berhasil disetujui otomatis dan disimpan.',
                    requires_approval: false,
                    data: { id, request_number: requestNumber, status: 'Approved' }
                });
            } else {
                // Pending approval
                await conn.commit();
                conn.release();
                return res.json({
                    success: true,
                    message: `Perubahan master data produk telah diajukan (No. ${requestNumber}) dan sedang menunggu persetujuan (Approval Request).`,
                    requires_approval: true,
                    data: { id, request_number: requestNumber, status: 'Pending', approval_id: approvalResponse.id }
                });
            }
        }

        let { 
            product_code, product_name, category_id, product_unit, product_price, 
            supplier_id, is_asset, is_mandatory, product_note, min_qty, max_qty, min_order, pcs_per_pack,
            product_type, bom_code, units, locations, part_number, tax_item_code,
            product_suppliers,
            brand, barcode, hsn_sat_code, purchase_price, weight_kg, volume_m3,
            shelf_life_days, lead_time_days, valuation_method
        } = req.body;
        
        if (product_code === "" || (typeof product_code === 'string' && product_code.trim() === "")) {
            product_code = null;
        }
        
        // Sync base fields with Level 1 unit if available
        if (units && units.length > 0 && units[0].unit_code) {
            product_unit = units[0].unit_code;
            product_price = units[0].buy_price;
        }

        await conn.execute(
            `UPDATE products SET 
                product_code = ?, product_name = ?, category_id = ?, product_unit = ?, product_price = ?, 
                supplier_id = ?, is_asset = ?, is_mandatory = ?, product_note = ?, min_qty = ?, 
                max_qty = ?, min_order = ?, pcs_per_pack = ?, product_type = ?, bom_code = ?, part_number = ?, tax_item_code = ?, 
                brand = ?, barcode = ?, hsn_sat_code = ?, purchase_price = ?, weight_kg = ?, 
                volume_m3 = ?, shelf_life_days = ?, lead_time_days = ?, valuation_method = ?, 
                updated_at = NOW() 
            WHERE id = ?`,
            [
                product_code, product_name, category_id, product_unit, product_price || 0, 
                supplier_id || null, is_asset ? 1 : 0, is_mandatory ? 1 : 0, product_note || null, 
                min_qty || 0, max_qty || 0, min_order || 0, pcs_per_pack || 1, product_type || null, bom_code || null, 
                part_number || null, tax_item_code || null,
                brand || null, barcode || null, hsn_sat_code || null,
                purchase_price || 0, weight_kg || 0, volume_m3 || 0,
                shelf_life_days || 0, lead_time_days || 0, valuation_method || 'AVCO',
                id
            ]
        );

        // Sync Units (Delete and Re-insert)
        await conn.execute('DELETE FROM product_units WHERE product_id = ?', [id]);
        if (units && Array.isArray(units)) {
            for (const unit of units) {
                if (unit.unit_code) {
                    await conn.execute(
                        'INSERT INTO product_units (product_id, level, barcode, unit_code, tax_unit, conversion_qty, color, buy_price, sell_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [id, unit.level, unit.barcode, unit.unit_code, unit.tax_unit, unit.conversion_qty || 0, unit.color, unit.buy_price || 0, unit.sell_price || 0]
                    );
                }
            }
        }

        // Sync Locations (Delete and Re-insert)
        await conn.execute('DELETE FROM product_locations WHERE product_id = ?', [id]);
        if (locations && Array.isArray(locations)) {
            for (const loc of locations) {
                if (loc.warehouse_id) {
                    await conn.execute(
                        'INSERT INTO product_locations (product_id, warehouse_id, aisle, min_qty, max_qty) VALUES (?, ?, ?, ?, ?)',
                        [id, loc.warehouse_id, loc.aisle, loc.min_qty || 0, loc.max_qty || 0]
                    );
                }
            }
        }

        // Sync Product Suppliers (Delete and Re-insert)
        await conn.execute('DELETE FROM product_suppliers WHERE product_id = ?', [id]);
        let insertedSuppliers = 0;
        if (product_suppliers && Array.isArray(product_suppliers)) {
            for (const ps of product_suppliers) {
                if (ps.supplier_id) {
                    const psPcsPack = Number(ps.pcs_per_pack ?? pcs_per_pack ?? 1) || 1;
                    const psMinOrd = Number(ps.min_order ?? min_order ?? 0) || 0;
                    await conn.execute(
                        `INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, sell_price, min_qty, max_qty, min_order, is_primary, allocation_percent, pcs_per_pack, product_name, product_code, product_type, category_id, tax_item_code, bom_code, is_asset, is_mandatory, units_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [id, ps.supplier_id, ps.supplier_part_number || null, ps.purchase_price || 0, ps.sell_price || 0, ps.min_qty || 0, ps.max_qty || 0, psMinOrd, ps.is_primary ? 1 : 0, Number(ps.allocation_percent) || 100, psPcsPack, ps.product_name || null, ps.product_code || null, ps.product_type || null, ps.category_id || null, ps.tax_item_code || null, ps.bom_code || null, ps.is_asset ? 1 : 0, ps.is_mandatory ? 1 : 0, ps.units_json || null]
                    );
                    insertedSuppliers++;
                }
            }
        }

        // If no rows inserted into product_suppliers, but supplier_id was set on product level
        if (insertedSuppliers === 0 && supplier_id) {
            const rootPcsPack = Number(pcs_per_pack || 1) || 1;
            const rootMinOrd = Number(min_order || 0) || 0;
            await conn.execute(
                `INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, sell_price, min_qty, max_qty, min_order, is_primary, allocation_percent, pcs_per_pack, product_name, product_code, product_type, category_id, tax_item_code, bom_code, is_asset, is_mandatory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 100, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [id, supplier_id, part_number || null, purchase_price || product_price || 0, 0, min_qty || 0, max_qty || 0, rootMinOrd, rootPcsPack, product_name || null, product_code || null, product_type || null, category_id || null, tax_item_code || null, bom_code || null, is_asset ? 1 : 0, is_mandatory ? 1 : 0]
            );
        }
        
        await conn.commit();
        return res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) { 
        await conn.rollback();
        res.status(500).json({ success: false, message: error.message }); 
    } finally {
        conn.release();
    }
};

exports.deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM products WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

exports.getBudgetingFormData = async (req, res) => {
    try {
        const { user_id } = req.query;
        const [departments] = await db.execute('SELECT id, department_name FROM departments');
        const [categories] = await db.execute('SELECT id, category_name FROM categories');
        const [suppliers] = await db.execute('SELECT id, supplier_name FROM suppliers');
        const [ppns] = await db.execute('SELECT id, name, rate FROM ppns');
        const [pphs] = await db.execute('SELECT id, name, rate FROM pphs');
        const [currencies] = await db.execute('SELECT id, code, currency_name, symbol FROM currencies');

        // Products with Categories
        let productQuery = `
            SELECT p.id, p.product_name, p.product_code, p.product_price, p.product_unit, p.is_asset, p.is_mandatory, 
                   p.category_id, c.category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
        `;
        const [productRows] = await db.execute(productQuery);
        
        // Fetch mapped suppliers to expand products
        const [productSuppliers] = await db.query(
            `SELECT ps.*, s.supplier_name, s.supplier_code
             FROM product_suppliers ps
             JOIN suppliers s ON ps.supplier_id = s.id`
        );

        const expandedProducts = [];
        for (const p of productRows) {
            const suppliersForProduct = productSuppliers.filter(ps => String(ps.product_id) === String(p.id));
            
            if (suppliersForProduct.length === 0) {
                expandedProducts.push({
                    ...p,
                    category: {
                        id: p.category_id,
                        category_name: p.category_name
                    }
                });
            } else {
                for (const ps of suppliersForProduct) {
                    expandedProducts.push({
                        ...p,
                        product_name: `${p.product_name} (${ps.supplier_name})`,
                        product_code: ps.supplier_part_number || p.product_code,
                        supplier: {
                            id: ps.supplier_id,
                            supplier_name: ps.supplier_name,
                            supplier_code: ps.supplier_code
                        },
                        product_price: Number(ps.purchase_price),
                        category: {
                            id: p.category_id,
                            category_name: p.category_name
                        }
                    });
                }
            }
        }

        return res.json({
            departments: serialize(departments),
            categories: serialize(categories),
            suppliers: serialize(suppliers),
            products: serialize(expandedProducts),
            ppns: serialize(ppns),
            pphs: serialize(pphs),
            currencies: serialize(currencies)
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.updateProductPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { price } = req.body;
        
        if (price === undefined || price === null) {
            return res.status(400).json({ message: 'Price is required' });
        }

        await db.execute('UPDATE products SET product_price = ?, updated_at = NOW() WHERE id = ?', [price, id]);
        
        return res.json({ message: 'Product price updated successfully' });
    } catch (error) {
        console.error('updateProductPrice Error:', error);
        res.status(500).json({ message: error.message });
    }
};

exports.getProductTransactions = async (req, res) => {
    try {
        const { id } = req.params;
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;
        
        // 1. Fetch Transactions with all required fields
        const transQuery = `
            SELECT 
                'Pembelian' as type,
                gr.date as date,
                gr.reference as ref_no,
                s.supplier_name as partner,
                grd.qty_received as qty_in,
                0 as qty_out,
                COALESCE(pod.unit_price, p.product_price) as hpp,
                COALESCE(pod.unit_price, p.product_price) as buy_price,
                0 as sell_price,
                p.product_unit as uom,
                d.department_name as dept_name,
                w.short_name as warehouse_code,
                gr.note as description,
                gr.id as gr_id
            FROM goods_receipt_details grd
            JOIN goods_receipts gr ON grd.gr_id = gr.id
            JOIN products p ON grd.product_id = p.id
            JOIN suppliers s ON gr.supplier_id = s.id
            LEFT JOIN departments d ON gr.department_id = d.id
            LEFT JOIN warehouses w ON gr.department_id = w.department_id -- Fallback link
            LEFT JOIN purchase_order_details pod ON gr.po_id = pod.po_id AND grd.product_id = pod.product_id
            WHERE grd.product_id = ?
            
            UNION ALL
            
            SELECT 
                'Penjualan' as type,
                sl.date as date,
                sl.reference as ref_no,
                sl.customer_name as partner,
                0 as qty_in,
                sd.quantity as qty_out,
                p.product_price as hpp,
                0 as buy_price,
                sd.price as sell_price,
                p.product_unit as uom,
                'Sales' as dept_name,
                'FG' as warehouse_code,
                sl.note as description,
                NULL as gr_id
            FROM sale_details sd
            JOIN sales sl ON sd.sale_id = sl.id
            JOIN products p ON sd.product_id = p.id
            WHERE sd.product_id = ?

            UNION ALL

            SELECT 
                'Penyesuaian' as type,
                adj.date as date,
                adj.reference as ref_no,
                'System' as partner,
                CASE WHEN ap.type = 'addition' THEN ap.quantity ELSE 0 END as qty_in,
                CASE WHEN ap.type = 'subtraction' THEN ap.quantity ELSE 0 END as qty_out,
                p.product_price as hpp,
                p.product_price as buy_price,
                p.product_price as sell_price,
                p.product_unit as uom,
                'Gudang' as dept_name,
                'WH' as warehouse_code,
                adj.note as description,
                NULL as gr_id
            FROM adjusted_products ap
            JOIN adjustments adj ON ap.adjustment_id = adj.id
            JOIN products p ON ap.product_id = p.id
            WHERE ap.product_id = ?
            
            ORDER BY date ASC
        `;
        
        const [transactions] = await db.execute(transQuery, [id, id, id]);

        // 2. Fetch Back Order PO Stats
        const [boPoRows] = await db.execute(`
            SELECT COALESCE(SUM(pod.quantity - COALESCE((
                SELECT SUM(grd.qty_received) 
                FROM goods_receipt_details grd 
                JOIN goods_receipts gr ON grd.gr_id = gr.id 
                WHERE gr.po_id = pod.po_id AND grd.product_id = pod.product_id
            ), 0)), 0) as bo_qty
            FROM purchase_order_details pod
            JOIN purchase_orders po ON pod.po_id = po.id
            WHERE pod.product_id = ? AND po.status != 'Completed'
        `, [id]);

        // 3. Fetch Product Basic Info
        const [productRows] = await db.execute('SELECT product_quantity, product_price FROM products WHERE id = ?', [id]);
        const product = productRows[0];

        // 4. Calculate Stats for Summary Cards
        let qty_masuk = 0;
        let qty_keluar = 0;
        let jlh_masuk = 0;
        let jlh_keluar = 0;
        
        let qty_penjualan_tahun = 0;
        let qty_pembelian_tahun = 0;
        let qty_penjualan_bulan = 0;
        let qty_pembelian_bulan = 0;
        
        let jlh_penjualan_net_tahun = 0;
        let jlh_hpp_net_tahun = 0;
        let jlh_penjualan_net_bulan = 0;
        let jlh_hpp_net_bulan = 0;

        transactions.forEach(t => {
            const tDate = new Date(t.date);
            const isThisYear = tDate.getFullYear() === currentYear;
            const isThisMonth = isThisYear && (tDate.getMonth() + 1) === currentMonth;

            qty_masuk += Number(t.qty_in);
            qty_keluar += Number(t.qty_out);
            
            if (t.type === 'Pembelian') {
                jlh_masuk += (Number(t.qty_in) * Number(t.buy_price));
                if (isThisYear) qty_pembelian_tahun += Number(t.qty_in);
                if (isThisMonth) qty_pembelian_bulan += Number(t.qty_in);
            }
            
            if (t.type === 'Penjualan') {
                jlh_keluar += (Number(t.qty_out) * Number(t.sell_price));
                if (isThisYear) {
                    qty_penjualan_tahun += Number(t.qty_out);
                    jlh_penjualan_net_tahun += (Number(t.qty_out) * Number(t.sell_price));
                    jlh_hpp_net_tahun += (Number(t.qty_out) * Number(t.hpp));
                }
                if (isThisMonth) {
                    qty_penjualan_bulan += Number(t.qty_out);
                    jlh_penjualan_net_bulan += (Number(t.qty_out) * Number(t.sell_price));
                    jlh_hpp_net_bulan += (Number(t.qty_out) * Number(t.hpp));
                }
            }
        });

        const current_qty = Number(product?.product_quantity || 0);
        const current_price = Number(product?.product_price || 0);
        const qty_awal = current_qty - qty_masuk + qty_keluar;
        const jlh_awal = qty_awal * current_price;
        const jlh_akhir = current_qty * current_price;

        return res.json({ 
            success: true, 
            data: serialize(transactions),
            stats: {
                // Qty Summary
                qty_awal,
                qty_masuk,
                qty_keluar,
                qty_akhir: current_qty,
                
                // Value Summary (Jlh)
                jlh_awal,
                jlh_masuk,
                jlh_keluar,
                jlh_akhir,
                
                // Back Order & Net
                back_order_po: Number(boPoRows[0]?.bo_qty || 0),
                qty_netto: current_qty,
                back_order_so: 0,
                qty_siap_jual: current_qty + Number(boPoRows[0]?.bo_qty || 0),
                
                // Yearly Qty
                qty_penjualan_tahun,
                qty_pembelian_tahun,
                qty_pembelian_bulan,
                qty_penjualan_bulan,
                
                // Yearly Value
                jlh_penjualan_net_tahun,
                jlh_hpp_net_tahun,
                profit_tahun: jlh_penjualan_net_tahun - jlh_hpp_net_tahun,
                
                // Monthly Value
                jlh_penjualan_net_bulan,
                jlh_hpp_net_bulan,
                profit_bulan: jlh_penjualan_net_bulan - jlh_hpp_net_bulan
            }
        });
    } catch (error) {
        console.error('getProductTransactions Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStockStats = async (req, res) => {
    try {
        const { warehouse_id, month, day } = req.query;

        // Get user scope
        const userScope = await getUserProductConditions(req.user?.id);

        let query = `
            SELECT 
              p.id as id,
              p.product_name as parent_name,
              p.product_code as parent_code,
              p.product_quantity as parent_quantity,
              p.min_qty as parent_min_qty,
              p.max_qty as parent_max_qty,
              p.category_id,
              p.product_type,
              p.product_unit,
              p.supplier_id as parent_supplier_id,
              
              c.category_name,
              
              ps.id as ps_id,
              ps.supplier_id as ps_supplier_id,
              ps.min_qty as ps_min_qty,
              ps.max_qty as ps_max_qty,
              ps.product_name as ps_product_name,
              ps.product_code as ps_product_code,
              ps.supplier_part_number as ps_supplier_part_number,
              ps.product_type as ps_product_type,
              
              s.supplier_name,
              s.supplier_code
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            LEFT JOIN product_suppliers ps ON p.id = ps.product_id
            LEFT JOIN suppliers s ON COALESCE(ps.supplier_id, p.supplier_id) = s.id
        `;
        let params = [];
        let conditions = [];

        if (warehouse_id && warehouse_id !== 'all' && warehouse_id !== 'undefined') {
            conditions.push('EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id = ?)');
            params.push(warehouse_id);
        }

        if (userScope) {
            const { catIds, prodIds } = userScope;
            if (catIds.length > 0 || prodIds.length > 0) {
                let userConditions = [];
                if (catIds.length > 0) {
                    userConditions.push('p.category_id IN (' + catIds.map(() => '?').join(',') + ')');
                    params.push(...catIds);
                }
                if (prodIds.length > 0) {
                    userConditions.push('p.id IN (' + prodIds.map(() => '?').join(',') + ')');
                    params.push(...prodIds);
                }
                conditions.push('(' + userConditions.join(' OR ') + ')');
            } else {
                conditions.push('1=0');
            }
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        const [rows] = await db.query(query, params);

        // Fetch locations and stocks for all products in the result set
        const productIds = [...new Set(rows.map(r => r.id))];
        let locations = [];
        let warehouseStocks = [];
        const [warehouses] = await db.query('SELECT id, name, code, short_name FROM warehouses');

        if (productIds.length > 0) {
            const [locRows] = await db.query(
                `SELECT pl.* FROM product_locations pl WHERE pl.product_id IN (${productIds.join(',')})`
            );
            locations = locRows;

            const [wsRows] = await db.query(
                `SELECT ws.* FROM warehouse_stocks ws WHERE ws.product_id IN (${productIds.join(',')})`
            );
            warehouseStocks = wsRows;
        }

        // Setup Month & Day parameters
        let selectedMonth = '2026-06';
        if (month && month !== 'all' && month !== 'undefined') {
            selectedMonth = month;
        }
        const parts = selectedMonth.split('-');
        const yearNum = parseInt(parts[0]) || 2026;
        const monthNum = parseInt(parts[1]) || 6;

        // Get total days in month
        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDay = now.getDate();

        // Calculate difference in months
        const monthDiff = (yearNum - currentYear) * 12 + (monthNum - currentMonth);

        // Default day is currentDay if it is the current month and current year.
        // Otherwise, it is the last day of the month.
        let defaultDay = daysInMonth;
        if (yearNum === currentYear && monthNum === currentMonth) {
            defaultDay = currentDay;
        }

        const queryDay = day ? parseInt(day) : null;
        const targetDay = queryDay || defaultDay;

        // Helper to get daily consumption
        const getDailyConsumption = (productName, minQty) => {
            const name = (productName || '').toUpperCase();
            if (name.includes('PLUG') || name.includes('COLLAR')) {
                return 6000;
            }
            if (name.includes('CUSHION')) {
                return 2400;
            }
            if (name.includes('TUBE DRAIN')) {
                return 1000;
            }
            if (name.includes('ELEMENT') || name.includes('MUFFLER')) {
                return 1000;
            }
            if (name.includes('COVER')) {
                return 1200;
            }
            if (name.includes('PLATE')) {
                return 800;
            }
            if (name.includes('BOX LUGGAGE')) {
                return 500;
            }
            return Math.max(Number(minQty || 0) / 10, 100);
        };

        // Helper to get row base stock details (pre-multipliers)
        const getRowBaseStock = (r, whId) => {
            if (!r.ps_id) {
                // Parent only product
                const prodLocations = locations.filter(l => String(l.product_id) === String(r.id));
                const mergedLocations = prodLocations.map(loc => {
                    const wsItemsForWh = warehouseStocks.filter(
                        ws => String(ws.product_id) === String(r.id) && String(ws.warehouse_id) === String(loc.warehouse_id)
                    );
                    const accumulatedStock = wsItemsForWh.reduce((sum, s) => sum + Number(s.qty_stock), 0);
                    return { ...loc, stock: accumulatedStock };
                });
                
                if (whId && whId !== 'all' && whId !== 'undefined') {
                    const loc = mergedLocations.find(l => String(l.warehouse_id) === String(whId));
                    return {
                        stock: loc ? loc.stock : 0,
                        min_qty: loc ? loc.min_qty : (r.parent_min_qty || 0),
                        max_qty: loc ? loc.max_qty : (r.parent_max_qty || 0)
                    };
                } else {
                    const stock = mergedLocations.reduce((sum, loc) => sum + loc.stock, 0);
                    return {
                        stock,
                        min_qty: r.parent_min_qty || 0,
                        max_qty: r.parent_max_qty || 0
                    };
                }
            } else {
                // Supplier expanded product
                const wsForSupplier = warehouseStocks.filter(ws => String(ws.product_id) === String(r.id) && String(ws.supplier_id) === String(r.ps_supplier_id));
                const supplierLocations = warehouses.map(w => {
                    const ws = wsForSupplier.find(ws => String(ws.warehouse_id) === String(w.id));
                    return {
                        warehouse_id: w.id,
                        stock: ws ? Number(ws.qty_stock) : 0,
                        min_qty: Number(r.ps_min_qty || 0),
                        max_qty: Number(r.ps_max_qty || 0)
                    };
                });

                if (whId && whId !== 'all' && whId !== 'undefined') {
                    const loc = supplierLocations.find(l => String(l.warehouse_id) === String(whId));
                    return {
                        stock: loc ? loc.stock : 0,
                        min_qty: loc ? loc.min_qty : Number(r.ps_min_qty || 0),
                        max_qty: loc ? loc.max_qty : Number(r.ps_max_qty || 0)
                    };
                } else {
                    const stock = supplierLocations.reduce((sum, loc) => sum + loc.stock, 0);
                    return {
                        stock,
                        min_qty: Number(r.ps_min_qty || 0),
                        max_qty: Number(r.ps_max_qty || 0)
                    };
                }
            }
        };

        // Helper to get simulated stock on a specific day
        const getSimulatedStock = (baseStock, productId, dayNum, mDiff) => {
            const mMultiplier = Math.max(0.7, Math.min(1.3, 1.0 + (mDiff * 0.05)));
            // Apply daily fluctuations using a deterministic sine wave based on dayNum and productId
            const dailyMultiplier = mMultiplier * (1.0 + Math.sin(dayNum * 0.7 + productId) * 0.08);
            return Math.max(0, Math.round(baseStock * dailyMultiplier));
        };

        const underStockList = [];
        const overStockList = [];
        const optimalStockList = [];
        const allItemsList = [];

        let totalItems = 0;
        let underStock = 0;
        let overStock = 0;
        let optimalStock = 0;

        for (const r of rows) {
            const baseDetails = getRowBaseStock(r, warehouse_id);
            const actualQty = getSimulatedStock(baseDetails.stock, r.id, targetDay, monthDiff);
            const minQty = baseDetails.min_qty;
            const maxQty = baseDetails.max_qty;

            let productName = '';
            let productCode = '';

            if (!r.ps_id) {
                productName = r.parent_name;
                productCode = r.parent_code;
            } else {
                productName = r.ps_product_name ? `${r.ps_product_name} (${r.ps_supplier_part_number || r.ps_product_code})` : r.parent_name;
                productCode = r.ps_product_code || r.ps_supplier_part_number || r.parent_code;
            }

            const consumption = getDailyConsumption(productName, minQty);
            const daysOfStock = Number((actualQty / consumption).toFixed(1));

            const itemPayload = {
                id: r.id,
                product_name: productName,
                product_code: productCode,
                actual_qty: actualQty,
                min_qty: minQty,
                max_qty: maxQty,
                days: daysOfStock,
                product_type: r.ps_product_type || r.product_type || '',
                product_unit: r.product_unit || 'pcs',
                category_name: r.category_name || '',
                supplier_name: r.supplier_name || ''
            };

            totalItems += 1;
            allItemsList.push(itemPayload);

            if (actualQty < minQty) {
                underStock += 1;
                underStockList.push({
                    ...itemPayload,
                    discrepancy: minQty - actualQty
                });
            } else if (maxQty > 0 && actualQty > maxQty) {
                overStock += 1;
                overStockList.push({
                    ...itemPayload,
                    overage: actualQty - maxQty
                });
            } else {
                optimalStock += 1;
                optimalStockList.push(itemPayload);
            }
        }

        // Sort Top lists
        const sortedUnder = [...underStockList].sort((a, b) => b.discrepancy - a.discrepancy);
        const topUnderStock = sortedUnder.slice(0, 5).map(item => ({
            id: item.id,
            product_name: item.product_name,
            product_code: item.product_code,
            actual_qty: item.actual_qty,
            min_qty: item.min_qty,
            days: item.days
        }));

        const sortedOver = [...overStockList].sort((a, b) => b.days - a.days);
        const topOverStock = sortedOver.slice(0, 5).map(item => ({
            id: item.id,
            product_name: item.product_name,
            product_code: item.product_code,
            actual_qty: item.actual_qty,
            max_qty: item.max_qty,
            days: item.days
        }));

        // Generate dynamic daily trend data
        const getMonthAbbreviation = (m) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[m - 1] || 'Jun';
        };

        const trendData = [];
        let currentDayLimit = daysInMonth;
        if (yearNum === currentYear && monthNum === currentMonth) {
            currentDayLimit = currentDay;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const dayLabel = `${String(d).padStart(2, '0')} ${getMonthAbbreviation(monthNum)}`;
            if (d <= currentDayLimit) {
                let dayUnder = 0;
                let dayOver = 0;
                let dayOptimal = 0;

                for (const r of rows) {
                    const baseDetails = getRowBaseStock(r, warehouse_id);
                    const actualQty = getSimulatedStock(baseDetails.stock, r.id, d, monthDiff);
                    const minQty = baseDetails.min_qty;
                    const maxQty = baseDetails.max_qty;

                    if (actualQty < minQty) {
                        dayUnder++;
                    } else if (maxQty > 0 && actualQty > maxQty) {
                        dayOver++;
                    } else {
                        dayOptimal++;
                    }
                }

                trendData.push({
                    day: dayLabel,
                    under_stock: dayUnder,
                    optimal_stock: dayOptimal,
                    over_stock: dayOver
                });
            } else {
                trendData.push({
                    day: dayLabel,
                    under_stock: null,
                    optimal_stock: null,
                    over_stock: null
                });
            }
        }

        return res.json({
            success: true,
            total_items: totalItems,
            under_stock: underStock,
            over_stock: overStock,
            optimal_stock: optimalStock,
            top_under_stock: topUnderStock,
            top_over_stock: topOverStock,
            trend_data: trendData,
            under_stock_list: serialize(underStockList),
            over_stock_list: serialize(overStockList),
            optimal_stock_list: serialize(optimalStockList),
            all_items_list: serialize(allItemsList),
            target_day: targetDay,
            month: selectedMonth
        });

    } catch (error) {
        console.error('getStockStats Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
