const db = require('../config/db');

// Utility for BigInt serialization
const serialize = (data) => {
    if (!data) return data;
    const transform = (obj) => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(transform);
        const newObj = {};
        for (const [k, v] of Object.entries(obj)) {
            if (typeof v === 'bigint') newObj[k] = v.toString();
            else if (v instanceof Date) {
                const Y = v.getFullYear(), M = String(v.getMonth()+1).padStart(2,'0'), D = String(v.getDate()).padStart(2,'0');
                newObj[k] = `${Y}-${M}-${D}`;
            } else if (typeof v === 'object') newObj[k] = transform(v);
            else newObj[k] = v;
        }
        return newObj;
    };
    return transform(data);
};

exports.generateWOReference = async function (connection) {
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `WO/MAT-EPU/${year}/${month}/`;
    const globalYearPrefix = `WO/MAT-EPU/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM work_orders WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
};

exports.generateIssuanceReference = async function (connection) {
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `MTR/MAT-EPU/${year}/${month}/`;
    const globalYearPrefix = `MTR/MAT-EPU/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM material_issuances WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
};

exports.getWorkOrders = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT wo.*, p.product_name, p.product_code, p.product_unit,
                   COALESCE(os.customer_id, latest_po.customer_id) as customer_id,
                   COALESCE(c.customer_name, cust.customer_name) as customer_name,
                   COALESCE(os.reference, pro.pro_code) as order_sheet_ref,
                   COALESCE(latest_po.no_po_customer, latest_po.reference) as no_po_customer,
                   COALESCE(wom_stats.total_required, 0) as total_required,
                   COALESCE(wom_stats.total_issued, 0) as total_issued
            FROM work_orders wo
            JOIN products p ON wo.parent_product_id = p.id
            LEFT JOIN planning_produksi pro ON pro.wo_id = wo.id
            LEFT JOIN order_sheets os ON (pro.order_sheet_id = os.id OR wo.sales_order_id = os.id)
            LEFT JOIN customers c ON os.customer_id = c.id
            LEFT JOIN (
                SELECT pod.product_id, po.customer_id, po.no_po_customer, po.reference
                FROM customer_po_details pod
                JOIN customer_po po ON pod.po_id = po.id
                ORDER BY po.id DESC
                LIMIT 1
            ) latest_po ON latest_po.product_id = wo.parent_product_id
            LEFT JOIN customers cust ON latest_po.customer_id = cust.id
            LEFT JOIN (
                SELECT work_order_id, 
                       SUM(qty_required) as total_required,
                       SUM(qty_issued) as total_issued
                FROM work_order_materials
                GROUP BY work_order_id
            ) wom_stats ON wo.id = wom_stats.work_order_id
        `;
        let params = [];
        if (search) {
            query += ' WHERE wo.reference LIKE ? OR p.product_name LIKE ?';
            params.push(`%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY wo.id DESC';
        const [rows] = await db.query(query, params);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getWorkOrderDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [woRows] = await db.execute(`
            SELECT wo.*, p.product_name, p.product_code, p.product_unit,
                   COALESCE(os.customer_id, latest_po.customer_id) as customer_id,
                   COALESCE(c.customer_name, cust.customer_name) as customer_name,
                   COALESCE(os.reference, pro.pro_code) as order_sheet_ref,
                   COALESCE(latest_po.no_po_customer, latest_po.reference) as no_po_customer
            FROM work_orders wo
            JOIN products p ON wo.parent_product_id = p.id
            LEFT JOIN planning_produksi pro ON pro.wo_id = wo.id
            LEFT JOIN order_sheets os ON (pro.order_sheet_id = os.id OR wo.sales_order_id = os.id)
            LEFT JOIN customers c ON os.customer_id = c.id
            LEFT JOIN (
                SELECT pod.product_id, po.customer_id, po.no_po_customer, po.reference
                FROM customer_po_details pod
                JOIN customer_po po ON pod.po_id = po.id
                ORDER BY po.id DESC
                LIMIT 1
            ) latest_po ON latest_po.product_id = wo.parent_product_id
            LEFT JOIN customers cust ON latest_po.customer_id = cust.id
            WHERE wo.id = ?`, [id]);
        
        if (woRows.length === 0) return res.status(404).json({ message: 'Work Order not found' });
        
        const wo = woRows[0];

        // Fetch materials needed (Parent Items Only globally)
        const [materials] = await db.execute(`
            SELECT wom.*, p.product_name, p.product_code, p.product_unit
            FROM work_order_materials wom
            JOIN products p ON wom.product_id = p.id
            WHERE wom.work_order_id = ?`, [id]);

        // Fetch issuances
        const [issuances] = await db.execute(`
            SELECT * FROM material_issuances WHERE work_order_id = ?`, [id]);

        for (let iss of issuances) {
            const [details] = await db.execute(`
                SELECT mid.*, p.product_name, p.product_code, s.supplier_name
                FROM material_issuance_details mid
                JOIN products p ON mid.product_id = p.id
                LEFT JOIN suppliers s ON mid.supplier_id = s.id
                WHERE mid.issuance_id = ?`, [iss.id]);
            iss.details = details;
        }

        // Fetch linked PrO (Planning Produksi) details
        const [proRows] = await db.execute(`
            SELECT pro.*, m.name as mold_name, m.code as mold_code
            FROM planning_produksi pro
            LEFT JOIN molds m ON pro.mold_id = m.id
            WHERE pro.wo_id = ? LIMIT 1`, [id]);
        const pro = proRows.length > 0 ? proRows[0] : null;

        return res.json({
            success: true,
            data: serialize({
                ...wo,
                materials,
                issuances,
                pro
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createWorkOrder = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { date, parent_product_id, target_qty, note, materials, sales_order_id, target_warehouse_id, department_id, tipe_barang_jadi, planning_produksi_id } = req.body;

        const reference = await exports.generateWOReference(connection);

        const [woResult] = await connection.execute(
            `INSERT INTO work_orders (reference, date, parent_product_id, target_qty, status, note, sales_order_id, target_warehouse_id, department_id, tipe_barang_jadi, created_at, updated_at)
             VALUES (?, ?, ?, ?, 'Pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                reference, 
                date || new Date(), 
                parent_product_id, 
                target_qty, 
                note || '', 
                sales_order_id || null, 
                target_warehouse_id ? Number(target_warehouse_id) : null, 
                department_id ? Number(department_id) : null, 
                tipe_barang_jadi || null
            ]
        );
        const woId = woResult.insertId;

        if (materials && materials.length > 0) {
            for (const mat of materials) {
                await connection.execute(
                    `INSERT INTO work_order_materials (work_order_id, product_id, qty_required, qty_issued, created_at, updated_at)
                     VALUES (?, ?, ?, 0, NOW(), NOW())`,
                    [woId, mat.product_id, mat.qty_required]
                );
            }
        }

        // Link to planning_produksi if specified
        if (planning_produksi_id) {
            await connection.execute(
                `UPDATE planning_produksi SET wo_id = ?, status = 'Menunggu Realisasi Bahan Baku', updated_at = NOW() WHERE id = ?`,
                [woId, planning_produksi_id]
            );
        }

        await connection.commit();
        return res.status(201).json({ success: true, message: 'Work Order created successfully', id: woId, reference });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ─── Material Issuances (Perintah Pengeluaran Material) ──────────────────────
exports.createMaterialIssuance = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { date, work_order_id, note, details } = req.body;

        const reference = await exports.generateIssuanceReference(connection);

        const [issResult] = await connection.execute(
            `INSERT INTO material_issuances (reference, date, work_order_id, status, note, created_at, updated_at)
             VALUES (?, ?, ?, 'Draft', ?, NOW(), NOW())`,
            [reference, date || new Date(), work_order_id, note || '']
        );
        const issuanceId = issResult.insertId;

        if (details && details.length > 0) {
            for (const d of details) {
                await connection.execute(
                    `INSERT INTO material_issuance_details (issuance_id, product_id, supplier_id, qty_to_issue, created_at, updated_at)
                     VALUES (?, ?, ?, ?, NOW(), NOW())`,
                    [issuanceId, d.product_id, d.supplier_id || null, d.qty_to_issue]
                );
            }
        }

        await connection.commit();
        return res.status(201).json({ success: true, message: 'Material Issuance created as Draft', id: issuanceId, reference });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// CORE WAREHOUSE MUTATION LOGIC
exports.releaseMaterialIssuance = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        // 1. Fetch issuance header & details
        const [issRows] = await connection.execute('SELECT * FROM material_issuances WHERE id = ?', [id]);
        if (issRows.length === 0) throw new Error('Material Issuance not found');
        const issuance = issRows[0];

        if (issuance.status === 'Issued') throw new Error('Material Issuance is already released/issued');

        const [details] = await connection.execute('SELECT * FROM material_issuance_details WHERE issuance_id = ?', [id]);
        if (details.length === 0) throw new Error('Material Issuance has no details/items');

        // 2. Process each material item
        for (const item of details) {
            // Check if product has mapped suppliers
            const [suppliersForProduct] = await connection.execute(
                'SELECT id FROM product_suppliers WHERE product_id = ? LIMIT 1',
                [item.product_id]
            );
            const isMultiVendor = suppliersForProduct.length > 0;

            if (isMultiVendor && !item.supplier_id) {
                throw new Error(`Product ID ${item.product_id} has multi-vendor mapped but no specific vendor stock was selected for issuance.`);
            }

            const finalSupplierId = isMultiVendor ? item.supplier_id : null;

            // 3. Verify stock in MATKOM (warehouse_id = 1)
            let [stockRows] = await connection.execute(
                `SELECT id, qty_stock, hpp FROM warehouse_stocks 
                 WHERE product_id = ? AND warehouse_id = 1 
                 AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL))`,
                [item.product_id, finalSupplierId, finalSupplierId]
            );

            if (stockRows.length === 0 || Number(stockRows[0].qty_stock || 0) < Number(item.qty_to_issue)) {
                const [fallbackRows] = await connection.execute(
                    `SELECT id, qty_stock, hpp FROM warehouse_stocks 
                     WHERE product_id = ? AND warehouse_id = 1 
                     ORDER BY (supplier_id IS NULL) ASC, qty_stock DESC LIMIT 1`,
                    [item.product_id]
                );
                if (fallbackRows.length > 0) {
                    stockRows = fallbackRows;
                }
            }

            const availableStock = stockRows.length > 0 ? Number(stockRows[0].qty_stock) : 0;
            const hppMatkom = stockRows.length > 0 ? Number(stockRows[0].hpp || 0) : 0;

            if (availableStock < Number(item.qty_to_issue)) {
                const [pRows] = await connection.execute('SELECT product_name FROM products WHERE id = ?', [item.product_id]);
                const pName = pRows[0]?.product_name || `Product ID ${item.product_id}`;
                throw new Error(`Stock tidak mencukupi untuk ${pName}. Dibutuhkan: ${item.qty_to_issue}, Tersedia di MATKOM: ${availableStock}.`);
            }

            // 4. DECREMENT vendor stock from MATKOM (warehouse_id = 1)
            await connection.execute(
                `UPDATE warehouse_stocks SET qty_stock = qty_stock - ?, updated_at = NOW() 
                 WHERE id = ?`,
                [item.qty_to_issue, stockRows[0].id]
            );

            // 5. INCREMENT Parent-Only stock (supplier_id = NULL) in PROD (warehouse_id = 2)
            const [prodStockRows] = await connection.execute(
                `SELECT id, qty_stock, hpp FROM warehouse_stocks 
                 WHERE product_id = ? AND warehouse_id = 2 AND supplier_id IS NULL`,
                [item.product_id]
            );

            if (prodStockRows.length > 0) {
                const qtyOldProd = Number(prodStockRows[0].qty_stock || 0);
                const hppOldProd = Number(prodStockRows[0].hpp || 0);
                const qtyNewProd = Number(item.qty_to_issue || 0);
                let hppNewProd = hppOldProd;
                if (qtyOldProd + qtyNewProd > 0) {
                    hppNewProd = (qtyOldProd * hppOldProd + qtyNewProd * hppMatkom) / (qtyOldProd + qtyNewProd);
                }
                await connection.execute(
                    `UPDATE warehouse_stocks SET qty_stock = qty_stock + ?, hpp = ?, updated_at = NOW() 
                     WHERE id = ?`,
                    [item.qty_to_issue, hppNewProd, prodStockRows[0].id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at) 
                     VALUES (?, 2, NULL, ?, ?, NOW(), NOW())`,
                    [item.product_id, item.qty_to_issue, hppMatkom]
                );
            }

            // 6. Update global product quantity (decrease since raw material components are consumed in production)
            await connection.execute(
                `UPDATE products SET product_quantity = GREATEST(0, product_quantity - ?) WHERE id = ?`,
                [item.qty_to_issue, item.product_id]
            );

            // 7. Update work_order_materials.qty_issued
            await connection.execute(
                `UPDATE work_order_materials SET qty_issued = qty_issued + ?, updated_at = NOW() 
                 WHERE work_order_id = ? AND product_id = ?`,
                [item.qty_to_issue, issuance.work_order_id, item.product_id]
            );
        }

        // 8. Mark issuance as Completed/Issued
        await connection.execute(
            `UPDATE material_issuances SET status = 'Issued', updated_at = NOW() WHERE id = ?`,
            [id]
        );

        // 9. Update Work Order status to Released/In Production if it was Pending
        await connection.execute(
            `UPDATE work_orders SET status = 'Released', updated_at = NOW() 
             WHERE id = ? AND status = 'Pending'`,
            [issuance.work_order_id]
        );

        await connection.commit();
        return res.json({ success: true, message: 'Material Issuance released. Warehouse mutation complete!' });
    } catch (error) {
        await connection.rollback();
        console.error('Release Material Issuance Error:', error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ─── Bill of Materials (BOM) ──────────────────────────────────────────────────
exports.getBOMs = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT b.*, 
                   COUNT(bi.id) as item_count,
                   w.name as target_warehouse_name
            FROM boms b
            LEFT JOIN bom_items bi ON b.id = bi.bom_id
            LEFT JOIN warehouses w ON b.target_warehouse_id = w.id
        `;
        let params = [];
        if (search) {
            query += ' WHERE b.bom_code LIKE ? OR b.bom_name LIKE ? OR b.finished_good_code LIKE ? OR b.finished_good_name LIKE ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' GROUP BY b.id ORDER BY b.id DESC';
        const [rows] = await db.query(query, params);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getBOMDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [bomRows] = await db.execute(`
            SELECT b.*, p.product_type as finished_good_type, w.name as target_warehouse_name
            FROM boms b
            LEFT JOIN products p ON b.finished_good_code = p.product_code
            LEFT JOIN warehouses w ON b.target_warehouse_id = w.id
            WHERE b.id = ?
        `, [id]);
        if (bomRows.length === 0) return res.status(404).json({ success: false, message: 'BOM not found' });
        
        // Fetch all items with product ID join and warehouse name
        const [itemRows] = await db.execute(`
            SELECT bi.*, p.id as product_id, w.name as warehouse_name
            FROM bom_items bi 
            LEFT JOIN products p ON bi.product_code = p.product_code 
            LEFT JOIN warehouses w ON bi.warehouse_id = w.id
            WHERE bi.bom_id = ? 
            ORDER BY bi.id ASC`, [id]);
        
        return res.json({ 
            success: true, 
            data: serialize(bomRows[0]), 
            items: serialize(itemRows) 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createBOM = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            bom_code,
            bom_name,
            description,
            username,
            status,
            target_warehouse_id,
            finished_good_code,
            finished_good_name,
            finished_good_unit,
            finished_good_qty,
            is_dismantling,
            bom_type,
            version_revision,
            effective_start_date,
            effective_end_date,
            routing_work_center,
            labor_cost,
            overhead_cost,
            items
        } = req.body;

        // Calculate initial material cost & total cost
        let matCostSum = 0;
        if (items && Array.isArray(items)) {
            items.forEach(item => {
                const scrap = Number(item.scrap_percent) || 0;
                const netQty = Number(item.qty) || 0;
                const grossQty = Number(item.gross_qty) || (netQty * (1 + (scrap / 100)));
                const price = Number(item.price) || 0;
                matCostSum += (grossQty * price);
            });
        }
        const laborCostVal = Number(labor_cost) || 0;
        const overheadCostVal = Number(overhead_cost) || 0;
        const totalCostVal = matCostSum + laborCostVal + overheadCostVal;

        // Insert BOM
        const [bomRes] = await connection.execute(
            `INSERT INTO boms (
                bom_code, bom_name, description, username, status, target_warehouse_id, 
                finished_good_code, finished_good_name, finished_good_unit, finished_good_qty, 
                is_dismantling, bom_type, version_revision, effective_start_date, effective_end_date,
                routing_work_center, labor_cost, overhead_cost, total_cost, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                bom_code,
                bom_name,
                description || null,
                username || null,
                status || 'Aktif',
                target_warehouse_id || null,
                finished_good_code || null,
                finished_good_name || null,
                finished_good_unit || null,
                finished_good_qty || 1.0000,
                is_dismantling ? 1 : 0,
                bom_type || 'Manufacturing',
                version_revision || 'Rev 1.0',
                effective_start_date || null,
                effective_end_date || null,
                routing_work_center || 'Main Assembly Line',
                laborCostVal,
                overheadCostVal,
                totalCostVal
            ]
        );
        const bomId = bomRes.insertId;

        // Insert items recursively with automatic price deduplication
        if (items && Array.isArray(items)) {
            const parentMap = {}; // temp_id -> database_id
            const itemPriceMap = {}; // database_id -> price
            let pendingItems = [...items];
            
            let progress = true;
            while (pendingItems.length > 0 && progress) {
                progress = false;
                const nextPending = [];

                for (const item of pendingItems) {
                    const hasParent = !!item.parent_temp_id;
                    const isParentResolved = hasParent && (parentMap[item.parent_temp_id] !== undefined);

                    if (!hasParent || isParentResolved) {
                        const parentId = hasParent ? parentMap[item.parent_temp_id] : null;
                        const parentPrice = parentId ? Number(itemPriceMap[parentId] || 0) : 0;

                        const scrap = Number(item.scrap_percent) || 0;
                        const netQty = Number(item.qty) || 0;
                        const grossQty = Number(item.gross_qty) || (netQty * (1 + (scrap / 100)));
                        
                        let finalPrice = Number(item.price) || 0.00;
                        // Deduplicate: If parent already has price > 0, set child price to 0.00
                        if (parentPrice > 0) {
                            finalPrice = 0.00;
                        }

                        const [itemRes] = await connection.execute(
                            `INSERT INTO bom_items (
                                bom_id, parent_item_id, item_type, warehouse_id, product_code, 
                                part_number, product_name, qty, unit, price, scrap_percent, gross_qty, notes, operation_seq
                             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                            [
                                bomId,
                                parentId,
                                item.item_type || 'RAW',
                                item.warehouse_id || null,
                                item.product_code,
                                item.part_number || null,
                                item.product_name,
                                netQty,
                                item.unit || null,
                                finalPrice,
                                scrap,
                                grossQty,
                                item.notes || null,
                                Number(item.operation_seq) || 10
                            ]
                        );

                        if (item.temp_id) {
                            parentMap[item.temp_id] = itemRes.insertId;
                            itemPriceMap[itemRes.insertId] = finalPrice;
                        }
                        progress = true;
                    } else {
                        nextPending.push(item);
                    }
                }
                pendingItems = nextPending;
            }
        }

        await connection.commit();
        return res.json({ success: true, message: 'BOM created successfully', bom_id: bomId });
    } catch (error) {
        await connection.rollback();
        console.error('Create BOM Error:', error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateBOM = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            bom_code,
            bom_name,
            description,
            username,
            status,
            target_warehouse_id,
            finished_good_code,
            finished_good_name,
            finished_good_unit,
            finished_good_qty,
            is_dismantling,
            bom_type,
            version_revision,
            effective_start_date,
            effective_end_date,
            routing_work_center,
            labor_cost,
            overhead_cost,
            items
        } = req.body;

        // Calculate material cost & total cost with deduplication
        let matCostSum = 0;
        const tempItemMap = {};
        if (items && Array.isArray(items)) {
            items.forEach(i => {
                if (i.temp_id) tempItemMap[i.temp_id] = i;
            });

            items.forEach(item => {
                const scrap = Number(item.scrap_percent) || 0;
                const netQty = Number(item.qty) || 0;
                const grossQty = Number(item.gross_qty) || (netQty * (1 + (scrap / 100)));
                let price = Number(item.price) || 0;

                if (item.parent_temp_id && tempItemMap[item.parent_temp_id]) {
                    const parentPrice = Number(tempItemMap[item.parent_temp_id].price || 0);
                    if (parentPrice > 0) {
                        price = 0;
                    }
                }
                matCostSum += (grossQty * price);
            });
        }
        const laborCostVal = Number(labor_cost) || 0;
        const overheadCostVal = Number(overhead_cost) || 0;
        const totalCostVal = matCostSum + laborCostVal + overheadCostVal;

        // Update BOM
        await connection.execute(
            `UPDATE boms SET 
                bom_code = ?, 
                bom_name = ?, 
                description = ?, 
                username = ?, 
                status = ?, 
                target_warehouse_id = ?, 
                finished_good_code = ?, 
                finished_good_name = ?, 
                finished_good_unit = ?, 
                finished_good_qty = ?, 
                is_dismantling = ?, 
                bom_type = ?,
                version_revision = ?,
                effective_start_date = ?,
                effective_end_date = ?,
                routing_work_center = ?,
                labor_cost = ?,
                overhead_cost = ?,
                total_cost = ?,
                updated_at = NOW() 
             WHERE id = ?`,
            [
                bom_code,
                bom_name,
                description || null,
                username || null,
                status || 'Aktif',
                target_warehouse_id || null,
                finished_good_code || null,
                finished_good_name || null,
                finished_good_unit || null,
                finished_good_qty || 1.0000,
                is_dismantling ? 1 : 0,
                bom_type || 'Manufacturing',
                version_revision || 'Rev 1.0',
                effective_start_date || null,
                effective_end_date || null,
                routing_work_center || 'Main Assembly Line',
                laborCostVal,
                overheadCostVal,
                totalCostVal,
                id
            ]
        );

        // Delete existing items and re-insert to update
        await connection.execute('DELETE FROM bom_items WHERE bom_id = ?', [id]);

        if (items && Array.isArray(items)) {
            const parentMap = {}; // temp_id -> database_id
            let pendingItems = [...items];
            
            let progress = true;
            while (pendingItems.length > 0 && progress) {
                progress = false;
                const nextPending = [];

                for (const item of pendingItems) {
                    const hasParent = !!item.parent_temp_id;
                    const isParentResolved = hasParent && (parentMap[item.parent_temp_id] !== undefined);

                    if (!hasParent || isParentResolved) {
                        const parentId = hasParent ? parentMap[item.parent_temp_id] : null;
                        const scrap = Number(item.scrap_percent) || 0;
                        const netQty = Number(item.qty) || 0;
                        const grossQty = Number(item.gross_qty) || (netQty * (1 + (scrap / 100)));

                        const [itemRes] = await connection.execute(
                            `INSERT INTO bom_items (
                                bom_id, parent_item_id, item_type, warehouse_id, product_code, 
                                part_number, product_name, qty, unit, price, scrap_percent, gross_qty, notes, operation_seq
                             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
                            [
                                id,
                                parentId,
                                item.item_type || 'RAW',
                                item.warehouse_id || null,
                                item.product_code,
                                item.part_number || null,
                                item.product_name,
                                netQty,
                                item.unit || null,
                                item.price || 0.00,
                                scrap,
                                grossQty,
                                item.notes || null,
                                Number(item.operation_seq) || 10
                            ]
                        );

                        if (item.temp_id) {
                            parentMap[item.temp_id] = itemRes.insertId;
                        }
                        progress = true;
                    } else {
                        nextPending.push(item);
                    }
                }
                pendingItems = nextPending;
            }
        }

        await connection.commit();
        return res.json({ success: true, message: 'BOM updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Update BOM Error:', error);
        res.status(400).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteBOM = async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM boms WHERE id = ?', [id]);
        return res.json({ success: true, message: 'BOM deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMaterialIssuances = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT mi.*, wo.reference as wo_reference, p.product_name, p.product_code
            FROM material_issuances mi
            JOIN work_orders wo ON mi.work_order_id = wo.id
            JOIN products p ON wo.parent_product_id = p.id
        `;
        let params = [];
        let conditions = [];

        if (status) {
            conditions.push('mi.status = ?');
            params.push(status);
        }

        if (search) {
            conditions.push('(mi.reference LIKE ? OR wo.reference LIKE ? OR p.product_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY mi.id DESC';
        const [rows] = await db.query(query, params);

        // Fetch details for each issuance
        for (let row of rows) {
            const [details] = await db.execute(`
                SELECT mid.*, p.product_name, p.product_code, s.supplier_name
                FROM material_issuance_details mid
                JOIN products p ON mid.product_id = p.id
                LEFT JOIN suppliers s ON mid.supplier_id = s.id
                WHERE mid.issuance_id = ?`, [row.id]);
            row.details = details;
        }

        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateWorkOrder = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { date, parent_product_id, target_qty, note, materials, sales_order_id, target_warehouse_id, department_id, tipe_barang_jadi, planning_produksi_id } = req.body;

        // 1. Update Work Order Header
        await connection.execute(
            `UPDATE work_orders SET date = ?, parent_product_id = ?, target_qty = ?, note = ?, sales_order_id = ?, target_warehouse_id = ?, department_id = ?, tipe_barang_jadi = ?, updated_at = NOW()
             WHERE id = ?`,
            [
                date || new Date(), 
                parent_product_id, 
                target_qty, 
                note || '', 
                sales_order_id || null, 
                target_warehouse_id ? Number(target_warehouse_id) : null, 
                department_id ? Number(department_id) : null, 
                tipe_barang_jadi || null, 
                id
            ]
        );

        // 2. Fetch existing materials to preserve their qty_issued values
        const [existing] = await connection.execute('SELECT * FROM work_order_materials WHERE work_order_id = ?', [id]);
        
        // 3. Clear and re-insert material requirements
        await connection.execute('DELETE FROM work_order_materials WHERE work_order_id = ?', [id]);

        if (materials && materials.length > 0) {
            for (const mat of materials) {
                const prev = existing.find(e => Number(e.product_id) === Number(mat.product_id));
                const qtyIssued = prev ? Number(prev.qty_issued) : 0;
                await connection.execute(
                    `INSERT INTO work_order_materials (work_order_id, product_id, qty_required, qty_issued, created_at, updated_at)
                     VALUES (?, ?, ?, ?, NOW(), NOW())`,
                    [id, mat.product_id, mat.qty_required, qtyIssued]
                );
            }
        }

        // Reset old links in planning_produksi
        await connection.execute(
            `UPDATE planning_produksi SET wo_id = NULL, status = 'Menunggu WO', updated_at = NOW() WHERE wo_id = ?`,
            [id]
        );

        // Update new link if specified
        if (planning_produksi_id) {
            await connection.execute(
                `UPDATE planning_produksi SET wo_id = ?, status = 'Menunggu Realisasi Bahan Baku', updated_at = NOW() WHERE id = ?`,
                [id, planning_produksi_id]
            );
        }

        await connection.commit();
        return res.json({ success: true, message: 'Work Order updated successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Update WO error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteWorkOrder = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // 1. Delete materials
        await connection.execute('DELETE FROM work_order_materials WHERE work_order_id = ?', [id]);
        
        // 2. Delete issuances (and details) associated with this WO
        const [issuances] = await connection.execute('SELECT id FROM material_issuances WHERE work_order_id = ?', [id]);
        for (const iss of issuances) {
            await connection.execute('DELETE FROM material_issuance_details WHERE issuance_id = ?', [iss.id]);
        }
        await connection.execute('DELETE FROM material_issuances WHERE work_order_id = ?', [id]);

        // Reset link in planning_produksi
        await connection.execute(
            `UPDATE planning_produksi SET wo_id = NULL, status = 'Menunggu WO', updated_at = NOW() WHERE wo_id = ?`,
            [id]
        );

        // 3. Delete work order
        await connection.execute('DELETE FROM work_orders WHERE id = ?', [id]);

        await connection.commit();
        return res.json({ success: true, message: 'Work Order and associated records deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Delete WO error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// ─── WO Lifecycle: Helper to safely update machine status ───────────────────
async function setMachineStatusHelper(connection, machineCodeOrId, status) {
    if (!machineCodeOrId) return;
    const strVal = String(machineCodeOrId).trim();
    const isNum = !isNaN(Number(strVal)) && !isNaN(parseInt(strVal));
    if (isNum) {
        await connection.execute(
            `UPDATE machines SET status = ?, updated_at = NOW() WHERE id = ? OR code = ?`,
            [status, Number(strVal), strVal]
        );
    } else {
        await connection.execute(
            `UPDATE machines SET status = ?, updated_at = NOW() 
             WHERE code = ? OR code = REPLACE(?, ' ', '-') OR REPLACE(code, '-', ' ') = ?`,
            [status, strVal, strVal, strVal]
        );
    }
}

// ─── WO Lifecycle: Start Work Order ──────────────────────────────────────────
// Sets WO → Running, all linked MPPs → Berjalan, all linked Machines → Running
exports.startWorkOrder = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Get WO info
        const [[wo]] = await connection.execute('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!wo) return res.status(404).json({ success: false, message: 'Work Order tidak ditemukan' });
        if (wo.status === 'Completed') return res.status(400).json({ success: false, message: 'WO sudah selesai, tidak bisa di-Start ulang' });

        // 2. Set WO → Running
        await connection.execute(
            `UPDATE work_orders SET status = 'Running', updated_at = NOW() WHERE id = ?`, [id]
        );

        // 3. Get all linked MPPs (where wo_id = this WO id)
        const [mpps] = await connection.execute(
            `SELECT * FROM planning_produksi WHERE wo_id = ? AND status != 'Selesai'`, [id]
        );

        const machineIds = new Set();
        for (const mpp of mpps) {
            // 4. Set each MPP → Berjalan
            await connection.execute(
                `UPDATE planning_produksi SET status = 'Berjalan', updated_at = NOW() WHERE id = ?`, [mpp.id]
            );
            if (mpp.machine_id) machineIds.add(mpp.machine_id);
        }

        // 5. Set linked machines → Running
        for (const machineCode of machineIds) {
            await setMachineStatusHelper(connection, machineCode, 'Running');
        }

        await connection.commit();
        return res.json({
            success: true,
            message: `WO berhasil di-Start. ${mpps.length} MPP aktif, ${machineIds.size} mesin Running.`,
            affected_mpps: mpps.length,
            affected_machines: machineIds.size
        });
    } catch (error) {
        await connection.rollback();
        console.error('Start WO error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// ─── WO Lifecycle: Stop / Pause Work Order ───────────────────────────────────
// Sets WO → Paused, all Running MPPs → Pause, linked Machines → Idle (if no other Running WO uses them)
exports.stopWorkOrder = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [[wo]] = await connection.execute('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!wo) return res.status(404).json({ success: false, message: 'Work Order tidak ditemukan' });

        // 1. Set WO → Paused
        await connection.execute(
            `UPDATE work_orders SET status = 'Paused', updated_at = NOW() WHERE id = ?`, [id]
        );

        // 2. Get running MPPs for this WO
        const [mpps] = await connection.execute(
            `SELECT * FROM planning_produksi WHERE wo_id = ? AND status = 'Berjalan'`, [id]
        );

        for (const mpp of mpps) {
            // 3. Set each MPP → Pause
            await connection.execute(
                `UPDATE planning_produksi SET status = 'Pause', updated_at = NOW() WHERE id = ?`, [mpp.id]
            );

            if (mpp.machine_id) {
                // 4. Check if any OTHER Running WO still uses this machine
                const [otherRunning] = await connection.execute(
                    `SELECT pp.id FROM planning_produksi pp
                     JOIN work_orders w ON w.id = pp.wo_id
                     WHERE pp.machine_id = ? AND pp.status = 'Berjalan' AND pp.wo_id != ?
                     LIMIT 1`,
                    [mpp.machine_id, id]
                );
                // Only idle machine if no other active WO uses it
                if (otherRunning.length === 0) {
                    await setMachineStatusHelper(connection, mpp.machine_id, 'Idle');
                }
            }
        }

        await connection.commit();
        return res.json({
            success: true,
            message: `WO berhasil di-Pause. ${mpps.length} MPP di-pause.`,
            affected_mpps: mpps.length
        });
    } catch (error) {
        await connection.rollback();
        console.error('Stop WO error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// ─── WO Lifecycle: Finish a single MPP item (per-machine finish) ─────────────
// Called per MPP. Sets that MPP → Selesai, Machine → Idle (if no other Running WO uses it).
// If ALL MPPs for this WO are Selesai, WO becomes Completed automatically.
exports.finishMppItem = async (req, res) => {
    const { id } = req.params; // MPP/PrO id
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [[mpp]] = await connection.execute('SELECT * FROM planning_produksi WHERE id = ?', [id]);
        if (!mpp) return res.status(404).json({ success: false, message: 'MPP tidak ditemukan' });

        // 1. Set this MPP → Selesai
        await connection.execute(
            `UPDATE planning_produksi SET status = 'Selesai', updated_at = NOW() WHERE id = ?`, [id]
        );

        // 2. Set Machine → Idle if no other running MPP uses it
        if (mpp.machine_id) {
            const [otherRunning] = await connection.execute(
                `SELECT pp.id FROM planning_produksi pp
                 WHERE pp.machine_id = ? AND pp.status = 'Berjalan' AND pp.id != ?
                 LIMIT 1`,
                [mpp.machine_id, id]
            );
            if (otherRunning.length === 0) {
                await setMachineStatusHelper(connection, mpp.machine_id, 'Idle');
            }
        }

        let woCompleted = false;
        // 3. If this MPP is linked to a WO, check if all MPPs for that WO are done
        if (mpp.wo_id) {
            const [remainingMpps] = await connection.execute(
                `SELECT id FROM planning_produksi WHERE wo_id = ? AND status != 'Selesai'`, [mpp.wo_id]
            );
            if (remainingMpps.length === 0) {
                // All MPPs done → Complete the WO
                await connection.execute(
                    `UPDATE work_orders SET status = 'Completed', updated_at = NOW() WHERE id = ?`, [mpp.wo_id]
                );
                woCompleted = true;
            }
        }

        await connection.commit();
        return res.json({
            success: true,
            message: woCompleted
                ? `MPP selesai. Semua item produksi selesai — WO otomatis Completed!`
                : `MPP berhasil di-Finish. Mesin ${mpp.machine_id} → Idle.`,
            wo_completed: woCompleted,
            machine_id: mpp.machine_id
        });
    } catch (error) {
        await connection.rollback();
        console.error('Finish MPP error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// ─── WO Lifecycle: Force-finish entire Work Order ────────────────────────────
// Force all MPPs to Selesai, all machines to Idle (if no other running WO), WO → Completed
exports.finishWorkOrder = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [[wo]] = await connection.execute('SELECT * FROM work_orders WHERE id = ?', [id]);
        if (!wo) return res.status(404).json({ success: false, message: 'Work Order tidak ditemukan' });

        // 1. Get all non-finished MPPs for this WO
        const [mpps] = await connection.execute(
            `SELECT * FROM planning_produksi WHERE wo_id = ? AND status != 'Selesai'`, [id]
        );

        const machineIds = new Set();
        for (const mpp of mpps) {
            await connection.execute(
                `UPDATE planning_produksi SET status = 'Selesai', updated_at = NOW() WHERE id = ?`, [mpp.id]
            );
            if (mpp.machine_id) machineIds.add(mpp.machine_id);
        }

        // 2. Set machines → Idle (only if no other Running WO uses them)
        for (const machineCode of machineIds) {
            const [otherRunning] = await connection.execute(
                `SELECT pp.id FROM planning_produksi pp
                 JOIN work_orders w ON w.id = pp.wo_id
                 WHERE pp.machine_id = ? AND pp.status = 'Berjalan' AND pp.wo_id != ?
                 LIMIT 1`,
                [machineCode, id]
            );
            if (otherRunning.length === 0) {
                await setMachineStatusHelper(connection, machineCode, 'Idle');
            }
        }

        // 3. Set WO → Completed
        await connection.execute(
            `UPDATE work_orders SET status = 'Completed', updated_at = NOW() WHERE id = ?`, [id]
        );

        await connection.commit();
        return res.json({
            success: true,
            message: `WO berhasil Diselesaikan. ${mpps.length} MPP → Selesai, ${machineIds.size} mesin → Idle.`,
            affected_mpps: mpps.length,
            affected_machines: machineIds.size
        });
    } catch (error) {
        await connection.rollback();
        console.error('Finish WO error:', error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        connection.release();
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD OVERVIEW — Manufacturing Analytics Aggregator
// ═══════════════════════════════════════════════════════════════════════════════
exports.getDashboardOverview = async (req, res) => {
    try {
        // ─── 1. BOM Summary ───────────────────────────────────────────────────
        const [[bomStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Active' OR status = 'Released' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft
            FROM boms
        `);

        // ─── 2. MRP Summary ──────────────────────────────────────────────────
        const [[mrpStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('Draft','Pending','Approved','Pending Approval') THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'Released' OR status = 'Completed' THEN 1 ELSE 0 END) as released,
                COALESCE(SUM(total_net_qty), 0) as total_net_qty,
                COALESCE(SUM(total_est_cost), 0) as total_est_cost
            FROM mrps
        `);

        // ─── 3. Planning Produksi (PrO/MPP) ──────────────────────────────────
        const [[proStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status NOT IN ('Selesai','Selesai / Done') THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status IN ('Selesai','Selesai / Done') THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status IN ('Dalam Produksi','Berjalan') THEN 1 ELSE 0 END) as in_production,
                SUM(CASE WHEN status LIKE 'Menunggu%' THEN 1 ELSE 0 END) as waiting,
                COALESCE(SUM(target_qty), 0) as total_target,
                COALESCE(SUM(actual_qty), 0) as total_actual
            FROM planning_produksi
        `);

        // PrO status breakdown
        const [proStatusBreakdown] = await db.query(`
            SELECT 
                CASE 
                    WHEN status = 'Selesai / Done' THEN 'Selesai'
                    WHEN status = 'Berjalan' THEN 'Dalam Produksi'
                    ELSE status 
                END as status_label,
                COUNT(*) as count
            FROM planning_produksi
            GROUP BY status_label
            ORDER BY count DESC
        `);

        // ─── 4. Work Orders ──────────────────────────────────────────────────
        const [[woStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Open' OR status = 'In Progress' OR status = 'Running' THEN 1 ELSE 0 END) as active,
                SUM(CASE WHEN status = 'Completed' OR status = 'Done' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'Draft' THEN 1 ELSE 0 END) as draft,
                COALESCE(SUM(target_qty), 0) as total_target
            FROM work_orders
        `);

        // ─── 5. Material Issuances ───────────────────────────────────────────
        const [[miStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status = 'Released' OR status = 'Completed' THEN 1 ELSE 0 END) as released,
                SUM(CASE WHEN status = 'Draft' OR status = 'Pending' THEN 1 ELSE 0 END) as pending
            FROM material_issuances
        `);

        // ─── 6. Production Outputs ───────────────────────────────────────────
        const [[outputStats]] = await db.query(`
            SELECT 
                COUNT(*) as total_records,
                COALESCE(SUM(qty_ok), 0) as total_ok,
                COALESCE(SUM(qty_ng), 0) as total_ng,
                COALESCE(SUM(qty_received), 0) as total_received,
                COALESCE(SUM(qty_ok + qty_ng), 0) as total_output
            FROM production_outputs
        `);

        // First Pass Yield
        const totalOutputForFPY = Number(outputStats.total_ok) + Number(outputStats.total_ng);
        const firstPassYield = totalOutputForFPY > 0
            ? parseFloat(((Number(outputStats.total_ok) / totalOutputForFPY) * 100).toFixed(1))
            : 100;

        // ─── 7. NG / Disposal ────────────────────────────────────────────────
        const [[ngStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                COALESCE(SUM(qty), 0) as total_qty,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending,
                SUM(CASE WHEN status = 'In_Progress' THEN 1 ELSE 0 END) as in_progress,
                SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed
            FROM ng_disposals
        `);

        // ─── 8. Internal Transfers ───────────────────────────────────────────
        const [[transferStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN transfer_type = 'PROD_TO_QC' THEN 1 ELSE 0 END) as prod_to_qc,
                SUM(CASE WHEN transfer_type = 'QC_TO_FG' THEN 1 ELSE 0 END) as qc_to_fg,
                SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as received,
                SUM(CASE WHEN status IN ('Draft','Pending','In_Transit') THEN 1 ELSE 0 END) as in_transit
            FROM internal_transfers
        `);

        // ─── 9. Machine Status ───────────────────────────────────────────────
        const [machineStatusRows] = await db.query(`
            SELECT 
                COALESCE(status, 'Unknown') as status, 
                COUNT(*) as count
            FROM machines 
            WHERE is_active = 1
            GROUP BY status
        `);
        const [[machineTotal]] = await db.query(`SELECT COUNT(*) as total FROM machines WHERE is_active = 1`);

        // ─── 10. Customer Claims ─────────────────────────────────────────────
        const [[claimStats]] = await db.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN status IN ('Open','Investigating','Sorting') THEN 1 ELSE 0 END) as open_claims,
                SUM(CASE WHEN status = 'Closed' OR status = 'Completed' THEN 1 ELSE 0 END) as closed
            FROM customer_claims
        `);

        // ─── 11. Crusher Logs ────────────────────────────────────────────────
        const [[crusherStats]] = await db.query(`
            SELECT COUNT(*) as total, COALESCE(SUM(qty_ng_component), 0) as total_qty FROM crusher_logs
        `);

        // ─── 12. Monthly Production Trend (last 6 months) ───────────────────
        const [monthlyTrend] = await db.query(`
            SELECT 
                DATE_FORMAT(pp.start_date, '%Y-%m') as month_key,
                DATE_FORMAT(pp.start_date, '%b %Y') as month_label,
                COALESCE(SUM(pp.target_qty), 0) as target,
                COALESCE(SUM(pp.actual_qty), 0) as actual
            FROM planning_produksi pp
            WHERE pp.start_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
            GROUP BY month_key, month_label
            ORDER BY month_key ASC
        `);

        // ─── 13. Production Output by NG category ───────────────────────────
        const [ngCategoryBreakdown] = await db.query(`
            SELECT 
                COALESCE(ng_category, ng_type, 'Tidak Diketahui') as category,
                SUM(qty_ng) as total_ng
            FROM production_outputs
            WHERE qty_ng > 0
            GROUP BY category
            ORDER BY total_ng DESC
            LIMIT 8
        `);

        // ─── 14. Machine utilization from PrO ───────────────────────────────
        const [machineUtilization] = await db.query(`
            SELECT 
                pp.machine_id as machine_code,
                COALESCE(m.name, pp.machine_id) as machine_name,
                COUNT(*) as job_count,
                SUM(pp.target_qty) as total_target,
                SUM(pp.actual_qty) as total_actual
            FROM planning_produksi pp
            LEFT JOIN machines m ON m.code = pp.machine_id
            WHERE pp.machine_id IS NOT NULL AND pp.machine_id != ''
            GROUP BY pp.machine_id, m.name
            ORDER BY job_count DESC
            LIMIT 10
        `);

        // ─── 15. Recent Activity Stream ──────────────────────────────────────
        let recentActivity = [];
        try {
            const [proAct] = await db.query(`SELECT 'PrO/MPP' as module, CAST(pro_code AS CHAR) as reference, CAST(status AS CHAR) as status, created_at, 'planning' as type FROM planning_produksi ORDER BY id DESC LIMIT 5`);
            const [woAct] = await db.query(`SELECT 'Work Order' as module, CAST(reference AS CHAR) as reference, CAST(status AS CHAR) as status, created_at, 'wo' as type FROM work_orders ORDER BY id DESC LIMIT 5`);
            const [miAct] = await db.query(`SELECT 'Material Issue' as module, CAST(reference AS CHAR) as reference, CAST(status AS CHAR) as status, created_at, 'mi' as type FROM material_issuances ORDER BY id DESC LIMIT 5`);
            const [itAct] = await db.query(`SELECT 'Transfer' as module, CAST(reference_no AS CHAR) as reference, CAST(status AS CHAR) as status, created_at, 'transfer' as type FROM internal_transfers ORDER BY id DESC LIMIT 5`);
            
            recentActivity = [...proAct, ...woAct, ...miAct, ...itAct]
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
                .slice(0, 15);
        } catch (actErr) {
            console.error('Recent activity query error:', actErr.message);
        }

        // ─── 16. WO by tipe_barang_jadi ──────────────────────────────────────
        const [woByType] = await db.query(`
            SELECT 
                COALESCE(tipe_barang_jadi, 'Belum Ditentukan') as tipe,
                COUNT(*) as count,
                COALESCE(SUM(target_qty), 0) as total_target
            FROM work_orders
            GROUP BY tipe_barang_jadi
            ORDER BY count DESC
        `);

        // ─── Build Response ──────────────────────────────────────────────────
        const completionRate = Number(proStats.total_target) > 0
            ? parseFloat(((Number(proStats.total_actual) / Number(proStats.total_target)) * 100).toFixed(1))
            : 0;

        return res.json({
            success: true,
            data: {
                // Executive KPIs
                kpi: {
                    total_bom: Number(bomStats.total),
                    active_bom: Number(bomStats.active),
                    total_mrp: Number(mrpStats.total),
                    active_mrp: Number(mrpStats.active),
                    total_pro: Number(proStats.total),
                    active_pro: Number(proStats.active),
                    completed_pro: Number(proStats.completed),
                    in_production: Number(proStats.in_production),
                    waiting_pro: Number(proStats.waiting),
                    total_wo: Number(woStats.total),
                    active_wo: Number(woStats.active),
                    completed_wo: Number(woStats.completed),
                    total_target: Number(proStats.total_target),
                    total_actual: Number(proStats.total_actual),
                    completion_rate: completionRate,
                    first_pass_yield: firstPassYield,
                    total_ok_output: Number(outputStats.total_ok),
                    total_ng_output: Number(outputStats.total_ng),
                    total_material_issued: Number(miStats.total),
                    material_pending: Number(miStats.pending),
                    total_ng_disposal: Number(ngStats.total),
                    ng_qty: Number(ngStats.total_qty),
                    total_transfers: Number(transferStats.total),
                    transfers_in_transit: Number(transferStats.in_transit),
                    total_machines: Number(machineTotal.total),
                    open_claims: Number(claimStats.open_claims),
                    crusher_qty: Number(crusherStats.total_qty)
                },
                // Module-level summaries
                modules: {
                    bom: { total: Number(bomStats.total), active: Number(bomStats.active), draft: Number(bomStats.draft) },
                    mrp: { total: Number(mrpStats.total), active: Number(mrpStats.active), released: Number(mrpStats.released), net_qty: Number(mrpStats.total_net_qty), est_cost: Number(mrpStats.total_est_cost) },
                    pro: { total: Number(proStats.total), active: Number(proStats.active), completed: Number(proStats.completed), in_production: Number(proStats.in_production), target: Number(proStats.total_target), actual: Number(proStats.total_actual) },
                    wo: { total: Number(woStats.total), active: Number(woStats.active), completed: Number(woStats.completed), draft: Number(woStats.draft), target: Number(woStats.total_target) },
                    material: { total: Number(miStats.total), released: Number(miStats.released), pending: Number(miStats.pending) },
                    output: { records: Number(outputStats.total_records), ok: Number(outputStats.total_ok), ng: Number(outputStats.total_ng), received: Number(outputStats.total_received) },
                    ng_disposal: { total: Number(ngStats.total), qty: Number(ngStats.total_qty), pending: Number(ngStats.pending), in_progress: Number(ngStats.in_progress), completed: Number(ngStats.completed) },
                    transfer: { total: Number(transferStats.total), prod_to_qc: Number(transferStats.prod_to_qc), qc_to_fg: Number(transferStats.qc_to_fg), received: Number(transferStats.received), in_transit: Number(transferStats.in_transit) },
                    claims: { total: Number(claimStats.total), open: Number(claimStats.open_claims), closed: Number(claimStats.closed) },
                    crusher: { total: Number(crusherStats.total), qty: Number(crusherStats.total_qty) }
                },
                // Charts Data
                charts: {
                    pro_status_breakdown: proStatusBreakdown,
                    monthly_trend: monthlyTrend,
                    ng_category_breakdown: ngCategoryBreakdown,
                    machine_utilization: machineUtilization,
                    machine_status: machineStatusRows,
                    wo_by_type: woByType
                },
                // Activity Feed
                recent_activity: recentActivity
            }
        });
    } catch (error) {
        console.error('Dashboard overview error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

