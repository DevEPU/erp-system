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

// Generate reference code for PrO (Planning Produksi)
async function generatePROReference(connection) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `PRO/EPU/${year}/${month}/`;
    const globalYearPrefix = `PRO/EPU/${year}/%`;

    const [latest] = await connection.execute(
        'SELECT pro_code FROM planning_produksi WHERE pro_code LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );

    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].pro_code;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

exports.getPlanningProduksi = async (req, res) => {
    try {
        const { search, status } = req.query;
        let query = `
            SELECT pro.*, 
                   os.reference as os_reference,
                   COALESCE(os.customer_id, latest_po.customer_id) as customer_id,
                   COALESCE(c.customer_name, cust.customer_name) as customer_name,
                   COALESCE(latest_po.no_po_customer, latest_po.reference) as no_po_customer,
                   m.name as mold_name, m.code as mold_code,
                   COALESCE(mach.code, pro.machine_id) as machine_id,
                   mach.name as machine_name,
                   mach.code as machine_code,
                   COALESCE(p.product_name, wo_p.product_name) as product_name,
                   COALESCE(p.product_code, wo_p.product_code) as product_code,
                   COALESCE(p.product_unit, wo_p.product_unit) as product_unit,
                   wo.reference as wo_reference,
                   COALESCE(wom_stats.total_required, 0) as wo_total_required,
                   COALESCE(wom_stats.total_issued, 0) as wo_total_issued,
                   COALESCE(po_stats.total_received, 0) as total_received,
                   COALESCE(po_stats.po_count, 0) as po_count,
                   COALESCE(po_stats.wip_count, 0) as wip_count,
                   COALESCE(po_stats.repair_count, 0) as repair_count,
                   COALESCE(po_stats.verified_count, 0) as verified_count
            FROM planning_produksi pro
            LEFT JOIN order_sheets os ON pro.order_sheet_id = os.id
            LEFT JOIN customers c ON os.customer_id = c.id
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN molds m ON pro.mold_id = m.id
            LEFT JOIN machines mach ON (pro.machine_id = mach.code OR pro.machine_id = CAST(mach.id AS CHAR))
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            LEFT JOIN (
                SELECT pod.product_id, po.customer_id, po.no_po_customer, po.reference
                FROM customer_po_details pod
                JOIN customer_po po ON pod.po_id = po.id
                ORDER BY po.id DESC
                LIMIT 1
            ) latest_po ON latest_po.product_id = COALESCE(pro.product_id, wo.parent_product_id)
            LEFT JOIN customers cust ON latest_po.customer_id = cust.id
            LEFT JOIN (
                SELECT work_order_id, 
                       SUM(qty_required) as total_required,
                       SUM(qty_issued) as total_issued
                FROM work_order_materials
                GROUP BY work_order_id
            ) wom_stats ON pro.wo_id = wom_stats.work_order_id
            LEFT JOIN (
                SELECT pro_id,
                       COUNT(*) as po_count,
                       SUM(CASE WHEN status = 'Received_FG' THEN qty_ok ELSE 0 END) as total_received,
                       SUM(CASE WHEN status IN ('WIP', 'SFG_PENDING_QC') THEN 1 ELSE 0 END) as wip_count,
                       SUM(CASE WHEN status = 'PENDING_REPAIR' THEN 1 ELSE 0 END) as repair_count,
                       SUM(CASE WHEN status = 'Verified_QC' THEN 1 ELSE 0 END) as verified_count
                FROM production_outputs
                GROUP BY pro_id
            ) po_stats ON pro.id = po_stats.pro_id
        `;
        let params = [];
        let conditions = [];

        if (search) {
            conditions.push('(pro.pro_code LIKE ? OR os.reference LIKE ? OR p.product_name LIKE ? OR wo_p.product_name LIKE ? OR pro.operator_name LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY pro.id DESC';
        const [rows] = await db.query(query, params);

        const mappedRows = rows.map(pro => {
            let computedStatus = 'Menunggu WO';
            
            if (pro.wo_id) {
                const totalRequired = Number(pro.wo_total_required || 0);
                const totalIssued = Number(pro.wo_total_issued || 0);
                const totalReceived = Number(pro.total_received || 0);
                const poCount = Number(pro.po_count || 0);
                const wipCount = Number(pro.wip_count || 0);
                const repairCount = Number(pro.repair_count || 0);
                const verifiedCount = Number(pro.verified_count || 0);

                if (pro.status === 'Selesai' || (totalReceived > 0 && totalReceived >= Number(pro.target_qty))) {
                    computedStatus = 'Selesai / Done';
                } else if (totalRequired > 0 && totalIssued === 0) {
                    computedStatus = 'Menunggu Realisasi Bahan Baku';
                } else if (poCount === 0) {
                    computedStatus = 'Menunggu Molding';
                } else if (wipCount > 0) {
                    computedStatus = 'Menunggu QC Gate';
                } else if (repairCount > 0) {
                    computedStatus = 'Menunggu Perbaikan';
                } else if (verifiedCount > 0) {
                    computedStatus = 'Menunggu Penarikan FG';
                } else {
                    computedStatus = 'Dalam Produksi';
                }
            } else {
                computedStatus = 'Menunggu WO';
            }
            
            return {
                ...pro,
                status: computedStatus
            };
        });

        let filteredRows = mappedRows;
        if (status && status !== 'all' && status !== 'Semua') {
            filteredRows = mappedRows.filter(r => r.status.toLowerCase() === status.toLowerCase());
        }

        return res.json({ success: true, data: serialize(filteredRows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createPlanningProduksi = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { 
            wo_id, 
            order_sheet_id, 
            product_id, 
            mold_id, 
            machine_id, 
            operator_name, 
            operator_lead,
            shift, 
            shift_hours,
            uph_used,
            downtime_reason,
            target_qty, 
            start_date, 
            end_date 
        } = req.body;

        if ((!wo_id && !order_sheet_id && !product_id) || !target_qty || !start_date || !end_date) {
            return res.status(400).json({ message: 'Product ID, Order Sheet ID, or Work Order ID, target quantity, start date and end date are required' });
        }

        const proCode = await generatePROReference(connection);

        await connection.execute(
            `INSERT INTO planning_produksi 
                (pro_code, wo_id, order_sheet_id, product_id, mold_id, machine_id, operator_name, operator_lead, shift, shift_hours, uph_used, downtime_reason, target_qty, actual_qty, start_date, end_date, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'Rencana', NOW(), NOW())`,
            [
                proCode, 
                wo_id || null, 
                order_sheet_id || null, 
                product_id || null, 
                mold_id || null, 
                machine_id || null, 
                operator_name || '', 
                operator_lead || null,
                shift || 1, 
                shift_hours || 7.00,
                uph_used || null,
                downtime_reason || null,
                target_qty, 
                start_date, 
                end_date
            ]
        );

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Planning Produksi (PrO) created successfully',
            pro_code: proCode
        });

    } catch (error) {
        await connection.rollback();
        console.error('createPlanningProduksi Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.getPlanningProduksiById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(`
            SELECT pro.*,
                   os.reference as os_reference,
                   m.name as mold_name, m.code as mold_code,
                   COALESCE(p.product_name, wo_p.product_name) as product_name,
                   COALESCE(p.product_code, wo_p.product_code) as product_code,
                   COALESCE(p.product_unit, wo_p.product_unit) as product_unit,
                   wo.reference as wo_reference,
                   COALESCE(wom_stats.total_required, 0) as wo_total_required,
                   COALESCE(wom_stats.total_issued, 0) as wo_total_issued,
                   COALESCE(po_stats.total_received, 0) as total_received,
                   COALESCE(po_stats.po_count, 0) as po_count,
                   COALESCE(po_stats.wip_count, 0) as wip_count,
                   COALESCE(po_stats.repair_count, 0) as repair_count,
                   COALESCE(po_stats.verified_count, 0) as verified_count,
                   COALESCE(po_stats.total_ok, 0) as total_ok,
                   COALESCE(po_stats.total_ng, 0) as total_ng
            FROM planning_produksi pro
            LEFT JOIN order_sheets os ON pro.order_sheet_id = os.id
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN molds m ON pro.mold_id = m.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            LEFT JOIN (
                SELECT work_order_id,
                       SUM(qty_required) as total_required,
                       SUM(qty_issued) as total_issued
                FROM work_order_materials
                GROUP BY work_order_id
            ) wom_stats ON pro.wo_id = wom_stats.work_order_id
            LEFT JOIN (
                SELECT pro_id,
                       COUNT(*) as po_count,
                       SUM(CASE WHEN status = 'Received_FG' THEN qty_ok ELSE 0 END) as total_received,
                       SUM(CASE WHEN status IN ('WIP', 'SFG_PENDING_QC') THEN 1 ELSE 0 END) as wip_count,
                       SUM(CASE WHEN status = 'PENDING_REPAIR' THEN 1 ELSE 0 END) as repair_count,
                       SUM(CASE WHEN status = 'Verified_QC' THEN 1 ELSE 0 END) as verified_count,
                       SUM(qty_ok) as total_ok,
                       SUM(qty_ng) as total_ng
                FROM production_outputs
                GROUP BY pro_id
            ) po_stats ON pro.id = po_stats.pro_id
            WHERE pro.id = ?
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Planning Produksi not found' });
        }

        const pro = rows[0]; // must be declared before any query that uses pro.wo_id / pro.product_code

        // Fetch all production output logs for this PrO (deduplicated via subquery aggregation)
        const [outputLogs] = await db.query(`
            SELECT 
                po.id, po.pro_id, po.qty_ok, po.qty_ng, po.ng_type, po.notes,
                po.ng_category, po.status, po.created_at, po.updated_at,
                SUM(vc.qty_ng_component) as qty_ng_component,
                MAX(vc.status) as vc_status,
                MAX(mir.qty_requested) as replacement_qty,
                MAX(mir.status) as replacement_status
            FROM production_outputs po
            LEFT JOIN vendor_claims vc ON vc.production_output_id = po.id
            LEFT JOIN material_issuance_replacements mir ON mir.production_output_id = po.id
            WHERE po.pro_id = ?
            GROUP BY po.id, po.pro_id, po.qty_ok, po.qty_ng, po.ng_type, po.notes,
                     po.ng_category, po.status, po.created_at, po.updated_at
            ORDER BY po.id ASC
        `, [id]);

        // Fetch detailed vendor claims per output (for timeline NG details)
        // Using JOIN instead of IN subquery (old MySQL doesn't support LIMIT in IN subquery)
        const [vendorClaims] = await db.query(`
            SELECT vc.*, 
                   p.product_name, p.product_code
            FROM vendor_claims vc
            JOIN production_outputs po ON po.id = vc.production_output_id
            LEFT JOIN products p ON p.id = vc.product_id
            WHERE po.pro_id = ?
            ORDER BY vc.id ASC
        `, [id]);

        // Fetch material replacement details (for timeline)
        const [replacements] = await db.query(`
            SELECT mir.*, p.product_name, p.product_code
            FROM material_issuance_replacements mir
            LEFT JOIN products p ON p.id = mir.product_id
            WHERE mir.wo_id = ?
            ORDER BY mir.id ASC
        `, [pro.wo_id]);

        // Fetch BOM materials for this PrO's product
        const fgCode = pro.product_code;
        let bomMaterials = [];
        if (fgCode) {
            const [bomRows] = await db.query(
                'SELECT id FROM boms WHERE finished_good_code = ? AND status = "Aktif" LIMIT 1',
                [fgCode]
            );
            if (bomRows.length > 0) {
                const [items] = await db.query(
                    `SELECT bi.id, bi.item_type, bi.product_code, bi.product_name,
                            bi.qty as qty_per_unit, bi.unit as product_unit
                     FROM bom_items bi
                     WHERE bi.bom_id = ?
                     ORDER BY bi.item_type, bi.product_name`,
                    [bomRows[0].id]
                );
                bomMaterials = items;
            }
        }

        // Fetch material issuances for the linked Work Order (for timeline step 2)
        let materialIssuances = [];
        if (pro.wo_id) {
            const [miRows] = await db.query(`
                SELECT mi.id, mi.reference, mi.date, mi.status, mi.note, mi.created_at,
                       COUNT(mid.id) as item_count
                FROM material_issuances mi
                LEFT JOIN material_issuance_details mid ON mid.issuance_id = mi.id
                WHERE mi.work_order_id = ?
                GROUP BY mi.id, mi.reference, mi.date, mi.status, mi.note, mi.created_at
                ORDER BY mi.id ASC
            `, [pro.wo_id]);
            console.log('[DEBUG] MI query wo_id:', pro.wo_id, 'results:', miRows.length);
            materialIssuances = miRows;
        }

        return res.json({
            success: true,
            data: {
                ...serialize([pro])[0],
                outputLogs: serialize(outputLogs),
                bomMaterials: serialize(bomMaterials),
                materialIssuances: serialize(materialIssuances),
                vendorClaims: serialize(vendorClaims),
                replacements: serialize(replacements)
            }
        });
    } catch (error) {
        console.error('getPlanningProduksiById Error:', error);
        res.status(500).json({ message: error.message });
    }
};


exports.updatePlanningProduksi = async (req, res) => {
    const { id } = req.params;
    const { status, operator_name, machine_id, shift, shift_hours, uph_used, downtime_reason, target_qty, order_sheet_id, product_id, mold_id } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM planning_produksi WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Planning Produksi not found' });
        }

        let query = 'UPDATE planning_produksi SET ';
        let params = [];
        let updates = [];

        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }
        if (operator_name !== undefined) {
            updates.push('operator_name = ?');
            params.push(operator_name);
        }
        if (req.body.operator_lead !== undefined) {
            updates.push('operator_lead = ?');
            params.push(req.body.operator_lead);
        }
        if (machine_id !== undefined) {
            updates.push('machine_id = ?');
            params.push(machine_id);
        }
        if (shift !== undefined) {
            updates.push('shift = ?');
            params.push(shift);
        }
        if (shift_hours !== undefined) {
            updates.push('shift_hours = ?');
            params.push(shift_hours);
        }
        if (uph_used !== undefined) {
            updates.push('uph_used = ?');
            params.push(uph_used);
        }
        if (downtime_reason !== undefined) {
            updates.push('downtime_reason = ?');
            params.push(downtime_reason);
        }
        if (target_qty !== undefined) {
            updates.push('target_qty = ?');
            params.push(target_qty);
        }
        if (order_sheet_id !== undefined) {
            updates.push('order_sheet_id = ?');
            params.push(order_sheet_id);
        }
        if (product_id !== undefined) {
            updates.push('product_id = ?');
            params.push(product_id);
        }
        if (mold_id !== undefined) {
            updates.push('mold_id = ?');
            params.push(mold_id);
        }

        if (updates.length === 0) {
            return res.status(400).json({ message: 'No fields to update' });
        }

        query += updates.join(', ') + ', updated_at = NOW() WHERE id = ?';
        params.push(id);

        await db.execute(query, params);
        return res.json({ success: true, message: 'Planning Produksi updated successfully' });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Helper to add stock in a warehouse and update products table
async function addStock(connection, productId, warehouseId, qty, hpp = 0, supplierId = null) {
    let query = `SELECT id, qty_stock FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = ?`;
    let params = [productId, warehouseId];
    if (supplierId !== null) {
        query += ` AND supplier_id = ?`;
        params.push(supplierId);
    } else {
        query += ` AND supplier_id IS NULL`;
    }
    const [rows] = await connection.execute(query, params);
    if (rows.length > 0) {
        await connection.execute(
            `UPDATE warehouse_stocks SET qty_stock = qty_stock + ?, updated_at = NOW() WHERE id = ?`,
            [qty, rows[0].id]
        );
    } else {
        await connection.execute(
            `INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
            [productId, warehouseId, supplierId, qty, hpp]
        );
    }
    await connection.execute(
        `UPDATE products SET product_quantity = product_quantity + ? WHERE id = ?`,
        [qty, productId]
    );
}

// Helper to deduct stock from a warehouse and update products table
async function deductStock(connection, productId, warehouseId, qty, supplierId = null) {
    let query = `SELECT id, qty_stock FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = ?`;
    let params = [productId, warehouseId];
    if (supplierId !== null) {
        query += ` AND supplier_id = ?`;
        params.push(supplierId);
    } else {
        query += ` AND supplier_id IS NULL`;
    }
    const [rows] = await connection.execute(query, params);
    const available = rows.length > 0 ? Number(rows[0].qty_stock) : 0;
    if (available < qty) {
        const [pRows] = await connection.execute('SELECT product_name FROM products WHERE id = ?', [productId]);
        const pName = pRows[0]?.product_name || `Product ID ${productId}`;
        throw new Error(`Stok tidak mencukupi untuk ${pName}. Dibutuhkan: ${qty}, Tersedia: ${available}`);
    }
    await connection.execute(
        `UPDATE warehouse_stocks SET qty_stock = qty_stock - ?, updated_at = NOW() WHERE id = ?`,
        [qty, rows[0].id]
    );
    await connection.execute(
        `UPDATE products SET product_quantity = GREATEST(0, product_quantity - ?) WHERE id = ?`,
        [qty, productId]
    );
}

exports.getProductionOutputs = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT po.*, 
                   pro.pro_code, 
                   os.reference as os_reference,
                   wo.reference as wo_reference, 
                   COALESCE(p.product_name, wo_p.product_name) as product_name, 
                   COALESCE(p.product_code, wo_p.product_code) as product_code
            FROM production_outputs po
            JOIN planning_produksi pro ON po.pro_id = pro.id
            LEFT JOIN order_sheets os ON pro.order_sheet_id = os.id
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            ORDER BY po.id DESC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.receiveProductionOutput = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { pro_id, qty_ok, qty_ng, type, component_ng_list, ng_type, notes, ng_category } = req.body;

        if (!pro_id || qty_ok === undefined || qty_ng === undefined) {
            return res.status(400).json({ message: 'Planning Produksi ID, Qty OK, and Qty NG are required' });
        }

        let qtyOk = Number(qty_ok);
        let qtyNg = Number(qty_ng);

        // 1. Validate PrO and fetch Finished Good details
        const [proRows] = await connection.execute(`
            SELECT pro.*, p.product_code as pro_product_code, p.product_name as pro_product_name,
                   wo.parent_product_id, wo_p.product_code as wo_product_code, wo_p.product_name as wo_product_name
            FROM planning_produksi pro
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            WHERE pro.id = ?`, [pro_id]);

        if (proRows.length === 0) {
            return res.status(404).json({ message: 'Planning Produksi not found' });
        }
        
        const pro = proRows[0];
        const fgCode = pro.pro_product_code || pro.wo_product_code;
        const targetProductId = pro.product_id || pro.parent_product_id;

        if (!targetProductId || !fgCode) {
            return res.status(400).json({ message: 'Finished Good product code or ID not found on associated PrO/Work Order' });
        }

        // Fetch target product code
        const [targetProdRows] = await connection.execute('SELECT product_code, product_name FROM products WHERE id = ?', [targetProductId]);
        if (targetProdRows.length === 0) {
            return res.status(400).json({ message: 'Target product not found' });
        }
        const targetProductCode = targetProdRows[0].product_code;

        // 2. Fetch active BOM of Finished Good
        const [bomRows] = await connection.execute(
            'SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = "Aktif" LIMIT 1',
            [fgCode]
        );
        if (bomRows.length === 0) {
            return res.status(400).json({ message: `Active BOM for Finished Good ${fgCode} not found` });
        }
        const bomId = bomRows[0].id;
        const bomQty = Number(bomRows[0].finished_good_qty || 1);

        // Fetch all items in this BOM
        const [bomItems] = await connection.execute(
            'SELECT * FROM bom_items WHERE bom_id = ?',
            [bomId]
        );

        // Determine if targetProduct is a WIP inside this BOM
        const wipItem = bomItems.find(item => item.product_code === targetProductCode && item.item_type === 'WIP');
        
        let inputs = [];
        if (wipItem) {
            // Multi-level BOM: Target is a WIP, inputs are its children
            inputs = bomItems.filter(item => item.parent_item_id === wipItem.id);
        } else {
            // Flat BOM: Target is FG itself, inputs are root items
            inputs = bomItems.filter(item => item.parent_item_id === null && item.product_code !== targetProductCode);
        }

        // Resolve input product IDs and identify resin
        const resolvedInputs = [];
        let resinItem = null;
        for (const item of inputs) {
            const [pRows] = await connection.execute('SELECT id, product_unit FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
            if (pRows.length > 0) {
                const inputProductId = pRows[0].id;
                const unit = pRows[0].product_unit || '';
                const isResin = (item.item_type === 'RAW' && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'g' || item.product_code.startsWith('EPPP')));
                
                resolvedInputs.push({
                    ...item,
                    productId: inputProductId,
                    unit,
                    isResin
                });
                
                if (isResin) {
                    resinItem = {
                        productId: inputProductId,
                        qtyPerWip: Number(item.qty) / bomQty
                    };
                }
            }
        }

        // Adjust qtyNg upwards based on component_ng_list if insert molding is active
        if (type === 'insert' && component_ng_list && component_ng_list.length > 0) {
            let maxImpliedNg = 0;
            for (const comp of component_ng_list) {
                const compInput = resolvedInputs.find(i => Number(i.productId) === Number(comp.product_id));
                if (compInput) {
                    const usage = Number(compInput.qty) / bomQty;
                    if (usage > 0) {
                        const impliedNg = Math.ceil(Number(comp.qty) / usage);
                        if (impliedNg > maxImpliedNg) {
                            maxImpliedNg = impliedNg;
                        }
                    }
                }
            }
            if (maxImpliedNg > qtyNg) {
                qtyNg = maxImpliedNg;
            }
        }

        const totalCycles = qtyOk + qtyNg;

        // 3. Deduct consumed materials from Gudang Produksi (warehouse_id = 2)
        for (const item of resolvedInputs) {
            const qtyNeeded = totalCycles * Number(item.qty) / bomQty;
            // Masing-masing input dipotong dari Gudang Produksi
            await deductStock(connection, item.productId, 2, qtyNeeded);
        }

        // 4. Record production output
        const [result] = await connection.execute(
            `INSERT INTO production_outputs (pro_id, qty_ok, qty_ng, ng_type, notes, ng_category, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 'WIP', NOW(), NOW())`,
            [pro_id, qtyOk, qtyNg, ng_type || null, notes || null, ng_category || null]
        );
        const outputId = result.insertId;

        // 5. Add WIP OK to Gudang Produksi (warehouse_id = 2)
        if (qtyOk > 0) {
            await addStock(connection, targetProductId, 2, qtyOk);
        }

        // 6. Handle WIP NG Crusher & Recycle return to Gudang Matkom (warehouse_id = 1)
        if (qtyNg > 0 && resinItem) {
            const resinReturnedQty = qtyNg * resinItem.qtyPerWip;
            
            // Tambahkan kembali stok Resin hasil gilingan ke Gudang Matkom
            await addStock(connection, resinItem.productId, 1, resinReturnedQty);
            
            // Log ke crusher_logs
            await connection.execute(
                `INSERT INTO crusher_logs (production_output_id, component_product_id, qty_ng_component, qty_regrind_resin, action, created_at, updated_at)
                 VALUES (?, ?, 0, ?, 'Crushed and Returned to Matkom', NOW(), NOW())`,
                [outputId, resinItem.productId, resinReturnedQty]
            );

            // Handle Component salvage for insert molding NG
            if (type === 'insert') {
                const compNgList = component_ng_list || [];
                
                // Cari item komponen (selain resin) di list inputs
                for (const item of resolvedInputs) {
                    if (item.productId === resinItem.productId) continue; // skip resin

                    // Cek jika operator menginput ada komponen yang ikut NG/rusak
                    const compNgInput = compNgList.find(c => Number(c.product_id) === Number(item.productId));
                    
                    const totalCompInNg = qtyNg * Number(item.qty) / bomQty;
                    let compNgQty = 0;
                    if (compNgInput) {
                        compNgQty = Number(compNgInput.qty);
                    } else if (qtyNg > 0) {
                        // Default: if product is NG but no component list specified, assume all components in NG are defective
                        compNgQty = totalCompInNg;
                    }
                    
                    let compSalvaged = totalCompInNg - compNgQty;
                    if (compSalvaged < 0) compSalvaged = 0;

                    // Komponen NG dikembalikan ke Gudang Matkom (warehouse 1)
                    if (compNgQty > 0) {
                        await addStock(connection, item.productId, 1, compNgQty);
                        await connection.execute(
                            `INSERT INTO crusher_logs (production_output_id, component_product_id, qty_ng_component, qty_regrind_resin, action, created_at, updated_at)
                             VALUES (?, ?, ?, 0, 'Returned to MATKOM (NG Component)', NOW(), NOW())`,
                            [outputId, item.productId, compNgQty]
                        );

                        // Insert into vendor_claims (Quarantine log)
                        await connection.execute(
                            `INSERT INTO vendor_claims (production_output_id, product_id, qty_ng_component, status, created_at, updated_at)
                             VALUES (?, ?, ?, 'QUARANTINED', NOW(), NOW())`,
                            [outputId, item.productId, compNgQty]
                        );

                        // Insert into material_issuance_replacements (Kirim Ulang Request)
                        if (pro.wo_id) {
                            await connection.execute(
                                `INSERT INTO material_issuance_replacements (wo_id, production_output_id, product_id, qty_requested, status, created_at, updated_at)
                                 VALUES (?, ?, ?, ?, 'PENDING_QC', NOW(), NOW())`,
                                [pro.wo_id, outputId, item.productId, compNgQty]
                            );
                        }
                    }

                    // Komponen yang selamat (OK) tetap berada di Produksi (kembalikan ke stok Produksi)
                    if (compSalvaged > 0) {
                        await addStock(connection, item.productId, 2, compSalvaged);
                    }
                }
            }
        }

        // 7. Update actual qty in planning_produksi
        await connection.execute(
            `UPDATE planning_produksi SET actual_qty = actual_qty + ?, status = 'Berjalan', updated_at = NOW() WHERE id = ?`,
            [qtyOk, pro_id]
        );

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Production realization output received successfully',
            output_id: outputId.toString()
        });

    } catch (error) {
        await connection.rollback();
        console.error('receiveProductionOutput Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.receiveAssemblyOutput = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { pro_id, qty_assembled_ok, qty_assembled_ng } = req.body;

        if (!pro_id || qty_assembled_ok === undefined || qty_assembled_ng === undefined) {
            return res.status(400).json({ message: 'Planning Produksi ID, Qty Assembled OK, and Qty Assembled NG are required' });
        }

        const qtyOk = Number(qty_assembled_ok);
        const qtyNg = Number(qty_assembled_ng);
        const totalAssembled = qtyOk + qtyNg;

        if (totalAssembled <= 0) {
            return res.status(400).json({ message: 'Total assembled quantity must be greater than 0' });
        }

        // 1. Fetch PrO details
        const [proRows] = await connection.execute(`
            SELECT pro.*, p.product_code as pro_product_code, p.product_name as pro_product_name,
                   wo.parent_product_id, wo_p.product_code as wo_product_code
            FROM planning_produksi pro
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            WHERE pro.id = ?`, [pro_id]);

        if (proRows.length === 0) {
            return res.status(404).json({ message: 'Planning Produksi not found' });
        }

        const pro = proRows[0];
        const fgCode = pro.pro_product_code || pro.wo_product_code;
        const targetProductId = pro.product_id || pro.parent_product_id;

        // Fetch target product code
        const [targetProdRows] = await connection.execute('SELECT product_code FROM products WHERE id = ?', [targetProductId]);
        if (targetProdRows.length === 0) {
            return res.status(400).json({ message: 'Target product not found' });
        }
        const targetProductCode = targetProdRows[0].product_code;

        // 2. Fetch active BOM of Finished Good
        const [bomRows] = await connection.execute(
            'SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = "Aktif" LIMIT 1',
            [fgCode]
        );
        if (bomRows.length === 0) {
            return res.status(400).json({ message: `Active BOM for Finished Good ${fgCode} not found` });
        }
        const bomId = bomRows[0].id;
        const bomQty = Number(bomRows[0].finished_good_qty || 1);

        // Fetch all items in this BOM
        const [bomItems] = await connection.execute(
            'SELECT * FROM bom_items WHERE bom_id = ?',
            [bomId]
        );

        // Find the WIP item in the BOM (this is what the operator is assembling components onto)
        const wipItem = bomItems.find(item => item.item_type === 'WIP');
        if (!wipItem) {
            return res.status(400).json({ message: 'BOM does not contain a WIP item. Cannot perform assembly check.' });
        }

        const [wipProdRows] = await connection.execute('SELECT id FROM products WHERE product_code = ? LIMIT 1', [wipItem.product_code]);
        if (wipProdRows.length === 0) {
            return res.status(400).json({ message: `Product for WIP code ${wipItem.product_code} not found` });
        }
        const wipProductId = wipProdRows[0].id;

        // Find other components (root-level items that are not the WIP itself)
        const componentItems = bomItems.filter(item => item.parent_item_id === null && item.product_code !== wipItem.product_code && item.product_code !== targetProductCode);

        // 3. Deduct WIP and Components from Gudang Produksi (warehouse_id = 2)
        // Deduct WIP
        await deductStock(connection, wipProductId, 2, totalAssembled);

        // Deduct Components
        for (const item of componentItems) {
            const [pRows] = await connection.execute('SELECT id FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
            if (pRows.length === 0) continue;
            const compProductId = pRows[0].id;
            const compQtyNeeded = totalAssembled * Number(item.qty) / bomQty;

            await deductStock(connection, compProductId, 2, compQtyNeeded);
        }

        // 4. Record assembly output as SFG_PENDING_QC
        const [result] = await connection.execute(
            `INSERT INTO production_outputs (pro_id, qty_ok, qty_ng, status, created_at, updated_at)
             VALUES (?, ?, ?, 'SFG_PENDING_QC', NOW(), NOW())`,
            [pro_id, qtyOk, qtyNg]
        );
        const outputId = result.insertId;

        // 5. Add SFG (using targetProductId) to Gudang Produksi (warehouse_id = 2)
        if (qtyOk > 0) {
            await addStock(connection, targetProductId, 2, qtyOk);
        }

        // 6. Handle Assembly NG:
        // WIP part is crushed -> resin returned to Matkom
        // Components are salvaged -> remain in Produksi
        if (qtyNg > 0) {
            // Find the resin sub-item under the WIP in BOM
            const wipInputs = bomItems.filter(item => item.parent_item_id === wipItem.id);
            let resinItem = null;
            for (const item of wipInputs) {
                const [pRows] = await connection.execute('SELECT id, product_unit FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
                if (pRows.length === 0) continue;
                const inputProductId = pRows[0].id;
                const unit = pRows[0].product_unit || '';
                
                if (item.item_type === 'RAW' && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'g' || item.product_code.startsWith('EPPP'))) {
                    resinItem = {
                        productId: inputProductId,
                        qtyPerWip: Number(item.qty) / bomQty
                    };
                    break;
                }
            }

            if (resinItem) {
                const resinReturnedQty = qtyNg * resinItem.qtyPerWip;
                // Add resin back to Gudang Matkom
                await addStock(connection, resinItem.productId, 1, resinReturnedQty);
                // Log to crusher_logs
                await connection.execute(
                    `INSERT INTO crusher_logs (production_output_id, component_product_id, qty_ng_component, qty_regrind_resin, action, created_at, updated_at)
                     VALUES (?, ?, 0, ?, 'Crushed and Returned to Matkom', NOW(), NOW())`,
                    [outputId, resinItem.productId, resinReturnedQty]
                );
            }

            // Salvage the components used in the assembly NG cycles and return them to Gudang Produksi (warehouse_id = 2)
            for (const item of componentItems) {
                const [pRows] = await connection.execute('SELECT id FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
                if (pRows.length === 0) continue;
                const compProductId = pRows[0].id;
                const compQtySalvaged = qtyNg * Number(item.qty) / bomQty;

                await addStock(connection, compProductId, 2, compQtySalvaged);
            }
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Assembly realization output received successfully',
            output_id: outputId.toString()
        });

    } catch (error) {
        await connection.rollback();
        console.error('receiveAssemblyOutput Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.repairOutputSubmit = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { production_output_id, qty_repaired_ok, qty_repaired_ng } = req.body;

        if (!production_output_id || qty_repaired_ok === undefined || qty_repaired_ng === undefined) {
            return res.status(400).json({ message: 'Production Output ID, Qty Repaired OK, and Qty Repaired NG are required' });
        }

        const qtyOk = Number(qty_repaired_ok);
        const qtyNg = Number(qty_repaired_ng);

        // Fetch production output
        const [poRows] = await connection.execute('SELECT * FROM production_outputs WHERE id = ?', [production_output_id]);
        if (poRows.length === 0) {
            return res.status(404).json({ message: 'Production Output not found' });
        }
        const prodOutput = poRows[0];

        if (prodOutput.status !== 'PENDING_REPAIR') {
            return res.status(400).json({ message: 'Only production outputs with PENDING_REPAIR status can be repaired' });
        }

        // Fetch PrO & BOM to find resin/component properties for scrap logic
        const [proRows] = await connection.execute(`
            SELECT pro.*, p.product_code as pro_product_code, wo.parent_product_id, wo_p.product_code as wo_product_code
            FROM planning_produksi pro
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            WHERE pro.id = ?`, [prodOutput.pro_id]);
        
        const pro = proRows[0];
        const fgCode = pro.pro_product_code || pro.wo_product_code;
        const targetProductId = pro.product_id || pro.parent_product_id;

        // 1. Handle Repaired OK items
        if (qtyOk > 0) {
            // Add OK items back to SFG stock in Produksi (warehouse 2)
            await addStock(connection, targetProductId, 2, qtyOk);
        }

        // 2. Handle Repaired NG items (Scrap / Crusher)
        if (qtyNg > 0) {
            const [bomRows] = await connection.execute(
                'SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = "Aktif" LIMIT 1',
                [fgCode]
            );
            if (bomRows.length > 0) {
                const bomId = bomRows[0].id;
                const bomQty = Number(bomRows[0].finished_good_qty || 1);
                
                const [bomItems] = await connection.execute(
                    'SELECT * FROM bom_items WHERE bom_id = ?',
                    [bomId]
                );

                const wipItem = bomItems.find(item => item.item_type === 'WIP');
                const componentItems = bomItems.filter(item => item.parent_item_id === null && item.product_code !== wipItem?.product_code && item.product_code !== fgCode);

                // Salvage components -> return to Produksi (warehouse 2)
                for (const item of componentItems) {
                    const [pRows] = await connection.execute('SELECT id FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
                    if (pRows.length === 0) continue;
                    const compProductId = pRows[0].id;
                    const compQtySalvaged = qtyNg * Number(item.qty) / bomQty;

                    await addStock(connection, compProductId, 2, compQtySalvaged);
                }

                // Crush WIP part -> return resin to Matkom (warehouse 1)
                if (wipItem) {
                    const wipInputs = bomItems.filter(item => item.parent_item_id === wipItem.id);
                    let resinItem = null;
                    for (const item of wipInputs) {
                        const [pRows] = await connection.execute('SELECT id, product_unit FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
                        if (pRows.length === 0) continue;
                        const inputProductId = pRows[0].id;
                        const unit = pRows[0].product_unit || '';
                        
                        if (item.item_type === 'RAW' && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'g' || item.product_code.startsWith('EPPP'))) {
                            resinItem = {
                                productId: inputProductId,
                                qtyPerWip: Number(item.qty) / bomQty
                            };
                            break;
                        }
                    }

                    if (resinItem) {
                        const resinReturnedQty = qtyNg * resinItem.qtyPerWip;
                        await addStock(connection, resinItem.productId, 1, resinReturnedQty);
                        await connection.execute(
                            `INSERT INTO crusher_logs (production_output_id, component_product_id, qty_ng_component, qty_regrind_resin, action, created_at, updated_at)
                             VALUES (?, ?, 0, ?, 'Crushed and Returned to Matkom (After Repair)', NOW(), NOW())`,
                            [production_output_id, resinItem.productId, resinReturnedQty]
                        );
                    }
                }
            }
        }

        // Update status of production output back to SFG_PENDING_QC so QC can check again
        await connection.execute(
            `UPDATE production_outputs 
             SET status = 'SFG_PENDING_QC', qty_ok = ?, qty_ng = ?, updated_at = NOW() 
             WHERE id = ?`,
            [qtyOk, qtyNg, production_output_id]
        );

        // Update planning_produksi status back to 'Berjalan'
        await connection.execute(
            `UPDATE planning_produksi SET status = 'Berjalan', updated_at = NOW() WHERE id = ?`,
            [prodOutput.pro_id]
        );

        await connection.commit();
        return res.json({ success: true, message: 'Operator repair report submitted successfully. Items returned to QC.' });

    } catch (error) {
        await connection.rollback();
        console.error('repairOutputSubmit Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.qcVerification = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // production_output_id
        const { status, qty_ok, qty_ng, ng_type, notes } = req.body;

        if (!status || !['Verified_QC', 'NG_REPAIRABLE', 'NG_SCRAP'].includes(status)) {
            return res.status(400).json({ message: 'Valid status (Verified_QC, NG_REPAIRABLE, NG_SCRAP) is required' });
        }

        // 1. Fetch production output
        const [poRows] = await connection.execute('SELECT * FROM production_outputs WHERE id = ?', [id]);
        if (poRows.length === 0) {
            return res.status(404).json({ message: 'Production Output not found' });
        }
        const prodOutput = poRows[0];

        if (prodOutput.status !== 'SFG_PENDING_QC' && prodOutput.status !== 'WIP') {
            return res.status(400).json({ message: 'Only production outputs with WIP or SFG_PENDING_QC status can be verified' });
        }

        // Fetch PrO & BOM details
        const [proRows] = await connection.execute(`
            SELECT pro.*, p.product_code as pro_product_code, wo.parent_product_id, wo_p.product_code as wo_product_code
            FROM planning_produksi pro
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            WHERE pro.id = ?`, [prodOutput.pro_id]);
        
        const pro = proRows[0];
        const fgCode = pro.pro_product_code || pro.wo_product_code;
        const targetProductId = pro.product_id || pro.parent_product_id;

        const oldQtyOk = Number(prodOutput.qty_ok || 0);
        const oldQtyNg = Number(prodOutput.qty_ng || 0);

        const newQtyOk = qty_ok !== undefined ? Number(qty_ok) : oldQtyOk;
        const newQtyNg = qty_ng !== undefined ? Number(qty_ng) : oldQtyNg;

        const diffOk = newQtyOk - oldQtyOk;
        const remainder = oldQtyOk - (newQtyOk + newQtyNg);

        // Update database row first with new values
        await connection.execute(
            `UPDATE production_outputs 
             SET qty_ok = ?, qty_ng = ?, ng_type = ?, notes = ?, updated_at = NOW() 
             WHERE id = ?`,
            [newQtyOk, newQtyNg, ng_type !== undefined ? ng_type : prodOutput.ng_type, notes !== undefined ? notes : prodOutput.notes, id]
        );

        // Split batch: if QC verified quantity is less than original pending quantity,
        // create a new pending output record for the remaining unverified quantity.
        if (remainder > 0) {
            await connection.execute(
                `INSERT INTO production_outputs (pro_id, qty_ok, qty_ng, status, created_at, updated_at)
                 VALUES (?, ?, 0, ?, NOW(), NOW())`,
                [prodOutput.pro_id, remainder, prodOutput.status]
            );
        }

        let finalStatus = status;

        if (status === 'Verified_QC') {
            // Adjust stock in Produksi (warehouse 2) based on diffOk
            if (diffOk > 0) {
                await addStock(connection, targetProductId, 2, diffOk);
            } else if (diffOk < 0) {
                await deductStock(connection, targetProductId, 2, Math.abs(diffOk));
            }
            finalStatus = 'Verified_QC';
        } 
        else if (status === 'NG_REPAIRABLE') {
            // Adjust stock in Produksi (warehouse 2) based on diffOk
            if (diffOk > 0) {
                await addStock(connection, targetProductId, 2, diffOk);
            } else if (diffOk < 0) {
                await deductStock(connection, targetProductId, 2, Math.abs(diffOk));
            }
            finalStatus = 'PENDING_REPAIR';
        } 
        else if (status === 'NG_SCRAP') {
            // Adjust stock in Produksi (warehouse 2) based on diffOk
            if (diffOk > 0) {
                await addStock(connection, targetProductId, 2, diffOk);
            } else if (diffOk < 0) {
                await deductStock(connection, targetProductId, 2, Math.abs(diffOk));
            }

            // We crush/scrap the additional NG items that were found during this QC check
            const scrapQty = Math.max(0, -diffOk); // only scrap items that were OK but are now marked as NG/scrap
            if (scrapQty > 0) {
                // Fetch BOM items to disassemble components and crush WIP
                const [bomRows] = await connection.execute(
                    'SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = "Aktif" LIMIT 1',
                    [fgCode]
                );
                if (bomRows.length > 0) {
                    const bomId = bomRows[0].id;
                    const bomQty = Number(bomRows[0].finished_good_qty || 1);
                    
                    const [bomItems] = await connection.execute(
                        'SELECT * FROM bom_items WHERE bom_id = ?',
                        [bomId]
                    );

                    const wipItem = bomItems.find(item => item.item_type === 'WIP');
                    const componentItems = bomItems.filter(item => item.parent_item_id === null && item.product_code !== wipItem?.product_code && item.product_code !== fgCode);

                    // 1. Salvage Components -> Return to Gudang Produksi (warehouse 2) for reuse
                    for (const item of componentItems) {
                        const [pRows] = await connection.execute('SELECT id FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
                        if (pRows.length === 0) continue;
                        const compProductId = pRows[0].id;
                        const compQtySalvaged = scrapQty * Number(item.qty) / bomQty;

                        await addStock(connection, compProductId, 2, compQtySalvaged);
                    }

                    // 2. Crush WIP part -> Return resin back to Gudang Matkom (warehouse 1)
                    if (wipItem) {
                        const wipInputs = bomItems.filter(item => item.parent_item_id === wipItem.id);
                        let resinItem = null;
                        for (const item of wipInputs) {
                            const [pRows] = await connection.execute('SELECT id, product_unit FROM products WHERE product_code = ? LIMIT 1', [item.product_code]);
                            if (pRows.length === 0) continue;
                            const inputProductId = pRows[0].id;
                            const unit = pRows[0].product_unit || '';
                            
                            if (item.item_type === 'RAW' && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'g' || item.product_code.startsWith('EPPP'))) {
                                resinItem = {
                                    productId: inputProductId,
                                    qtyPerWip: Number(item.qty) / bomQty
                                };
                                break;
                            }
                        }

                        if (resinItem) {
                            const resinReturnedQty = scrapQty * resinItem.qtyPerWip;
                            await addStock(connection, resinItem.productId, 1, resinReturnedQty);
                            await connection.execute(
                                `INSERT INTO crusher_logs (production_output_id, component_product_id, qty_ng_component, qty_regrind_resin, action, created_at, updated_at)
                                 VALUES (?, ?, 0, ?, 'Crushed and Returned to Matkom (QC Scrap)', NOW(), NOW())`,
                                [id, resinItem.productId, resinReturnedQty]
                            );
                        }
                    }
                }
            }
            finalStatus = 'Rejected';
        }

        // Update production output status
        await connection.execute(
            `UPDATE production_outputs SET status = ?, updated_at = NOW() WHERE id = ?`,
            [finalStatus, id]
        );

        if (finalStatus === 'PENDING_REPAIR') {
            await connection.execute(
                `UPDATE planning_produksi SET status = 'Menunggu Perbaikan', updated_at = NOW() WHERE id = ?`,
                [prodOutput.pro_id]
            );
        }

        // Update planning_produksi actual_qty if OK qty has changed
        if (diffOk !== 0) {
            await connection.execute(
                `UPDATE planning_produksi SET actual_qty = actual_qty + ?, updated_at = NOW() WHERE id = ?`,
                [diffOk, prodOutput.pro_id]
            );
        }

        await connection.commit();
        return res.json({ success: true, message: `QC Verification completed successfully with status: ${finalStatus}` });

    } catch (error) {
        await connection.rollback();
        console.error('qcVerification Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.verifyMoldingDefect = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // production_output_id
        const { ng_type, notes } = req.body;

        // 1. Fetch production output
        const [poRows] = await connection.execute('SELECT * FROM production_outputs WHERE id = ?', [id]);
        if (poRows.length === 0) {
            return res.status(404).json({ message: 'Production Output not found' });
        }
        const prodOutput = poRows[0];

        // Update status of production output to Verified_QC
        await connection.execute(
            `UPDATE production_outputs 
             SET status = 'Verified_QC', ng_type = ?, notes = ?, updated_at = NOW() 
             WHERE id = ?`,
            [ng_type || prodOutput.ng_type, notes || prodOutput.notes, id]
        );

        // Find all related material_issuance_replacements and release them from PENDING_QC to PENDING
        await connection.execute(
            `UPDATE material_issuance_replacements 
             SET status = 'PENDING', updated_at = NOW() 
             WHERE production_output_id = ? AND status = 'PENDING_QC'`,
            [id]
        );

        await connection.commit();
        return res.json({ success: true, message: 'NG Molding verified successfully. Replacement tickets released.' });

    } catch (error) {
        await connection.rollback();
        console.error('verifyMoldingDefect Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.receiveFinishedGoods = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // production_output_id
        const { qty_received } = req.body;

        if (qty_received === undefined || isNaN(parseInt(qty_received)) || parseInt(qty_received) < 0) {
            return res.status(400).json({ message: 'Valid qty_received is required' });
        }

        const qtyReceived = parseInt(qty_received);

        // Fetch production output
        const [poRows] = await connection.execute('SELECT * FROM production_outputs WHERE id = ?', [id]);
        if (poRows.length === 0) {
            return res.status(404).json({ message: 'Production Output not found' });
        }
        const prodOutput = poRows[0];

        if (prodOutput.status !== 'Verified_QC') {
            return res.status(400).json({ message: 'Only Verified_QC production outputs can be received into Finished Goods' });
        }

        // Fetch product ID & code from PrO / Work Order
        const [proRows] = await connection.execute(`
            SELECT pro.product_id, pro.wo_id, wo.parent_product_id,
                   p.product_code as pro_product_code, wo_p.product_code as wo_product_code
            FROM planning_produksi pro
            LEFT JOIN products p ON pro.product_id = p.id
            LEFT JOIN work_orders wo ON pro.wo_id = wo.id
            LEFT JOIN products wo_p ON wo.parent_product_id = wo_p.id
            WHERE pro.id = ?`, [prodOutput.pro_id]);

        if (proRows.length === 0) {
            return res.status(404).json({ message: 'Associated Planning Produksi not found' });
        }
        
        const productId = proRows[0].product_id || proRows[0].parent_product_id;
        const finishedGoodCode = proRows[0].pro_product_code || proRows[0].wo_product_code;

        if (!productId) {
            return res.status(400).json({ message: 'Product ID not found on associated Work Order or Planning Produksi' });
        }

        // Calculate Finished Good unit cost based on BOM components' HPP in Gudang Produksi (WH=2)
        const unitCost = await calculateFinishedGoodBOMCost(connection, finishedGoodCode);

        // Find finished goods warehouse (WHFG)
        let whfgId = 3; // default fallback
        const [whfgRows] = await connection.execute(
            "SELECT id FROM warehouses WHERE code LIKE '%FG%' OR name LIKE '%Finished%' LIMIT 1"
        );
        if (whfgRows.length > 0) whfgId = whfgRows[0].id;

        // Deduct SFG stock from Gudang Produksi (warehouse_id = 2)
        await deductStock(connection, productId, 2, qtyReceived);

        // Increase global product quantity
        await connection.execute(
            `UPDATE products SET product_quantity = product_quantity + ? WHERE id = ?`,
            [qtyReceived, productId]
        );

        // Update warehouse stocks for WHFG
        const [stockRows] = await connection.execute(
            `SELECT id, qty_stock, hpp FROM warehouse_stocks 
             WHERE product_id = ? AND warehouse_id = ? AND supplier_id IS NULL`,
            [productId, whfgId]
        );

        if (stockRows.length > 0) {
            const qtyOld = Number(stockRows[0].qty_stock || 0);
            const hppOld = Number(stockRows[0].hpp || 0);
            let hppNew = hppOld;
            if (qtyOld + qtyReceived > 0) {
                hppNew = (qtyOld * hppOld + qtyReceived * unitCost) / (qtyOld + qtyReceived);
            }
            await connection.execute(
                `UPDATE warehouse_stocks SET qty_stock = qty_stock + ?, hpp = ?, updated_at = NOW() WHERE id = ?`,
                [qtyReceived, hppNew, stockRows[0].id]
            );
        } else {
            await connection.execute(
                `INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at)
                 VALUES (?, ?, NULL, ?, ?, NOW(), NOW())`,
                [productId, whfgId, qtyReceived, unitCost]
            );
        }

        // Update production output status to Received_FG and save actual received quantity
        await connection.execute(
            `UPDATE production_outputs SET status = 'Received_FG', qty_received = ?, updated_at = NOW() WHERE id = ?`,
            [qtyReceived, id]
        );

        // Check if Work Order target qty is completed, and if so, update status to 'Selesai'
        const woId = proRows[0].wo_id;
        if (woId) {
            const [woRows] = await connection.execute(
                'SELECT target_qty FROM work_orders WHERE id = ?',
                [woId]
            );
            if (woRows.length > 0) {
                const targetQty = Number(woRows[0].target_qty || 0);
                
                // Sum all qty_received for this work order
                const [sumRows] = await connection.execute(
                    `SELECT SUM(po.qty_received) as total_received
                     FROM production_outputs po
                     JOIN planning_produksi pro ON po.pro_id = pro.id
                     WHERE pro.wo_id = ? AND po.status = 'Received_FG'`,
                    [woId]
                );
                const totalReceived = Number(sumRows[0].total_received || 0);
                if (totalReceived >= targetQty) {
                    await connection.execute(
                        "UPDATE work_orders SET status = 'Selesai', updated_at = NOW() WHERE id = ?",
                        [woId]
                    );
                }
            }
        }

        await connection.commit();
        return res.json({ success: true, message: `Finished Goods received successfully: ${qtyReceived} Pcs` });

    } catch (error) {
        await connection.rollback();
        console.error('receiveFinishedGoods Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.getCrusherLogs = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT cl.*, p.product_name, p.product_code, pro.pro_code
            FROM crusher_logs cl
            LEFT JOIN products p ON cl.component_product_id = p.id
            JOIN production_outputs po ON cl.production_output_id = po.id
            JOIN planning_produksi pro ON po.pro_id = pro.id
            ORDER BY cl.id DESC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

async function calculateFinishedGoodBOMCost(connection, finishedGoodCode) {
    if (!finishedGoodCode) return 0;
    try {
        // 1. Find active BOM
        const [bomRows] = await connection.execute(
            'SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = "Aktif" LIMIT 1',
            [finishedGoodCode]
        );
        if (bomRows.length === 0) return 0;
        
        const bom = bomRows[0];
        const bomQty = Number(bom.finished_good_qty || 1);

        // 2. Fetch all items in this BOM
        const [items] = await connection.execute(
            'SELECT product_code, qty FROM bom_items WHERE bom_id = ?',
            [bom.id]
        );

        let totalMaterialCost = 0;
        for (const item of items) {
            // Find product ID & standard price fallback
            const [prodRows] = await connection.execute(
                'SELECT id, product_price FROM products WHERE product_code = ? LIMIT 1',
                [item.product_code]
            );
            if (prodRows.length > 0) {
                const productId = prodRows[0].id;
                // Get current HPP in Gudang Produksi (warehouse_id = 2)
                const [stockRows] = await connection.execute(
                    'SELECT hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = 2 LIMIT 1',
                    [productId]
                );
                const hppInProd = stockRows.length > 0 ? Number(stockRows[0].hpp || 0) : Number(prodRows[0].product_price || 0);
                totalMaterialCost += Number(item.qty || 0) * hppInProd;
            }
        }

        return bomQty > 0 ? (totalMaterialCost / bomQty) : 0;
    } catch (err) {
        console.error('Error in calculateFinishedGoodBOMCost:', err);
        return 0;
    }
}

exports.getReplacements = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT mir.*, 
                   p.product_name, p.product_code, p.product_unit,
                   wo.reference as wo_reference
            FROM material_issuance_replacements mir
            JOIN products p ON mir.product_id = p.id
            JOIN work_orders wo ON mir.wo_id = wo.id
            ORDER BY mir.id DESC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getVendorClaims = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT vc.*, 
                   p.product_name, p.product_code, p.product_unit,
                   po.qty_ng as parent_qty_ng,
                   pro.pro_code
            FROM vendor_claims vc
            JOIN products p ON vc.product_id = p.id
            JOIN production_outputs po ON vc.production_output_id = po.id
            JOIN planning_produksi pro ON po.pro_id = pro.id
            ORDER BY vc.id DESC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.shipReplacement = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params; // replacement ticket ID
        const { barcode, supplier_id } = req.body; // option for barcode verification and vendor selection

        // 1. Fetch replacement ticket
        const [replRows] = await connection.execute(
            'SELECT * FROM material_issuance_replacements WHERE id = ?',
            [id]
        );
        if (replRows.length === 0) {
            return res.status(404).json({ message: 'Replacement ticket not found' });
        }
        const ticket = replRows[0];

        if (ticket.status !== 'PENDING') {
            return res.status(400).json({ message: 'Ticket is already processed' });
        }

        // 2. Fetch product details
        const [pRows] = await connection.execute(
            'SELECT product_code FROM products WHERE id = ?',
            [ticket.product_id]
        );
        if (pRows.length === 0) {
            return res.status(400).json({ message: 'Product not found' });
        }
        const productCode = pRows[0].product_code;

        // 3. Optional Barcode Validation
        if (barcode) {
            const parts = barcode.split('|');
            if (parts.length < 3) {
                return res.status(400).json({ message: 'Invalid barcode format. Expected [Code]|[Lot]|[Qty]' });
            }
            const [scannedCode, , scannedQtyStr] = parts;
            const scannedQty = Number(scannedQtyStr) || 0;

            if (scannedCode.toUpperCase() !== productCode.toUpperCase()) {
                return res.status(400).json({ message: `Barcode mismatch. Scanned: ${scannedCode}, Expected: ${productCode}` });
            }
            if (scannedQty < Number(ticket.qty_requested)) {
                return res.status(400).json({ message: `Scanned quantity (${scannedQty}) is less than requested (${ticket.qty_requested})` });
            }
        }

        // Check if product has mapped suppliers
        const [suppliersForProduct] = await connection.execute(
            'SELECT id FROM product_suppliers WHERE product_id = ? LIMIT 1',
            [ticket.product_id]
        );
        const isMultiVendor = suppliersForProduct.length > 0;

        if (isMultiVendor && !supplier_id) {
            return res.status(400).json({ message: 'Product has multi-vendor mapped but no specific vendor was selected for replacement shipping.' });
        }
        const finalSupplierId = isMultiVendor ? Number(supplier_id) : null;

        // Fetch HPP of the vendor stock in MATKOM (warehouse 1)
        const [stockRows] = await connection.execute(
            `SELECT hpp FROM warehouse_stocks 
             WHERE product_id = ? AND warehouse_id = 1 
             AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL)) LIMIT 1`,
            [ticket.product_id, finalSupplierId, finalSupplierId]
        );
        const hppMatkom = stockRows.length > 0 ? Number(stockRows[0].hpp || 0) : 0;

        // 4. Deduct stock from MATKOM (WH 1) and Add stock to Gudang Produksi (WH 2)
        const qty = Number(ticket.qty_requested);
        await deductStock(connection, ticket.product_id, 1, qty, finalSupplierId);
        await addStock(connection, ticket.product_id, 2, qty, hppMatkom, null);

        // 5. Update previous material realization (material_issuance_details)
        const [issuanceRows] = await connection.execute(
            `SELECT id FROM material_issuances 
             WHERE work_order_id = ? AND status = 'Issued' 
             ORDER BY id DESC LIMIT 1`,
            [ticket.wo_id]
        );
        
        let targetIssuanceId = null;
        if (issuanceRows.length > 0) {
            targetIssuanceId = issuanceRows[0].id;
        } else {
            // fallback to any latest issuance for this WO if no 'Issued' one exists
            const [anyIssuanceRows] = await connection.execute(
                `SELECT id FROM material_issuances 
                 WHERE work_order_id = ? 
                 ORDER BY id DESC LIMIT 1`,
                [ticket.wo_id]
            );
            if (anyIssuanceRows.length > 0) {
                targetIssuanceId = anyIssuanceRows[0].id;
            }
        }

        if (targetIssuanceId) {
            // Check if details exist for this product and vendor
            const [detailRows] = await connection.execute(
                `SELECT id FROM material_issuance_details 
                 WHERE issuance_id = ? AND product_id = ? 
                 AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL)) LIMIT 1`,
                [targetIssuanceId, ticket.product_id, finalSupplierId, finalSupplierId]
            );

            if (detailRows.length > 0) {
                await connection.execute(
                    `UPDATE material_issuance_details 
                     SET qty_to_issue = qty_to_issue + ?, updated_at = NOW() 
                     WHERE id = ?`,
                    [qty, detailRows[0].id]
                );
            } else {
                await connection.execute(
                    `INSERT INTO material_issuance_details 
                        (issuance_id, product_id, supplier_id, qty_to_issue, created_at, updated_at) 
                     VALUES (?, ?, ?, ?, NOW(), NOW())`,
                    [targetIssuanceId, ticket.product_id, finalSupplierId, qty]
                );
            }

            // Also update work_order_materials.qty_issued
            await connection.execute(
                `UPDATE work_order_materials 
                 SET qty_issued = qty_issued + ?, updated_at = NOW() 
                 WHERE work_order_id = ? AND product_id = ?`,
                [qty, ticket.wo_id, ticket.product_id]
            );
        }

        // 6. Update ticket status to SHIPPED
        await connection.execute(
            "UPDATE material_issuance_replacements SET status = 'SHIPPED', updated_at = NOW() WHERE id = ?",
            [id]
        );

        await connection.commit();
        return res.json({ success: true, message: 'Replacement components shipped to production successfully' });

    } catch (error) {
        await connection.rollback();
        console.error('shipReplacement Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.getCustomerClaims = async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT cc.*, 
                   c.customer_name,
                   p.product_name, p.product_code, p.product_unit
            FROM customer_claims cc
            JOIN customers c ON cc.customer_id = c.id
            JOIN products p ON cc.product_id = p.id
            ORDER BY cc.id DESC
        `);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createCustomerClaim = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { customer_id, product_id, qty_claimed, claim_date, ng_type, notes } = req.body;

        if (!customer_id || !product_id || !qty_claimed || !claim_date) {
            return res.status(400).json({ message: 'Customer ID, Product ID, quantity, and date are required' });
        }

        const now = new Date();
        const year = now.getFullYear().toString().slice(-2);
        const month = String(now.getMonth()+1).padStart(2,'0');
        const prefix = `CLM/EPU/${year}/${month}/`;

        const [latest] = await connection.execute(
            'SELECT claim_code FROM customer_claims WHERE claim_code LIKE ? ORDER BY id DESC LIMIT 1',
            [`CLM/EPU/${year}/%`]
        );

        let sequence = 1;
        if (latest.length > 0) {
            const lastRef = latest[0].claim_code;
            const parts = lastRef.split('/');
            const lastSeqStr = parts[parts.length - 1];
            if (lastSeqStr && !isNaN(parseInt(lastSeqStr))) {
                sequence = parseInt(lastSeqStr) + 1;
            }
        }
        const claimCode = `${prefix}${String(sequence).padStart(4, '0')}`;

        await connection.execute(
            `INSERT INTO customer_claims 
                (claim_code, customer_id, product_id, qty_claimed, claim_date, ng_type, notes, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`,
            [claimCode, customer_id, product_id, qty_claimed, claim_date, ng_type || null, notes || null]
        );

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Customer claim logged successfully',
            claim_code: claimCode
        });
    } catch (error) {
        await connection.rollback();
        console.error('createCustomerClaim Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateCustomerClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const [rows] = await db.execute('SELECT id FROM customer_claims WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Customer claim not found' });
        }

        await db.execute('UPDATE customer_claims SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
        return res.json({ success: true, message: 'Customer claim status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateVendorClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: 'Status is required' });
        }

        const [rows] = await db.execute('SELECT id FROM vendor_claims WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Vendor claim not found' });
        }

        await db.execute('UPDATE vendor_claims SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
        return res.json({ success: true, message: 'Vendor claim status updated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deletePlanningProduksi = async (req, res) => {
    const { id } = req.params;
    try {
        const [outputs] = await db.execute('SELECT id FROM production_outputs WHERE pro_id = ? LIMIT 1', [id]);
        if (outputs.length > 0) {
            return res.status(400).json({ success: false, message: 'Tidak dapat menghapus rencana produksi yang sudah memiliki realisasi output/hasil produksi.' });
        }
        await db.execute('DELETE FROM planning_produksi WHERE id = ?', [id]);
        return res.json({ success: true, message: 'Rencana produksi (MPP) berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ============================================
// Customer Claim Investigation
// ============================================

// GET /api/manufacturing/customer-claims/:id/investigation
exports.getClaimInvestigation = async (req, res) => {
    try {
        const { id } = req.params;
        const [claimRows] = await db.execute(`
            SELECT cc.*, 
                   c.customer_name,
                   p.product_name, p.product_code, p.product_unit, p.product_type
            FROM customer_claims cc
            JOIN customers c ON cc.customer_id = c.id
            JOIN products p ON cc.product_id = p.id
            WHERE cc.id = ?
        `, [id]);

        if (claimRows.length === 0) {
            return res.status(404).json({ message: 'Customer claim tidak ditemukan.' });
        }

        // Get investigation items
        const [items] = await db.execute(`
            SELECT ci.*, 
                   p.product_name, p.product_code, p.product_unit, p.product_type,
                   w.name as destination_warehouse_name
            FROM claim_investigation_items ci
            JOIN products p ON ci.product_id = p.id
            LEFT JOIN warehouses w ON ci.destination_warehouse_id = w.id
            WHERE ci.customer_claim_id = ?
            ORDER BY ci.item_type ASC, ci.id ASC
        `, [id]);

        const claim = claimRows[0];
        claim.investigation_items = items;

        return res.json({ success: true, data: serialize(claim) });
    } catch (error) {
        console.error('getClaimInvestigation Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// POST /api/manufacturing/customer-claims/:id/investigate — Mulai investigasi
exports.startClaimInvestigation = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [claimRows] = await connection.execute('SELECT * FROM customer_claims WHERE id = ?', [id]);
        if (claimRows.length === 0) {
            return res.status(404).json({ message: 'Customer claim tidak ditemukan.' });
        }

        // Update status to In_Progress
        await connection.execute(
            'UPDATE customer_claims SET investigation_status = "In_Progress", investigated_by = ?, updated_at = NOW() WHERE id = ?',
            [req.user?.name || req.user?.username || 'System', id]
        );

        await connection.commit();
        return res.json({ success: true, message: 'Investigasi claim dimulai.' });
    } catch (error) {
        await connection.rollback();
        console.error('startClaimInvestigation Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// POST /api/manufacturing/customer-claims/:id/sort-items — Sortir item claim (WIP vs Komponen)
exports.sortClaimItems = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;
        const { items } = req.body;
        // items = [ { product_id, item_type (WIP/Component/Raw_Material), qty_inspected, qty_ok, qty_ng, ng_action, notes } ]

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Harap isi data item yang disortir.' });
        }

        const [claimRows] = await connection.execute('SELECT * FROM customer_claims WHERE id = ?', [id]);
        if (claimRows.length === 0) {
            return res.status(404).json({ message: 'Customer claim tidak ditemukan.' });
        }

        // Delete existing items (re-sort)
        await connection.execute('DELETE FROM claim_investigation_items WHERE customer_claim_id = ?', [id]);

        let totalOk = 0;
        let totalNg = 0;

        for (const item of items) {
            const { product_id, item_type, qty_inspected, qty_ok, qty_ng, ng_action, destination_warehouse_id, notes } = item;

            await connection.execute(`
                INSERT INTO claim_investigation_items 
                (customer_claim_id, product_id, item_type, qty_inspected, qty_ok, qty_ng, ng_action, destination_warehouse_id, notes, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                id, product_id, item_type || 'WIP',
                qty_inspected || 0, qty_ok || 0, qty_ng || 0,
                ng_action || null, destination_warehouse_id || null, notes || null
            ]);

            totalOk += (qty_ok || 0);
            totalNg += (qty_ng || 0);
        }

        // Update claim totals
        await connection.execute(
            'UPDATE customer_claims SET qty_ok = ?, qty_ng = ?, investigation_status = "In_Progress", updated_at = NOW() WHERE id = ?',
            [totalOk, totalNg, id]
        );

        await connection.commit();
        return res.json({ success: true, message: `Sortir berhasil: ${totalOk} OK, ${totalNg} NG dari ${items.length} item.` });
    } catch (error) {
        await connection.rollback();
        console.error('sortClaimItems Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

// POST /api/manufacturing/customer-claims/:id/complete — Selesaikan investigasi & proses stok
exports.completeClaimInvestigation = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { id } = req.params;

        const [claimRows] = await connection.execute('SELECT * FROM customer_claims WHERE id = ?', [id]);
        if (claimRows.length === 0) {
            return res.status(404).json({ message: 'Customer claim tidak ditemukan.' });
        }

        const [items] = await connection.execute('SELECT * FROM claim_investigation_items WHERE customer_claim_id = ?', [id]);
        if (items.length === 0) {
            return res.status(400).json({ message: 'Belum ada data sortir item. Lakukan sortir terlebih dahulu.' });
        }

        // Helper function for stock adjustment
        const adjustStock = async (productId, warehouseId, qty, condition = 'OK', supplierId = null) => {
            const qtyVal = Number(qty);
            if (qtyVal === 0) return;

            let wsQuery = 'SELECT id, qty_stock FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = ? AND stock_condition = ?';
            let wsParams = [productId, warehouseId, condition];
            if (supplierId !== null) {
                wsQuery += ' AND supplier_id = ?';
                wsParams.push(supplierId);
            } else {
                wsQuery += ' AND (supplier_id IS NULL OR supplier_id = 0)';
            }

            const [wsRows] = await connection.execute(wsQuery, wsParams);
            if (wsRows.length > 0) {
                await connection.execute(
                    'UPDATE warehouse_stocks SET qty_stock = GREATEST(0, qty_stock + ?), updated_at = NOW() WHERE id = ?',
                    [qtyVal, wsRows[0].id]
                );
            } else if (qtyVal > 0) {
                await connection.execute(
                    'INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, stock_condition, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
                    [productId, warehouseId, supplierId, Math.max(0, qtyVal), condition]
                );
            }

            // Update product_locations
            const [locRows] = await connection.execute(
                'SELECT id, stock FROM product_locations WHERE product_id = ? AND warehouse_id = ?',
                [productId, warehouseId]
            );
            if (locRows.length > 0) {
                await connection.execute(
                    'UPDATE product_locations SET stock = GREATEST(0, stock + ?), updated_at = NOW() WHERE id = ?',
                    [qtyVal, locRows[0].id]
                );
            } else if (qtyVal > 0) {
                await connection.execute(
                    'INSERT INTO product_locations (product_id, warehouse_id, aisle, stock, created_at, updated_at) VALUES (?, ?, "A1", ?, NOW(), NOW())',
                    [productId, warehouseId, Math.max(0, qtyVal)]
                );
            }

            await connection.execute(
                'UPDATE products SET product_quantity = (SELECT COALESCE(SUM(qty_stock), 0) FROM warehouse_stocks WHERE product_id = ?), updated_at = NOW() WHERE id = ?',
                [productId, productId]
            );
        };

        // Process each item
        for (const item of items) {
            // OK items: return to appropriate warehouse as normal stock
            if (item.qty_ok > 0) {
                const destWarehouse = item.destination_warehouse_id || (item.item_type === 'WIP' ? 3 : 1);
                // Remove from quarantine in FG (warehouse 3)
                await adjustStock(item.product_id, 3, -item.qty_ok, 'Quarantine');
                // Add to destination warehouse as OK stock
                await adjustStock(item.product_id, destWarehouse, item.qty_ok, 'OK');
            }

            // NG items: process based on ng_action
            if (item.qty_ng > 0 && item.ng_action) {
                if (item.ng_action === 'Return_To_Stock') {
                    // Move from quarantine to NG stock in MATKOM
                    await adjustStock(item.product_id, 3, -item.qty_ng, 'Quarantine');
                    await adjustStock(item.product_id, 1, item.qty_ng, 'NG');
                }
                // Crusher and Disposal will be handled via the ng-disposals API separately
                // Just mark the quarantine stock as ready for action
            }
        }

        // Update claim status
        await connection.execute(
            'UPDATE customer_claims SET investigation_status = "Completed", status = "INVESTIGATED", updated_at = NOW() WHERE id = ?',
            [id]
        );

        await connection.commit();
        return res.json({ success: true, message: 'Investigasi claim selesai. Stok telah diperbarui.' });
    } catch (error) {
        await connection.rollback();
        console.error('completeClaimInvestigation Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
