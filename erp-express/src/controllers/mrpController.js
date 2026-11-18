const db = require('../config/db');
const approvalService = require('../services/approvalService');

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

// Generate reference code for MRP
async function generateMRPReference(connection) {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `MRP/EPU/${year}/${month}/`;
    const globalYearPrefix = `MRP/EPU/${year}/%`;

    const [latest] = await connection.execute(
        'SELECT reference_code FROM mrps WHERE reference_code LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );

    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference_code;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

// Generate reference code for PR
async function generatePRReference(connection, departmentId, type = 'PR') {
    let deptCode = 'PPIC';
    if (departmentId) {
        const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length > 0 && depts[0].department_code) deptCode = depts[0].department_code;
    }
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    
    const prefix = `${type}/${deptCode}-EPU/${year}/${month}/`;
    const globalYearPrefix = `${type}/%/${year}/%`;
    
    const [latest] = await connection.execute(
        'SELECT reference FROM purchases WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

exports.getMRPs = async (req, res) => {
    try {
        const { search } = req.query;
        let query = `
            SELECT mrp.*, 
                   cp.no_po_customer, cp.reference as po_reference,
                   f.reference as forecast_reference,
                   COALESCE(w.name, 'Gudang Material') as warehouse_name,
                   COALESCE(c1.customer_name, c2.customer_name, '-') as customer_name
            FROM mrps mrp
            LEFT JOIN customer_po cp ON mrp.po_customer_id = cp.id
            LEFT JOIN customer_forecasts f ON mrp.forecast_id = f.id
            LEFT JOIN customers c1 ON cp.customer_id = c1.id
            LEFT JOIN customers c2 ON f.customer_id = c2.id
            LEFT JOIN warehouses w ON COALESCE(mrp.warehouse_id, f.warehouse_id) = w.id
        `;
        let params = [];
        if (search) {
            query += ' WHERE mrp.reference_code LIKE ? OR cp.no_po_customer LIKE ? OR f.reference LIKE ? OR mrp.planner_name LIKE ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ' ORDER BY mrp.id DESC';
        const [rows] = await db.query(query, params);
        return res.json({ success: true, data: serialize(rows) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getMRPDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const [mrpRows] = await db.execute(`
            SELECT mrp.*, 
                   cp.no_po_customer, cp.reference as po_reference,
                   f.reference as forecast_reference,
                   COALESCE(w.name, 'Gudang Material') as warehouse_name,
                   COALESCE(c1.customer_name, c2.customer_name, '-') as customer_name
            FROM mrps mrp
            LEFT JOIN customer_po cp ON mrp.po_customer_id = cp.id
            LEFT JOIN customer_forecasts f ON mrp.forecast_id = f.id
            LEFT JOIN customers c1 ON cp.customer_id = c1.id
            LEFT JOIN customers c2 ON f.customer_id = c2.id
            LEFT JOIN warehouses w ON COALESCE(mrp.warehouse_id, f.warehouse_id) = w.id
            WHERE mrp.id = ?`, [id]);
        
        if (mrpRows.length === 0) return res.status(404).json({ message: 'MRP not found' });
        const mrp = mrpRows[0];

        // Fetch detail items with breakdown info and supplier resolution
        const [details] = await db.execute(`
            SELECT md.*, 
                   p.product_name, p.product_code, p.product_unit, p.supplier_id as default_supplier_id,
                   COALESCE(NULLIF(md.unit_price, 0), p.product_price, 0) as product_price,
                   COALESCE(md.supplier_id, p.supplier_id) as final_supplier_id,
                   s.supplier_name, s.supplier_code
            FROM mrp_details md
            JOIN products p ON md.product_id = p.id
            LEFT JOIN suppliers s ON COALESCE(md.supplier_id, p.supplier_id) = s.id
            WHERE md.mrp_id = ?
            ORDER BY md.product_id ASC, md.id ASC`, [id]);

        // If this MRP is a revision (has parent_mrp_id), fetch parent details for MRP 1 comparison
        let parentDetailsMap = {};
        if (mrp.parent_mrp_id) {
            const [parentDetails] = await db.execute(`
                SELECT product_id, supplier_id, mrp_qty, ord_qty, qty_released_pr, release_draft_percent
                FROM mrp_details
                WHERE mrp_id = ?`, [mrp.parent_mrp_id]);
            for (const pd of parentDetails) {
                const keyWithSup = `${pd.product_id}_${pd.supplier_id || 0}`;
                const keyProd = `${pd.product_id}`;
                parentDetailsMap[keyWithSup] = pd;
                if (!parentDetailsMap[keyProd]) {
                    parentDetailsMap[keyProd] = pd;
                }
            }
        }

        // Attach multi-supplier list from product_suppliers for each detail item
        for (const item of details) {
            const rawAlloc = Number(item.allocation_percent);
            item.allocation_percent = (rawAlloc > 0 && rawAlloc <= 1) ? Math.round(rawAlloc * 100) : (rawAlloc !== undefined && rawAlloc !== null && !isNaN(rawAlloc) ? Number(rawAlloc) : 100);

            const keyWithSup = `${item.product_id}_${item.supplier_id || 0}`;
            const keyProd = `${item.product_id}`;
            const parentDetail = parentDetailsMap[keyWithSup] || parentDetailsMap[keyProd];
            if (parentDetail) {
                item.mrp1_qty = Number(parentDetail.mrp_qty || parentDetail.ord_qty || 0);
                item.mrp1_released_pr = Number(parentDetail.qty_released_pr || 0);
                item.release_draft_percent_1 = Number(parentDetail.release_draft_percent ?? 100);
            } else {
                item.mrp1_qty = Number(item.mrp_qty || item.ord_qty || 0);
                item.mrp1_released_pr = Number(item.qty_released_pr || 0);
                item.release_draft_percent_1 = Number(item.release_draft_percent ?? 100);
            }

            const [multiSups] = await db.execute(`
                SELECT ps.supplier_id, ps.supplier_part_number, ps.purchase_price, ps.allocation_percent, ps.pcs_per_pack, ps.is_primary, s.supplier_name, s.supplier_code
                FROM product_suppliers ps
                JOIN suppliers s ON ps.supplier_id = s.id
                WHERE ps.product_id = ?
                ORDER BY ps.is_primary DESC, ps.id ASC`, [item.product_id]);
            
            if (Array.isArray(multiSups)) {
                for (const ms of multiSups) {
                    const rawP = Number(ms.allocation_percent);
                    ms.allocation_percent = (rawP > 0 && rawP <= 1) ? Math.round(rawP * 100) : (rawP || 100);
                }
            }
            item.available_suppliers = multiSups || [];
        }

        // --- Cycle Chain & Summary Matrix (MRP 1, MRP 2 / Revisi, & Consolidated) ---
        let rootMrpId = mrp.parent_mrp_id || mrp.id;
        // Find all MRPs belonging to the same chain/cycle
        const [cycleMrpRows] = await db.execute(`
            SELECT id, reference_code, revision_number, parent_mrp_id, status, time_frame_start, time_frame_end, total_est_cost, created_at
            FROM mrps 
            WHERE id = ? OR parent_mrp_id = ? OR id = ?
            ORDER BY COALESCE(revision_number, 0) ASC, id ASC`,
            [rootMrpId, rootMrpId, mrp.parent_mrp_id || 0]
        );

        // Deduplicate cycle MRPs
        const uniqueCycleMap = new Map();
        for (const cm of cycleMrpRows) {
            uniqueCycleMap.set(cm.id.toString(), cm);
        }
        const cycle_mrps = Array.from(uniqueCycleMap.values());

        // Fetch details of all cycle MRPs to build consolidated summary
        let cycle_summary = [];
        if (cycle_mrps.length > 0) {
            const cycleIds = cycle_mrps.map(cm => cm.id);
            const [allCycleDetails] = await db.query(`
                SELECT md.*, p.product_code, p.product_name, p.product_unit, s.supplier_name
                FROM mrp_details md
                JOIN products p ON md.product_id = p.id
                LEFT JOIN suppliers s ON md.supplier_id = s.id
                WHERE md.mrp_id IN (?)
                ORDER BY p.product_code ASC, md.mrp_id ASC`,
                [cycleIds]
            );

            // Group by product_code
            const groupedProducts = {};
            for (const cd of allCycleDetails) {
                const pCode = cd.product_code || `P-${cd.product_id}`;
                if (!groupedProducts[pCode]) {
                    groupedProducts[pCode] = {
                        product_id: cd.product_id,
                        product_code: pCode,
                        product_name: cd.product_name,
                        product_unit: cd.product_unit,
                        class_type: cd.class_type,
                        unit_price: Number(cd.unit_price || 0),
                        mrp_breakdown: {}, // { [mrp_id]: { mrp_qty, qty_released_pr, sisa_qty, amount } }
                        total_mrp_qty: 0,
                        total_released_pr: 0,
                        total_sisa_qty: 0,
                        total_amount: 0
                    };
                }
                const ordQty = Number(cd.ord_qty || cd.mrp_qty || cd.net_qty || 0);
                const prPercent = Number(cd.release_draft_percent ?? 100);
                const relQty = Math.ceil(ordQty * (prPercent / 100));
                const sisaQty = Math.max(0, ordQty - relQty);
                const amt = Number(cd.amount || cd.subtotal_cost || 0);

                const mrpKey = cd.mrp_id.toString();
                if (!groupedProducts[pCode].mrp_breakdown[mrpKey]) {
                    groupedProducts[pCode].mrp_breakdown[mrpKey] = {
                        mrp_qty: 0,
                        qty_released_pr: 0,
                        sisa_qty: 0,
                        amount: 0,
                        supplier_name: cd.supplier_name
                    };
                }

                groupedProducts[pCode].mrp_breakdown[mrpKey].mrp_qty += ordQty;
                groupedProducts[pCode].mrp_breakdown[mrpKey].qty_released_pr += relQty;
                groupedProducts[pCode].mrp_breakdown[mrpKey].sisa_qty += sisaQty;
                groupedProducts[pCode].mrp_breakdown[mrpKey].amount += amt;

                groupedProducts[pCode].total_mrp_qty += ordQty;
                groupedProducts[pCode].total_released_pr += relQty;
                groupedProducts[pCode].total_sisa_qty += sisaQty;
                groupedProducts[pCode].total_amount += amt;
            }

            cycle_summary = Object.values(groupedProducts).map(gp => ({
                ...gp,
                progress_percent: gp.total_mrp_qty > 0 ? Math.min(100, Math.round((gp.total_released_pr / gp.total_mrp_qty) * 100)) : 0
            }));
        }

        return res.json({
            success: true,
            data: serialize({
                ...mrp,
                details,
                cycle_mrps,
                cycle_summary
            })
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.generateMRP = async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const { 
            planning_source = 'PO Customer',
            po_customer_id, 
            forecast_id,
            warehouse_id,
            planner_name,
            safety_stock_percent = 0,
            scrap_loss_percent = 0,
            time_frame_start, 
            time_frame_end,
            carry_over_from_mrp_id,
            note 
        } = req.body;

        let targetItems = [];

        // When carry-over mode, skip PO/Forecast document requirement
        if (!carry_over_from_mrp_id) {
            if (planning_source === 'Manual FG Entry' || (req.body.manual_fg_items && req.body.manual_fg_items.length > 0)) {
                const fgItems = req.body.manual_fg_items || [];
                targetItems = fgItems.map(it => ({
                    product_id: it.product_id,
                    product_code: it.product_code,
                    po_qty: Number(it.qty || it.po_qty || 0)
                })).filter(it => it.po_qty > 0);

                if (targetItems.length === 0) {
                    return res.status(400).json({ message: 'Input Manual Finished Goods minimal memiliki 1 produk dengan kuantiti > 0.' });
                }
            } else if (planning_source === 'Sales Forecast') {
                const fcIds = req.body.forecast_ids || (forecast_id ? [forecast_id] : []);
                if (fcIds.length === 0) {
                    return res.status(400).json({ message: 'Pilih Dokumen Customer Forecast terlebih dahulu.' });
                }
                const [fcDetails] = await connection.query(
                    'SELECT product_id, product_code, SUM(forecast_qty) as po_qty FROM customer_forecast_details WHERE forecast_id IN (?) AND forecast_qty > 0 GROUP BY product_id, product_code',
                    [fcIds]
                );
                targetItems = fcDetails;
            } else {
                // Default: PO Customer
                const poIds = req.body.po_customer_ids || (po_customer_id ? [po_customer_id] : []);
                if (poIds.length === 0) {
                    return res.status(400).json({ message: 'Pilih Dokumen PO Customer terlebih dahulu.' });
                }
                const [poDetails] = await connection.query(
                    'SELECT product_id, product_code, SUM(po_qty) as po_qty FROM customer_po_details WHERE po_id IN (?) AND po_qty > 0 GROUP BY product_id, product_code',
                    [poIds]
                );
                targetItems = poDetails;
            }

            if (targetItems.length === 0) {
                return res.status(400).json({ message: 'Dokumen sumber tidak memiliki item produk aktif.' });
            }
        } else {
            // For carry-over, optionally load PO/Forecast if provided (for header reference)
            if (forecast_id) {
                const [fcRows] = await connection.execute('SELECT * FROM customer_forecasts WHERE id = ?', [forecast_id]);
                // Just for header reference, no error if not found
            }
            if (po_customer_id) {
                const [poRows] = await connection.execute('SELECT * FROM customer_po WHERE id = ?', [po_customer_id]);
            }
        }

        const safetyPct = Number(safety_stock_percent) || 0;
        const scrapPct = Number(scrap_loss_percent) || 0;

        const referenceCode = await generateMRPReference(connection);
        const tfStart = time_frame_start || new Date().toISOString().split('T')[0];
        const tfEnd = time_frame_end || new Date().toISOString().split('T')[0];

        let headerGrossQty = 0;
        let headerNetQty = 0;
        let headerEstCost = 0;
        const detailRowsToInsert = [];

        // Helper: MRP formula = Math.ceil(ORD / pcsPerPack) * pcsPerPack
        const calcMrpQty = (ord, pcsPerPack) => {
            const qty = Math.max(0, Number(ord) || 0);
            if (qty === 0) return 0;
            const pack = Math.max(1, Math.round(Number(pcsPerPack) || 1));
            if (pack <= 1) return Math.ceil(qty);
            return Math.ceil(qty / pack) * pack;
        };

        // =====================================================================
        // CARRY-OVER MODE: Copy items from parent MRP, recalculate with live data
        // =====================================================================
        if (carry_over_from_mrp_id) {
            // 0. Fetch parent MRP header info
            const [parentMrpRows] = await connection.execute(
                'SELECT po_customer_id, forecast_id, planning_source FROM mrps WHERE id = ?',
                [carry_over_from_mrp_id]
            );
            const parentMrpInfo = parentMrpRows[0] || {};
            const parentPoId = po_customer_id || parentMrpInfo.po_customer_id;
            const parentFcId = forecast_id || parentMrpInfo.forecast_id;
            const parentPlanSource = parentMrpInfo.planning_source || planning_source;

            // Calculate updated BOM physical requirements if PO/Forecast is updated
            let updatedBOMNeedMap = {};
            let liveTargetItems = [];
            if (parentPlanSource === 'Sales Forecast' && parentFcId) {
                const [fcDetails] = await connection.execute(
                    'SELECT product_id, product_code, forecast_qty as po_qty FROM customer_forecast_details WHERE forecast_id = ?',
                    [parentFcId]
                );
                liveTargetItems = fcDetails;
            } else if (parentPoId) {
                const [poDetails] = await connection.execute(
                    'SELECT product_id, product_code, po_qty FROM customer_po_details WHERE po_id = ? AND po_qty > 0',
                    [parentPoId]
                );
                liveTargetItems = poDetails;
            }

            if (liveTargetItems.length > 0) {
                for (const item of liveTargetItems) {
                    const [bomRows] = await connection.execute(
                        "SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = 'Aktif' LIMIT 1",
                        [item.product_code]
                    );
                    if (bomRows.length > 0) {
                        const fgQty = Number(bomRows[0].finished_good_qty) || 1;
                        const [bomItems] = await connection.execute(
                            "SELECT product_code, qty FROM bom_items WHERE bom_id = ?",
                            [bomRows[0].id]
                        );
                        for (const bItem of bomItems) {
                            const [pRows] = await connection.execute(
                                'SELECT id FROM products WHERE product_code = ? LIMIT 1',
                                [bItem.product_code]
                            );
                            if (pRows.length > 0) {
                                const pid = pRows[0].id;
                                const gross = Math.ceil((Number(item.po_qty) / fgQty) * Number(bItem.qty) * (1 + scrapPct / 100));
                                updatedBOMNeedMap[pid] = (updatedBOMNeedMap[pid] || 0) + gross;
                            }
                        }
                    }
                }
            }

            // 1. Fetch ALL parent MRP detail items (these define the item list for MRP 2)
            const [parentDetails] = await connection.execute(`
                SELECT md.*, p.product_code, p.product_name, p.product_unit, p.product_price, p.min_qty,
                       p.supplier_id as default_supplier_id,
                       cat.category_name
                FROM mrp_details md
                JOIN products p ON md.product_id = p.id
                LEFT JOIN categories cat ON p.category_id = cat.id
                WHERE md.mrp_id = ?
                ORDER BY md.id ASC`, [carry_over_from_mrp_id]);

            if (parentDetails.length === 0) {
                return res.status(400).json({ message: 'Dokumen MRP induk tidak memiliki item.' });
            }

            // 2. For each parent item, recalculate with live stock data and updated PO demand
            for (const parent of parentDetails) {
                const productId = parent.product_id;
                const parentNeedAll = Number(parent.need_all_qty || parent.gross_qty || 0);
                const parentMrpQty = Number(parent.mrp_qty || parent.ord_qty || 0);
                const parentReleasedPR = Number(parent.qty_released_pr || 0);
                const parentReleaseDraftPercent = Number(parent.release_draft_percent || 100);

                // Use updated need_all from BOM explosion if available, otherwise use parentNeedAll
                const needAllToUse = updatedBOMNeedMap[productId] !== undefined ? updatedBOMNeedMap[productId] : parentNeedAll;

                // Safety stock qty (Stock Std) = (Need All / Working Days (19)) * Buffer Level (1.1)
                let safetyQty = 0;
                if (safetyPct > 0) {
                    safetyQty = Math.ceil(needAllToUse * (safetyPct / 100));
                } else {
                    const workingDays = 19;
                    const bufferLevel = 1.1;
                    safetyQty = Math.ceil((needAllToUse / workingDays) * bufferLevel);
                }
                const stockStdToUse = safetyQty;

                // Actual stock (STO / Physical Warehouse Stock) - Always query live actual stock
                let stockQuery = 'SELECT COALESCE(SUM(qty_stock), 0) as current_stock FROM warehouse_stocks WHERE product_id = ?';
                const stockParams = [productId];
                if (warehouse_id) {
                    stockQuery += ' AND warehouse_id = ?';
                    stockParams.push(warehouse_id);
                }
                const [stockInfo] = await connection.execute(stockQuery, stockParams);
                let liveStock = stockInfo.length > 0 ? Number(stockInfo[0].current_stock || 0) : 0;
                if (liveStock === 0) {
                    const [prodStock] = await connection.execute('SELECT product_quantity FROM products WHERE id = ?', [productId]);
                    if (prodStock.length > 0) {
                        liveStock = Number(prodStock[0].product_quantity || 0);
                    }
                }
                const stoToUse = liveStock;

                // On-Order Qty (Pending PR/PO)
                const [orderInfo] = await connection.execute(
                    `SELECT COALESCE(SUM(pd.quantity), 0) as on_order
                     FROM purchase_details pd
                     JOIN purchases p ON pd.purchase_id = p.id
                     WHERE pd.product_id = ? AND p.status IN ('Pending', 'Approved')`,
                    [productId]
                );
                const onOrderQty = orderInfo.length > 0 ? Number(orderInfo[0].on_order || 0) : 0;

                // Net Requirement for carry-over: Need All + Stock Std - STO
                let netQty = Math.max(0, Math.ceil(needAllToUse + stockStdToUse - stoToUse - onOrderQty));

                // ORD for carry-over = Net Requirement Baru minus PR 1 Released Qty
                let ordQty = Math.max(0, netQty - parentReleasedPR);

                // Fallback: if parent had remaining unreleased MRP qty, ensure we at least account for unreleased
                const remainingUnreleased = Math.max(0, parentMrpQty - parentReleasedPR);
                if (ordQty === 0 && remainingUnreleased > 0 && needAllToUse >= parentNeedAll) {
                    ordQty = remainingUnreleased;
                }

                const pcsPerPack = Number(parent.pcs_per_pack || 1) || 1;
                const mrpQtyCalc = calcMrpQty(ordQty, pcsPerPack);
                const unitPrice = Number(parent.unit_price || parent.product_price || 0);
                const subtotal = mrpQtyCalc * unitPrice;

                headerGrossQty += needAllToUse;
                headerNetQty += netQty;
                headerEstCost += subtotal;

                const carryOverRemark = ordQty > 0
                    ? `Termasuk carry-over ${Math.max(0, parentMrpQty - parentReleasedPR)} pcs dari MRP#${carry_over_from_mrp_id}`
                    : null;

                detailRowsToInsert.push({
                    productId,
                    classType: parent.class_type || 'Component',
                    sourceType: parent.source_type || 'Buy',
                    needAllQty: needAllToUse,
                    stockStdQty: stockStdToUse,
                    stoQty: stoToUse,
                    grossQty: needAllToUse,
                    safetyStockQty: stockStdToUse,
                    currentStock: stoToUse,
                    onOrderQty,
                    qtyRequired: ordQty,
                    netQty: ordQty,
                    unitPrice,
                    subtotalCost: subtotal,
                    bomRef: parent.bom_ref || null,
                    supplierId: parent.supplier_id || parent.default_supplier_id || null,
                    partNoVendor: parent.part_no_vendor || parent.product_code,
                    partNameVendor: parent.part_name_vendor || parent.product_name,
                    ordQty,
                    mrpQty: mrpQtyCalc,
                    amount: subtotal,
                    allocationPercent: Number(parent.allocation_percent || 100),
                    remark: carryOverRemark,
                    releaseDraftPercent: parentReleaseDraftPercent
                });
            }

        } else {
            // =====================================================================
            // NORMAL MODE: BOM Explosion from PO Customer / Sales Forecast
            // =====================================================================
            const requirementsMap = {};

            // BOM Explosion (Phase 1 Physical Needs)
            for (const item of targetItems) {
                const [bomRows] = await connection.execute(
                    "SELECT id, bom_code, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = 'Aktif' LIMIT 1",
                    [item.product_code]
                );

                if (bomRows.length > 0) {
                    const bom = bomRows[0];
                    const bomId = bom.id;
                    const fgQty = Number(bom.finished_good_qty) || 1;
                    const bomRefStr = bom.bom_code || `BOM-${item.product_code}`;

                    const [bomItems] = await connection.execute(
                        "SELECT product_code, qty, item_type FROM bom_items WHERE bom_id = ?",
                        [bomId]
                    );

                    for (const bomItem of bomItems) {
                        const [pRows] = await connection.execute(
                            `SELECT p.id, p.product_name, p.product_code, p.product_unit, p.product_price, p.min_qty, p.supplier_id,
                                    cat.category_name
                             FROM products p
                             LEFT JOIN categories cat ON p.category_id = cat.id
                             WHERE p.product_code = ? LIMIT 1`,
                            [bomItem.product_code]
                        );

                        if (pRows.length > 0) {
                            const rawProd = pRows[0];
                            const rawProductId = rawProd.id;
                            const qtyRequiredPerFG = Number(bomItem.qty);
                            
                            // Gross Req = (orderQty / fgQty) * bom_qty * (1 + scrapPct/100)
                            const baseGross = (Number(item.po_qty) / fgQty) * qtyRequiredPerFG;
                            const grossWithScrap = Math.ceil(baseGross * (1 + scrapPct / 100));

                            let classType = 'Component';
                            const catLower = (rawProd.category_name || '').toLowerCase();
                            if (catLower.includes('raw') || bomItem.item_type === 'RAW') classType = 'Raw Material';
                            else if (catLower.includes('pack') || catLower.includes('box')) classType = 'Packaging';
                            else if (catLower.includes('consumable')) classType = 'Consumable';

                            if (!requirementsMap[rawProductId]) {
                                requirementsMap[rawProductId] = {
                                    productId: rawProductId,
                                    productCode: rawProd.product_code,
                                    productName: rawProd.product_name,
                                    productUnit: rawProd.product_unit || 'PCS',
                                    classType,
                                    sourceType: 'Buy',
                                    grossQty: 0,
                                    bomRef: bomRefStr,
                                    unitPrice: Number(rawProd.product_price) || 0,
                                    minQty: Number(rawProd.min_qty) || 0,
                                    supplierId: rawProd.supplier_id || null
                                };
                            }
                            requirementsMap[rawProductId].grossQty += grossWithScrap;
                        }
                    }
                }
            }

            if (Object.keys(requirementsMap).length === 0) {
                return res.status(400).json({ message: 'Tidak ditemukan BOM bahan baku untuk produk jadi yang diorder.' });
            }

            for (const [productId, req] of Object.entries(requirementsMap)) {
                const needAllToUse = Number(req.grossQty || 0);

                // Safety stock qty (Stock Std)
                let safetyQty = 0;
                if (safetyPct > 0) {
                    safetyQty = Math.ceil(needAllToUse * (safetyPct / 100));
                } else {
                    const workingDays = 19;
                    const bufferLevel = 1.1;
                    safetyQty = Math.ceil((needAllToUse / workingDays) * bufferLevel);
                }
                if (req.minQty > 0 && req.minQty > safetyQty) {
                    safetyQty = req.minQty;
                }
                const stockStdToUse = safetyQty;

                // Actual stock (STO / Physical Warehouse Stock)
                let stockQuery = 'SELECT COALESCE(SUM(qty_stock), 0) as current_stock FROM warehouse_stocks WHERE product_id = ?';
                const stockParams = [productId];
                if (warehouse_id) {
                    stockQuery += ' AND warehouse_id = ?';
                    stockParams.push(warehouse_id);
                }
                const [stockInfo] = await connection.execute(stockQuery, stockParams);
                let liveStock = stockInfo.length > 0 ? Number(stockInfo[0].current_stock || 0) : 0;
                if (liveStock === 0) {
                    const [prodStock] = await connection.execute('SELECT product_quantity FROM products WHERE id = ?', [productId]);
                    if (prodStock.length > 0) {
                        liveStock = Number(prodStock[0].product_quantity || 0);
                    }
                }
                const stoToUse = liveStock;

                // On-Order Qty
                const [orderInfo] = await connection.execute(
                    `SELECT COALESCE(SUM(pd.quantity), 0) as on_order
                     FROM purchase_details pd
                     JOIN purchases p ON pd.purchase_id = p.id
                     WHERE pd.product_id = ? AND p.status IN ('Pending', 'Approved')`,
                    [productId]
                );
                const onOrderQty = orderInfo.length > 0 ? Number(orderInfo[0].on_order || 0) : 0;

                // Net Requirement
                let netQty = Math.ceil(needAllToUse + safetyQty - stoToUse - onOrderQty);
                if (netQty <= 0 && needAllToUse > 0) {
                    netQty = Math.max(0, Math.ceil(needAllToUse + safetyQty - stoToUse));
                }
                if (netQty <= 0 && needAllToUse > 0) {
                    netQty = needAllToUse;
                }

                // Check multi-supplier quota
                const [psRows] = await connection.execute(
                    `SELECT ps.supplier_id, ps.purchase_price, ps.allocation_percent, ps.pcs_per_pack, ps.is_primary, s.supplier_name
                     FROM product_suppliers ps
                     JOIN suppliers s ON ps.supplier_id = s.id
                     WHERE ps.product_id = ?`,
                    [productId]
                );

                const defaultSupplierId = req.supplierId || (psRows.length > 0 ? psRows[0].supplier_id : null);

                let suppliersToSplit = psRows;
                let totalQuotaPercent = psRows.reduce((sum, ps) => sum + Number(ps.allocation_percent || 0), 0);

                if (totalQuotaPercent === 0 && psRows.length > 1) {
                    const defaultPct = Math.round(100 / psRows.length);
                    suppliersToSplit = psRows.map(ps => ({
                        ...ps,
                        allocation_percent: defaultPct
                    }));
                    totalQuotaPercent = suppliersToSplit.reduce((sum, ps) => sum + Number(ps.allocation_percent), 0);
                } else if (totalQuotaPercent > 0) {
                    suppliersToSplit = psRows.filter(ps => Number(ps.allocation_percent) > 0);
                    totalQuotaPercent = suppliersToSplit.reduce((sum, ps) => sum + Number(ps.allocation_percent), 0);
                }

                headerGrossQty += needAllToUse;
                headerNetQty += netQty;

                if (suppliersToSplit.length > 1 && totalQuotaPercent > 0) {
                    let accumulatedSplitQty = 0;
                    let accumulatedPct = 0;
                    for (let i = 0; i < suppliersToSplit.length; i++) {
                        const ps = suppliersToSplit[i];
                        const rawPct = Number(ps.allocation_percent || 0);
                        
                        let splitNetQty = 0;
                        let normPct = 0;
                        if (i === suppliersToSplit.length - 1) {
                            splitNetQty = netQty - accumulatedSplitQty;
                            normPct = 100 - accumulatedPct;
                        } else {
                            normPct = Math.round((rawPct / totalQuotaPercent) * 100);
                            accumulatedPct += normPct;
                            splitNetQty = Math.round(netQty * (rawPct / totalQuotaPercent));
                            accumulatedSplitQty += splitNetQty;
                        }

                        const unitPrice = Number(ps.purchase_price) || req.unitPrice || 0;
                        const pcsPerPack = Number(ps.pcs_per_pack) || 1;
                        const mrpQtyCalc = calcMrpQty(splitNetQty, pcsPerPack);
                        const subtotal = mrpQtyCalc * unitPrice;
                        headerEstCost += subtotal;

                        detailRowsToInsert.push({
                            productId,
                            classType: req.classType,
                            sourceType: req.sourceType,
                            needAllQty: needAllToUse,
                            stockStdQty: stockStdToUse,
                            stoQty: stoToUse,
                            grossQty: needAllToUse,
                            safetyStockQty: stockStdToUse,
                            currentStock: stoToUse,
                            onOrderQty,
                            qtyRequired: splitNetQty,
                            netQty: splitNetQty,
                            unitPrice,
                            subtotalCost: subtotal,
                            bomRef: req.bomRef,
                            supplierId: ps.supplier_id,
                            partNoVendor: req.productCode,
                            partNameVendor: `${req.productName} (${ps.supplier_name})`,
                            ordQty: splitNetQty,
                            mrpQty: mrpQtyCalc,
                            amount: subtotal,
                            allocationPercent: normPct,
                            remark: null
                        });
                    }
                } else {
                    const singlePcsPerPack = psRows.length === 1 ? (Number(psRows[0].pcs_per_pack) || 1) : 1;
                    const mrpQtyCalcSingle = calcMrpQty(netQty, singlePcsPerPack);
                    const subtotalCost = mrpQtyCalcSingle * req.unitPrice;
                    headerEstCost += subtotalCost;

                    detailRowsToInsert.push({
                        productId,
                        classType: req.classType,
                        sourceType: req.sourceType,
                        needAllQty: needAllToUse,
                        stockStdQty: stockStdToUse,
                        stoQty: stoToUse,
                        grossQty: needAllToUse,
                        safetyStockQty: stockStdToUse,
                        currentStock: stoToUse,
                        onOrderQty,
                        qtyRequired: netQty,
                        netQty: netQty,
                        unitPrice: req.unitPrice,
                        subtotalCost,
                        bomRef: req.bomRef,
                        supplierId: defaultSupplierId,
                        partNoVendor: req.productCode,
                        partNameVendor: req.productName,
                        ordQty: netQty,
                        mrpQty: mrpQtyCalcSingle,
                        amount: subtotalCost,
                        allocationPercent: 100,
                        remark: null
                    });
                }
            }
        }

        // For carry-over, inherit source info from parent MRP
        let effectivePoCustomerId = planning_source === 'Sales Forecast' ? null : (po_customer_id || null);
        let effectiveForecastId = planning_source === 'Sales Forecast' ? (forecast_id || null) : null;
        let effectivePlanningSource = planning_source;
        let effectiveWarehouseId = warehouse_id || null;

        if (carry_over_from_mrp_id) {
            const [parentMrp] = await connection.execute(
                'SELECT po_customer_id, forecast_id, planning_source, warehouse_id FROM mrps WHERE id = ?',
                [carry_over_from_mrp_id]
            );
            if (parentMrp.length > 0) {
                const pm = parentMrp[0];
                effectivePoCustomerId = pm.po_customer_id || null;
                effectiveForecastId = pm.forecast_id || null;
                effectivePlanningSource = pm.planning_source || 'PO Customer';
                effectiveWarehouseId = warehouse_id || pm.warehouse_id || null;
            }
        }

        // Insert MRP Header
        const [mrpResult] = await connection.execute(
            `INSERT INTO mrps (
                po_customer_id, forecast_id, parent_mrp_id, reference_code, planning_source, warehouse_id, 
                planner_name, safety_stock_percent, scrap_loss_percent, time_frame_start, time_frame_end, 
                total_gross_qty, total_net_qty, total_est_cost, note, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', NOW(), NOW())`,
            [
                effectivePoCustomerId,
                effectiveForecastId,
                carry_over_from_mrp_id || null,
                referenceCode,
                effectivePlanningSource,
                effectiveWarehouseId,
                planner_name || 'System Planner',
                safetyPct,
                scrapPct,
                tfStart,
                tfEnd,
                headerGrossQty,
                headerNetQty,
                headerEstCost,
                note || null
            ]
        );
        const mrpId = mrpResult.insertId;

        // Insert MRP Details
        for (const d of detailRowsToInsert) {
            await connection.execute(
                `INSERT INTO mrp_details (
                    mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                    gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                    unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                    ord_qty, mrp_qty, amount, allocation_percent, remark, release_draft_percent, qty_released_pr, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                [
                    mrpId, d.productId, d.classType, d.sourceType, d.needAllQty, d.stockStdQty, d.stoQty,
                    d.grossQty, d.safetyStockQty, d.currentStock, d.onOrderQty, d.qtyRequired, d.netQty,
                    d.unitPrice, d.subtotalCost, d.bomRef, d.supplierId, d.partNoVendor, d.partNameVendor,
                    d.ordQty, d.mrpQty, d.amount, d.allocationPercent || 0, d.remark || null,
                    d.releaseDraftPercent || 100
                ]
            );
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: 'Dokumen MRP berhasil dibuat sebagai Draft. Klik "Ajukan Approval" bila sudah siap diajukan.',
            mrp_id: mrpId.toString(),
            reference_code: referenceCode,
            status: 'Draft'
        });

    } catch (error) {
        await connection.rollback();
        console.error('generateMRP Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.releaseMRPToPR = async (req, res) => {
    const { id } = req.params;
    const { item_ids, items: customItems } = req.body || {};
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [mrpRows] = await connection.execute('SELECT * FROM mrps WHERE id = ?', [id]);
        if (mrpRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'MRP tidak ditemukan.' });
        }
        const mrp = mrpRows[0];

        // Validasi Setting: Rilis PR dari MRP harus aktif
        const [settings] = await connection.execute('SELECT enable_mrp_release_pr FROM settings LIMIT 1');
        const isReleasePREnabled = settings.length > 0 ? Boolean(settings[0].enable_mrp_release_pr) : false;
        if (!isReleasePREnabled) {
            await connection.rollback();
            return res.status(400).json({ 
                message: 'Fitur Rilis PR dari MRP sedang dinonaktifkan di pengaturan sistem. Schedule kedatangan telah diisi otomatis saat MRP disetujui.' 
            });
        }

        // Validasi: MRP harus sudah disetujui penuh (Approved) sebelum bisa dirilis ke PR
        if (mrp.status !== 'Approved') {
            await connection.rollback();
            return res.status(400).json({ 
                message: `Dokumen MRP belum disetujui penuh (Status saat ini: ${mrp.status}). Hanya dokumen MRP yang berstatus Approved yang dapat dirilis ke PR.` 
            });
        }

        let query = `SELECT md.*, p.product_name, p.product_code, p.product_unit, 
                    COALESCE(NULLIF(md.unit_price, 0), p.product_price, 0) as product_price,
                    COALESCE(md.supplier_id, p.supplier_id) as final_supplier_id
             FROM mrp_details md
             JOIN products p ON md.product_id = p.id
             WHERE md.mrp_id = ? AND (COALESCE(md.mrp_qty, md.net_qty, md.qty_required) > md.qty_released_pr)`;
        const params = [id];

        if (item_ids && Array.isArray(item_ids) && item_ids.length > 0) {
            query += ` AND md.id IN (${item_ids.map(() => '?').join(',')})`;
            params.push(...item_ids);
        }

        const [details] = await connection.execute(query, params);

        if (details.length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Seluruh kebutuhan material pada dokumen ini sudah dirilis ke PR.' });
        }

        // Map custom items by ID if provided from frontend modal
        const customItemMap = {};
        if (Array.isArray(customItems) && customItems.length > 0) {
            for (const ci of customItems) {
                customItemMap[ci.id.toString()] = ci;
            }
        }

        let ppicDeptId = null;
        const [depts] = await connection.execute(
            "SELECT id FROM departments WHERE department_code = 'PPIC' LIMIT 1"
        );
        if (depts.length > 0) ppicDeptId = depts[0].id;
        else {
            const [firstDept] = await connection.execute('SELECT id FROM departments LIMIT 1');
            if (firstDept.length > 0) ppicDeptId = firstDept[0].id;
        }

        const userId = req.user?.id || 1;

        // Group items by supplier for PR generation
        const supplierGroups = {};
        for (const item of details) {
            const targetQty = Number(item.mrp_qty || item.net_qty || item.qty_required);
            const remainingQty = targetQty - Number(item.qty_released_pr);

            const custom = customItemMap[item.id.toString()];
            let qtyToRelease = remainingQty;
            if (custom) {
                if (custom.release_qty !== undefined && custom.release_qty !== null) {
                    qtyToRelease = Number(custom.release_qty);
                } else if (custom.percent !== undefined && custom.percent !== null) {
                    const pct = Math.max(0, Math.min(100, Number(custom.percent)));
                    qtyToRelease = Math.round(remainingQty * (pct / 100));
                }
            }

            qtyToRelease = Math.max(0, Math.min(qtyToRelease, remainingQty));

            // Only queue items that have positive qty to release
            if (qtyToRelease > 0) {
                item._qtyToRelease = qtyToRelease;
                const supplierId = item.final_supplier_id ? item.final_supplier_id.toString() : '0';
                if (!supplierGroups[supplierId]) supplierGroups[supplierId] = [];
                supplierGroups[supplierId].push(item);
            }
        }

        if (Object.keys(supplierGroups).length === 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Tidak ada kuantiti material yang dipilih untuk dirilis ke PR (Kuantiti = 0).' });
        }

        const generatedPRs = [];

        for (const [supplierIdStr, items] of Object.entries(supplierGroups)) {
            const reference = await generatePRReference(connection, ppicDeptId, 'PR');

            let prTotal = 0;
            for (const item of items) {
                const qtyToRelease = item._qtyToRelease;
                const price = Number(item.unit_price || item.product_price) || 0;
                prTotal += qtyToRelease * price;
            }

            let masterBudgetId = null;
            if (ppicDeptId) {
                const [budgets] = await connection.execute(
                    "SELECT id FROM master_budget WHERE department_id = ? AND LOWER(status) = 'approved' LIMIT 1",
                    [ppicDeptId]
                );
                if (budgets.length > 0) masterBudgetId = budgets[0].id;
            }

            const supIdNum = Number(supplierIdStr) > 0 ? Number(supplierIdStr) : null;
            let supName = null;
            if (supIdNum) {
                const [sRows] = await connection.execute('SELECT supplier_name FROM suppliers WHERE id = ?', [supIdNum]);
                if (sRows.length > 0) supName = sRows[0].supplier_name;
            }

            const [pResult] = await connection.execute(
                `INSERT INTO purchases (
                    date, reference, department_id, supplier_id, supplier_name, total_amount, budget_amount,
                    mandatory_amount, non_mandatory_amount, status, users_id,
                    note, tax_percentage, discount_percentage, shipping_amount,
                    borrowed_amount, master_budget_id, due_amount, payment_status,
                    pr_type, created_at, updated_at
                ) VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, 0, ?, 'Pending', ?, ?, 0, 0, 0, 0, ?, ?, 'Unpaid', 'mrp', NOW(), NOW())`,
                [
                    reference, ppicDeptId, supIdNum, supName, prTotal, prTotal, prTotal,
                    userId, `Auto PR generated from MRP: ${mrp.reference_code}`,
                    masterBudgetId, prTotal
                ]
            );
            const purchaseId = pResult.insertId;

            for (const item of items) {
                const qtyToRelease = item._qtyToRelease;
                const price = Number(item.unit_price || item.product_price) || 0;
                const subTotal = qtyToRelease * price;

                await connection.execute(
                    `INSERT INTO purchase_details (
                        purchase_id, product_id, product_name, quantity, price, sub_total,
                        product_code, product_unit, unit_price, is_asset, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                    [
                        purchaseId, item.product_id, item.product_name, qtyToRelease,
                        price, subTotal, item.product_code, item.product_unit, price
                    ]
                );

                // Increment qty_released_pr in mrp_details WITHOUT modifying mrp_qty, unit_price, or original amounts!
                await connection.execute(
                    `UPDATE mrp_details SET qty_released_pr = qty_released_pr + ?, updated_at = NOW() WHERE id = ?`,
                    [qtyToRelease, item.id]
                );
            }

            const modelClass = 'Modules\\Purchase\\Entities\\Purchase';
            const [types] = await connection.execute(
                "SELECT id FROM approval_types WHERE approval_name = 'Purchase Request' LIMIT 1"
            );
            if (types.length > 0) {
                await connection.execute(
                    `INSERT INTO approval_requests (
                        requestable_type, requestable_id, approval_types_id, amount, current_level, status, created_by, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, 1, 'pending', ?, NOW(), NOW())`,
                    [modelClass, purchaseId, types[0].id, prTotal, userId]
                );
            }

            generatedPRs.push(reference);

            // === Auto-update Schedule Pengiriman (vendor_daily_schedules) ===
            // For each released item, update po_qty_1 in the schedule for this supplier+product
            for (const item of items) {
                const qtyToRelease = item._qtyToRelease;
                const supplierId = supIdNum;
                const productId = item.product_id;

                if (!supplierId || !productId) continue;

                // Check if any schedule rows already exist for this supplier+product
                const [existingRows] = await connection.execute(
                    'SELECT id FROM vendor_daily_schedules WHERE supplier_id = ? AND product_id = ? LIMIT 1',
                    [supplierId, productId]
                );

                if (existingRows.length > 0) {
                    // Update po_qty_1 on all existing date rows for this pair
                    await connection.execute(
                        'UPDATE vendor_daily_schedules SET po_qty_1 = po_qty_1 + ?, updated_at = NOW() WHERE supplier_id = ? AND product_id = ?',
                        [qtyToRelease, supplierId, productId]
                    );
                } else {
                    // Create a placeholder record with today's date
                    const today = new Date();
                    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                    await connection.execute(
                        `INSERT INTO vendor_daily_schedules (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                         VALUES (?, ?, ?, 0, ?, 0, NOW())
                         ON DUPLICATE KEY UPDATE po_qty_1 = po_qty_1 + VALUES(po_qty_1), updated_at = NOW()`,
                        [supplierId, productId, qtyToRelease, dateStr]
                    );
                }
            }
        }

        // Check if any items in this MRP still have unreleased balance
        const [unreleased] = await connection.execute(
            'SELECT id FROM mrp_details WHERE mrp_id = ? AND (COALESCE(mrp_qty, net_qty, qty_required) > qty_released_pr) LIMIT 1',
            [id]
        );
        const finalStatus = unreleased.length === 0 ? 'Released' : 'Approved';

        await connection.execute(
            "UPDATE mrps SET status = ?, updated_at = NOW() WHERE id = ?",
            [finalStatus, id]
        );

        await connection.commit();
        return res.json({
            success: true,
            message: `Kebutuhan material berhasil dirilis ke PR (${generatedPRs.length} Dokumen PR dibuat). Status MRP: ${finalStatus === 'Released' ? 'Released (100%)' : 'Approved (Rilis Sebagian)'}.`,
            prs: generatedPRs,
            mrp_status: finalStatus
        });

    } catch (error) {
        await connection.rollback();
        console.error('releaseMRPToPR Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.updateMRP = async (req, res) => {
    const { id } = req.params;
    const { time_frame_start, time_frame_end, planner_name, warehouse_id, note, details } = req.body;
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const [mrpRows] = await connection.execute('SELECT * FROM mrps WHERE id = ?', [id]);
        if (mrpRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'MRP tidak ditemukan' });
        }
        const mrp = mrpRows[0];
        if (mrp.status === 'Released') {
            await connection.rollback();
            return res.status(400).json({ message: 'Dokumen MRP yang sudah dirilis ke PR tidak dapat diubah.' });
        }

        const [releasedDetails] = await connection.execute(
            'SELECT id FROM mrp_details WHERE mrp_id = ? AND qty_released_pr > 0 LIMIT 1',
            [id]
        );
        if (releasedDetails.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Dokumen MRP yang sebagian materialnya sudah dirilis ke PR tidak dapat diubah langsung.' });
        }

        // If status is Waiting for Approval or explicitly requested, reset approval
        const shouldResetApproval = req.body.reset_approval === true || mrp.status === 'Waiting for Approval';

        if (shouldResetApproval) {
            const modelClass = 'Modules\\MRP\\Entities\\MRP';
            const [oldAppReqs] = await connection.execute(
                'SELECT id FROM approval_requests WHERE requestable_type = ? AND requestable_id = ?',
                [modelClass, id]
            );
            for (const oar of oldAppReqs) {
                await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [oar.id]);
                await connection.execute('DELETE FROM approval_requests WHERE id = ?', [oar.id]);
            }
        }

        const newStatus = shouldResetApproval ? 'Draft' : mrp.status;

        // Update Header
        await connection.execute(
            `UPDATE mrps 
             SET time_frame_start = COALESCE(?, time_frame_start), 
                 time_frame_end = COALESCE(?, time_frame_end), 
                 planner_name = COALESCE(?, planner_name), 
                 warehouse_id = COALESCE(?, warehouse_id), 
                 note = COALESCE(?, note), 
                 status = ?,
                 updated_at = NOW() 
             WHERE id = ?`,
            [time_frame_start || null, time_frame_end || null, planner_name || null, warehouse_id || null, note || null, newStatus, id]
        );

        // Update Details
        if (Array.isArray(details)) {
            let totNet = 0, totCost = 0;

            // 1. Fetch current existing detail IDs in DB for this MRP
            const [existingRows] = await connection.execute(
                'SELECT id FROM mrp_details WHERE mrp_id = ?',
                [id]
            );
            const existingIds = existingRows.map(r => Number(r.id));
            const sentIds = details.map(item => Number(item.id)).filter(itemDbId => !isNaN(itemDbId) && itemDbId > 0);

            // 2. Delete any detail rows in DB that were removed/cancelled in frontend
            const idsToDelete = existingIds.filter(existingId => !sentIds.includes(existingId));
            if (idsToDelete.length > 0) {
                await connection.query(
                    'DELETE FROM mrp_details WHERE mrp_id = ? AND id IN (?)',
                    [id, idsToDelete]
                );
            }

            // 3. Process details (Update existing, Insert new split rows)
            for (const item of details) {
                const ordQ = Number(item.ord_qty ?? item.net_qty ?? item.qty_required ?? 0);
                const mrpQ = Number(item.mrp_qty ?? ordQ);
                const uPrice = Number(item.unit_price || 0);
                const amt = mrpQ * uPrice;
                const allocPct = Number(item.allocation_percent ?? 100);

                const needAll = Number(item.need_all_qty ?? item.gross_qty ?? 0);
                const stockStd = Number(item.stock_std_qty ?? item.safety_stock_qty ?? 0);

                totNet += mrpQ;
                totCost += amt;

                const itemId = Number(item.id);
                if (itemId && existingIds.includes(itemId)) {
                    // Update existing row
                    await connection.execute(
                        `UPDATE mrp_details 
                         SET supplier_id = ?, part_no_vendor = ?, part_name_vendor = ?, 
                             need_all_qty = ?, gross_qty = ?, stock_std_qty = ?, safety_stock_qty = ?,
                             ord_qty = ?, mrp_qty = ?, qty_required = ?, net_qty = ?, 
                             unit_price = ?, amount = ?, subtotal_cost = ?, allocation_percent = ?, remark = ?, updated_at = NOW() 
                         WHERE id = ? AND mrp_id = ?`,
                        [
                            item.supplier_id || null, item.part_no_vendor || null, item.part_name_vendor || null,
                            needAll, needAll, stockStd, stockStd,
                            ordQ, mrpQ, mrpQ, mrpQ, uPrice, amt, amt, allocPct, item.remark || null, itemId, id
                        ]
                    );
                } else {
                    // Insert new split row
                    await connection.execute(
                        `INSERT INTO mrp_details (
                            mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                            gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                            unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                            ord_qty, mrp_qty, amount, allocation_percent, remark, created_at, updated_at
                         ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, ?,
                            ?, ?, ?, ?, ?, NOW(), NOW()
                         )`,
                        [
                            id,
                            item.product_id,
                            item.class_type || 'Component',
                            item.source_type || 'Buy',
                            Number(item.need_all_qty || item.gross_qty || 0),
                            Number(item.stock_std_qty || item.safety_stock_qty || 0),
                            Number(item.sto_qty || item.current_stock || 0),
                            Number(item.gross_qty || item.need_all_qty || 0),
                            Number(item.safety_stock_qty || item.stock_std_qty || 0),
                            Number(item.current_stock || item.sto_qty || 0),
                            Number(item.on_order_qty || 0),
                            mrpQ,
                            mrpQ,
                            uPrice,
                            amt,
                            item.bom_ref || null,
                            item.supplier_id || null,
                            item.part_no_vendor || null,
                            item.part_name_vendor || null,
                            ordQ,
                            mrpQ,
                            amt,
                            allocPct,
                            item.remark || null
                        ]
                    );
                }
            }

            await connection.execute(
                `UPDATE mrps SET total_net_qty = ?, total_est_cost = ? WHERE id = ?`,
                [totNet, totCost, id]
            );
        }

        await connection.commit();
        const successMsg = shouldResetApproval
            ? 'Dokumen MRP berhasil diperbarui. Status telah di-reset ke Draft dan memerlukan pengajuan approval kembali.'
            : 'Dokumen MRP berhasil diperbarui dan disimpan.';

        return res.json({ 
            success: true, 
            message: successMsg,
            status: newStatus 
        });
    } catch (error) {
        await connection.rollback();
        console.error('updateMRP Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.saveDraftPRPercent = async (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Item persentase rilis tidak boleh kosong.' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const [mrpRows] = await connection.execute('SELECT id, reference_code, status, revision_number FROM mrps WHERE id = ?', [id]);
        if (mrpRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Dokumen MRP tidak ditemukan.' });
        }
        const isRevision = mrpRows[0].revision_number && Number(mrpRows[0].revision_number) > 0;

        for (const item of items) {
            const pct = Math.max(0, Math.min(100, Number(item.percent ?? 100)));

            // Fetch detail to get supplier_id, product_id, ord_qty, unit_price, pcs_per_pack
            const [detailRows] = await connection.execute(
                `SELECT product_id, ord_qty, mrp_qty, unit_price, pcs_per_pack,
                        COALESCE(supplier_id, (SELECT supplier_id FROM products WHERE id = mrp_details.product_id)) as supplier_id 
                 FROM mrp_details WHERE id = ?`,
                [item.id]
            );

            if (detailRows.length > 0) {
                const { product_id, supplier_id, ord_qty, unit_price, pcs_per_pack } = detailRows[0];
                const baseOrd = Number(ord_qty || 0);
                const releasedOrd = Math.ceil(baseOrd * (pct / 100));
                const pack = Math.max(1, Math.round(Number(pcs_per_pack || 1)));
                const calculatedMrp = releasedOrd === 0 ? 0 : (pack <= 1 ? releasedOrd : Math.ceil(releasedOrd / pack) * pack);
                const newAmount = calculatedMrp * Number(unit_price || 0);

                await connection.execute(
                    'UPDATE mrp_details SET release_draft_percent = ?, qty_released_pr = ?, mrp_qty = ?, amount = ?, updated_at = NOW() WHERE id = ? AND mrp_id = ?',
                    [pct, releasedOrd, calculatedMrp, newAmount, item.id, id]
                );

                const calculatedPoQty = calculatedMrp;

                if (supplier_id && product_id) {
                    const [existingRows] = await connection.execute(
                        'SELECT id FROM vendor_daily_schedules WHERE supplier_id = ? AND product_id = ? LIMIT 1',
                        [supplier_id, product_id]
                    );

                    if (existingRows.length > 0) {
                        if (isRevision) {
                            await connection.execute(
                                'UPDATE vendor_daily_schedules SET po_qty_2 = ?, updated_at = NOW() WHERE supplier_id = ? AND product_id = ?',
                                [calculatedPoQty, supplier_id, product_id]
                            );
                        } else {
                            await connection.execute(
                                'UPDATE vendor_daily_schedules SET po_qty_1 = ?, updated_at = NOW() WHERE supplier_id = ? AND product_id = ?',
                                [calculatedPoQty, supplier_id, product_id]
                            );
                        }
                    } else {
                        const today = new Date();
                        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        if (isRevision) {
                            await connection.execute(
                                `INSERT INTO vendor_daily_schedules (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                                 VALUES (?, ?, 0, ?, ?, 0, NOW())
                                 ON DUPLICATE KEY UPDATE po_qty_2 = VALUES(po_qty_2), updated_at = NOW()`,
                                [supplier_id, product_id, calculatedPoQty, dateStr]
                            );
                        } else {
                            await connection.execute(
                                `INSERT INTO vendor_daily_schedules (supplier_id, product_id, po_qty_1, po_qty_2, schedule_date, schedule_qty, updated_at)
                                 VALUES (?, ?, ?, 0, ?, 0, NOW())
                                 ON DUPLICATE KEY UPDATE po_qty_1 = VALUES(po_qty_1), updated_at = NOW()`,
                                [supplier_id, product_id, calculatedPoQty, dateStr]
                            );
                        }
                    }
                }
            }
        }

        await connection.commit();
        return res.json({
            success: true,
            message: 'Persentase % PR & Jumlah PO di Schedule Pengiriman Vendor berhasil diperbarui.'
        });
    } catch (error) {
        await connection.rollback();
        console.error('saveDraftPRPercent Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.reviseMRP = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [mrpRows] = await connection.execute('SELECT * FROM mrps WHERE id = ?', [id]);
        if (mrpRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Dokumen MRP tidak ditemukan.' });
        }
        const oldMrp = mrpRows[0];

        const newRevisionNumber = Number(oldMrp.revision_number || 0) + 1;
        const baseRefCode = oldMrp.reference_code.replace(/-R\d+$/, '');
        const newRefCode = `${baseRefCode}-R${newRevisionNumber}`;

        const [mrpResult] = await connection.execute(
            `INSERT INTO mrps (
                po_customer_id, forecast_id, reference_code, revision_number, parent_mrp_id, planning_source, warehouse_id, 
                planner_name, safety_stock_percent, scrap_loss_percent, time_frame_start, time_frame_end, 
                total_gross_qty, total_net_qty, total_est_cost, note, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Draft', NOW(), NOW())`,
            [
                oldMrp.po_customer_id || null,
                oldMrp.forecast_id || null,
                newRefCode,
                newRevisionNumber,
                oldMrp.id,
                oldMrp.planning_source || 'PO Customer',
                oldMrp.warehouse_id || null,
                oldMrp.planner_name || 'System Planner',
                oldMrp.safety_stock_percent || 0,
                oldMrp.scrap_loss_percent || 0,
                oldMrp.time_frame_start,
                oldMrp.time_frame_end,
                oldMrp.total_gross_qty || 0,
                oldMrp.total_net_qty || 0,
                oldMrp.total_est_cost || 0,
                `Revisi (R${newRevisionNumber}) dari dokumen ${oldMrp.reference_code}`
            ]
        );
        const newMrpId = mrpResult.insertId;

        const [oldDetails] = await connection.execute(
            'SELECT * FROM mrp_details WHERE mrp_id = ? ORDER BY id ASC',
            [id]
        );

        for (const d of oldDetails) {
            const mrp1Qty = Number(d.mrp_qty || 0);
            const releasedPR = Number(d.qty_released_pr || 0);
            const carryOverBalance = Math.max(0, mrp1Qty - releasedPR);

            // Carry-over rule:
            // Check if item is an explicit carry-over item (has carry-over in remark/bom_ref or explicit carry_over_qty)
            const isCarryOverItem = (d.remark && d.remark.toLowerCase().includes('carry-over')) ||
                                   (d.bom_ref && d.bom_ref.toLowerCase().includes('carry-over')) ||
                                   (d.carry_over_qty && Number(d.carry_over_qty) > 0);

            // Default ORD is ONLY non-zero for items that have carry-over. Standard items default to 0!
            const defaultOrd = isCarryOverItem ? carryOverBalance : 0;
            const pcsPack = Math.max(1, Math.round(Number(d.pcs_per_pack || 1)));
            const defaultMrp = defaultOrd === 0 ? 0 : (pcsPack <= 1 ? Math.ceil(defaultOrd) : Math.ceil(defaultOrd / pcsPack) * pcsPack);
            const defaultAmount = defaultMrp * Number(d.unit_price || 0);

            await connection.execute(
                `INSERT INTO mrp_details (
                    mrp_id, product_id, class_type, source_type, need_all_qty, stock_std_qty, sto_qty,
                    gross_qty, safety_stock_qty, current_stock, on_order_qty, qty_required, net_qty,
                    unit_price, subtotal_cost, bom_ref, supplier_id, part_no_vendor, part_name_vendor,
                    ord_qty, mrp_qty, amount, allocation_percent, remark, qty_released_pr, release_draft_percent, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())`,
                [
                    newMrpId, d.product_id, d.class_type, d.source_type, d.need_all_qty, d.stock_std_qty, d.sto_qty,
                    d.gross_qty, d.safety_stock_qty, d.current_stock, d.on_order_qty, d.qty_required, d.net_qty,
                    d.unit_price, d.subtotal_cost, d.bom_ref, d.supplier_id, d.part_no_vendor, d.part_name_vendor,
                    defaultOrd, defaultMrp, defaultAmount, d.allocation_percent, d.remark || null, d.release_draft_percent || 100
                ]
            );
        }

        await connection.commit();
        return res.status(201).json({
            success: true,
            message: `Dokumen MRP Revisi (R${newRevisionNumber}) berhasil dibuat sebagai Draft.`,
            mrp_id: newMrpId.toString(),
            reference_code: newRefCode,
            revision_number: newRevisionNumber,
            status: 'Draft'
        });

    } catch (error) {
        await connection.rollback();
        console.error('reviseMRP Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.submitMRPForApproval = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
        const [mrpRows] = await connection.execute('SELECT * FROM mrps WHERE id = ?', [id]);
        if (mrpRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Dokumen MRP tidak ditemukan.' });
        }
        const mrp = mrpRows[0];

        if (mrp.status === 'Released') {
            await connection.rollback();
            return res.status(400).json({ message: 'Dokumen MRP yang sudah dirilis ke PR tidak dapat diajukan approval.' });
        }

        const modelClass = 'Modules\\MRP\\Entities\\MRP';
        const userId = req.user?.id || 10;
        const totalEstCost = Number(mrp.total_est_cost || 0);

        // Clear any existing approval requests for this MRP
        const [oldAppReqs] = await connection.execute(
            'SELECT id FROM approval_requests WHERE requestable_type = ? AND requestable_id = ?',
            [modelClass, id]
        );
        for (const oar of oldAppReqs) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [oar.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [oar.id]);
        }

        const [types] = await connection.execute(
            "SELECT id FROM approval_types WHERE approval_name = 'MRP' OR approval_code = 'MRP' LIMIT 1"
        );

        let finalStatus = 'Waiting for Approval';
        if (types.length > 0) {
            const approval = await approvalService.createRequest(
                modelClass, id, types[0].id, totalEstCost, userId, connection
            );
            if (approval.status === 'none' || approval.status === 'approved') {
                finalStatus = 'Approved';
            } else {
                finalStatus = 'Waiting for Approval';
            }
        }

        await connection.execute('UPDATE mrps SET status = ? WHERE id = ?', [finalStatus, id]);

        if (finalStatus === 'Approved') {
            await approvalService.handleMRPApprovedAutoSchedule(connection, id);
        }

        await connection.commit();
        return res.json({
            success: true,
            message: 'Dokumen MRP berhasil diajukan untuk persetujuan 3-Level (Bugie -> S.B. Anang -> Rony).',
            status: finalStatus
        });

    } catch (error) {
        await connection.rollback();
        console.error('submitMRPForApproval Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.deleteMRP = async (req, res) => {
    const { id } = req.params;
    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const [mrpRows] = await connection.execute('SELECT * FROM mrps WHERE id = ?', [id]);
        if (mrpRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Dokumen MRP tidak ditemukan' });
        }
        const mrp = mrpRows[0];
        if (mrp.status === 'Released') {
            await connection.rollback();
            return res.status(400).json({ message: 'Dokumen MRP yang sudah dirilis ke Purchase Request (PR) tidak dapat dihapus.' });
        }

        const [releasedDetails] = await connection.execute(
            'SELECT id FROM mrp_details WHERE mrp_id = ? AND qty_released_pr > 0 LIMIT 1',
            [id]
        );
        if (releasedDetails.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Dokumen MRP sudah memiliki alokasi PR yang dirilis.' });
        }

        // Clean up approval requests and logs if any exist (e.g. while Waiting for Approval on Level 1 or Level 2)
        const modelClass = 'Modules\\MRP\\Entities\\MRP';
        const [oldAppReqs] = await connection.execute(
            'SELECT id FROM approval_requests WHERE requestable_type = ? AND requestable_id = ?',
            [modelClass, id]
        );
        for (const oar of oldAppReqs) {
            await connection.execute('DELETE FROM approval_request_logs WHERE approval_request_id = ?', [oar.id]);
            await connection.execute('DELETE FROM approval_requests WHERE id = ?', [oar.id]);
        }

        await connection.execute('DELETE FROM mrp_details WHERE mrp_id = ?', [id]);
        await connection.execute('DELETE FROM mrps WHERE id = ?', [id]);

        await connection.commit();
        return res.json({ success: true, message: 'Dokumen MRP berhasil dihapus.' });
    } catch (error) {
        await connection.rollback();
        console.error('deleteMRP Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.bulkReleaseMRPToPR = async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: 'Pilih minimal satu dokumen MRP.' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    try {
        const [settings] = await connection.execute('SELECT enable_mrp_release_pr FROM settings LIMIT 1');
        const isReleasePREnabled = settings.length > 0 ? Boolean(settings[0].enable_mrp_release_pr) : false;
        if (!isReleasePREnabled) {
            await connection.rollback();
            return res.status(400).json({ 
                message: 'Fitur Rilis PR dari MRP sedang dinonaktifkan di pengaturan sistem. Schedule kedatangan telah diisi otomatis saat MRP disetujui.' 
            });
        }

        const releasedPRs = [];
        for (const id of ids) {
            const [mrpRows] = await connection.execute('SELECT * FROM mrps WHERE id = ?', [id]);
            if (mrpRows.length === 0) continue;
            const mrp = mrpRows[0];
            if (mrp.status !== 'Draft') continue;

            const [details] = await connection.execute(
                `SELECT md.*, p.product_name, p.product_code, p.product_unit, 
                        COALESCE(NULLIF(md.unit_price, 0), p.product_price, 0) as product_price,
                        COALESCE(md.supplier_id, p.supplier_id) as final_supplier_id
                 FROM mrp_details md
                 JOIN products p ON md.product_id = p.id
                 WHERE md.mrp_id = ? AND (COALESCE(md.mrp_qty, md.net_qty, md.qty_required) > md.qty_released_pr)`,
                [id]
            );

            if (details.length === 0) {
                await connection.execute(
                    "UPDATE mrps SET status = 'Released', updated_at = NOW() WHERE id = ?",
                    [id]
                );
                continue;
            }

            let ppicDeptId = null;
            const [depts] = await connection.execute(
                "SELECT id FROM departments WHERE department_code = 'PPIC' LIMIT 1"
            );
            if (depts.length > 0) ppicDeptId = depts[0].id;
            else {
                const [firstDept] = await connection.execute('SELECT id FROM departments LIMIT 1');
                if (firstDept.length > 0) ppicDeptId = firstDept[0].id;
            }

            const userId = req.user?.id || 1;

            const supplierGroups = {};
            for (const item of details) {
                const supplierId = item.final_supplier_id ? item.final_supplier_id.toString() : '0';
                if (!supplierGroups[supplierId]) supplierGroups[supplierId] = [];
                supplierGroups[supplierId].push(item);
            }

            for (const [supplierIdStr, items] of Object.entries(supplierGroups)) {
                const reference = await generatePRReference(connection, ppicDeptId, 'PR');

                let prTotal = 0;
                for (const item of items) {
                    const targetQty = Number(item.mrp_qty || item.net_qty || item.qty_required);
                    const qtyToRelease = targetQty - Number(item.qty_released_pr);
                    const price = Number(item.unit_price || item.product_price) || 0;
                    prTotal += qtyToRelease * price;
                }

                let masterBudgetId = null;
                if (ppicDeptId) {
                    const [budgets] = await connection.execute(
                        "SELECT id FROM master_budget WHERE department_id = ? AND LOWER(status) = 'approved' LIMIT 1",
                        [ppicDeptId]
                    );
                    if (budgets.length > 0) masterBudgetId = budgets[0].id;
                }

                const [pResult] = await connection.execute(
                    `INSERT INTO purchases (
                        date, reference, department_id, total_amount, budget_amount,
                        mandatory_amount, non_mandatory_amount, status, users_id,
                        note, tax_percentage, discount_percentage, shipping_amount,
                        borrowed_amount, master_budget_id, due_amount, payment_status,
                        pr_type, created_at, updated_at
                    ) VALUES (CURDATE(), ?, ?, ?, ?, 0, ?, 'Pending', ?, ?, 0, 0, 0, 0, ?, ?, 'Unpaid', 'mrp', NOW(), NOW())`,
                    [
                        reference, ppicDeptId, prTotal, prTotal, prTotal,
                        userId, `Auto PR generated from MRP: ${mrp.reference_code}`,
                        masterBudgetId, prTotal
                    ]
                );
                const purchaseId = pResult.insertId;

                for (const item of items) {
                    const targetQty = Number(item.mrp_qty || item.net_qty || item.qty_required);
                    const qtyToRelease = targetQty - Number(item.qty_released_pr);
                    const price = Number(item.unit_price || item.product_price) || 0;
                    const subTotal = qtyToRelease * price;

                    await connection.execute(
                        `INSERT INTO purchase_details (
                            purchase_id, product_id, product_name, quantity, price, sub_total,
                            product_code, product_unit, unit_price, is_asset, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
                        [
                            purchaseId, item.product_id, item.product_name, qtyToRelease,
                            price, subTotal, item.product_code, item.product_unit, price
                        ]
                    );

                    await connection.execute(
                        `UPDATE mrp_details SET qty_released_pr = qty_released_pr + ?, updated_at = NOW() WHERE id = ?`,
                        [qtyToRelease, item.id]
                    );
                }

                const modelClass = 'Modules\\Purchase\\Entities\\Purchase';
                const [types] = await connection.execute(
                    "SELECT id FROM approval_types WHERE approval_name = 'Purchase Request' LIMIT 1"
                );
                if (types.length > 0) {
                    await connection.execute(
                        `INSERT INTO approval_requests (
                            requestable_type, requestable_id, approval_types_id, amount, current_level, status, created_by, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, 1, 'pending', ?, NOW(), NOW())`,
                        [modelClass, purchaseId, types[0].id, prTotal, userId]
                    );
                }
                releasedPRs.push(reference);
            }

            await connection.execute(
                "UPDATE mrps SET status = 'Released', updated_at = NOW() WHERE id = ?",
                [id]
            );
        }

        await connection.commit();
        return res.json({
            success: true,
            message: `Berhasil merilis ${releasedPRs.length} PR dari dokumen MRP terpilih.`,
            prs: releasedPRs
        });
    } catch (error) {
        await connection.rollback();
        console.error('bulkReleaseMRPToPR Error:', error);
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};
