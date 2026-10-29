const db = require('../config/db');

// Utility function for BigInt serialization and Date formatting
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

exports.generateGRReference = async function (connection, departmentId) {
    let deptCode = 'GEN';
    if (departmentId) {
        const [depts] = await connection.execute('SELECT department_code FROM departments WHERE id = ?', [departmentId]);
        if (depts.length > 0 && depts[0].department_code) deptCode = depts[0].department_code;
    }
    const now = new Date();
    const year  = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth()+1).padStart(2,'0');
    const prefix = `BPB/${deptCode}-EPU/${year}/${month}/`;
    const globalYearPrefix = `BPB/%/${year}/%`;
    
    // Search for latest sequence with this global year prefix
    const [latest] = await connection.execute(
        'SELECT reference FROM goods_receipts WHERE reference LIKE ? ORDER BY id DESC LIMIT 1',
        [globalYearPrefix]
    );
    
    let sequence = 1;
    if (latest.length > 0) {
        const lastRef = latest[0].reference;
        const parts = lastRef.split('/');
        const lastSeqStr = parts[parts.length - 1];
        // Reset to 1 if coming from old DDXXX format
        if (lastSeqStr.length === 4 && !isNaN(parseInt(lastSeqStr))) {
            sequence = parseInt(lastSeqStr) + 1;
        } else {
            sequence = 1;
        }
    }
    return `${prefix}${String(sequence).padStart(4, '0')}`;
}

exports.getGoodsReceipts = async (req, res) => {
    try {
        const { search, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

         let query = `
            SELECT gr.*, s.supplier_name, po.reference as po_reference, d.department_name 
            FROM goods_receipts gr 
            LEFT JOIN suppliers s ON gr.supplier_id = s.id 
            LEFT JOIN purchase_orders po ON gr.po_id = po.id
            LEFT JOIN departments d ON gr.department_id = d.id
        `;
        let params = [];
        if (search) {
            query += ' WHERE gr.reference LIKE ? OR s.supplier_name LIKE ? OR gr.bpb_number LIKE ?';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        query += ` ORDER BY gr.id DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        const [rows] = await db.query(query, params);
        const [totalRows] = await db.query('SELECT COUNT(*) as count FROM goods_receipts');

        return res.json({
            success: true,
            data: serialize(rows),
            total: totalRows[0].count,
            current_page: parseInt(page),
            last_page: Math.ceil(totalRows[0].count / parseInt(limit))
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.getGoodsReceiptById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.execute(`
            SELECT gr.*, s.supplier_name, po.reference as po_reference
            FROM goods_receipts gr
            LEFT JOIN suppliers s ON gr.supplier_id = s.id
            LEFT JOIN purchase_orders po ON gr.po_id = po.id
            WHERE gr.id = ?`, [id]);
        
        if (rows.length === 0) return res.status(404).json({ message: 'Goods Receipt not found' });

        const [details] = await db.execute('SELECT * FROM goods_receipt_details WHERE gr_id = ?', [id]);
        
        return res.json({
            success: true,
            data: {
                ...serialize(rows[0]),
                details: serialize(details)
            }
        });
    } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.createGoodsReceipt = async (req, res) => {
    const connection = await db.getConnection();
    const userId = req.user?.id || 1;
    try {
        await connection.beginTransaction();
        const { 
            date, supplier_id, po_id, pr_id, note, items,
            department_id, bpb_number, po_date, shipping_address
        } = req.body;

        // Pass department_id to generate normalized BPB reference
        const reference = req.body.reference && req.body.reference !== '' 
            ? req.body.reference 
            : await exports.generateGRReference(connection, department_id);
        
        // Fix for "Incorrect integer value: ''"
        const cleanPrId = pr_id && pr_id !== '' ? pr_id : null;
        const cleanPoId = po_id && po_id !== '' ? po_id : null;
        const cleanDeptId = department_id && department_id !== '' ? department_id : null;

        // Validation: Check if PO is already fully received or if items exceed balance
        if (cleanPoId) {
            const [poItems] = await connection.execute(`
                SELECT pod.product_id, pod.product_name, pod.quantity,
                       COALESCE(r.received, 0) as total_received
                FROM purchase_order_details pod
                LEFT JOIN (
                    SELECT grd.product_id, grd.product_name, SUM(grd.qty_received) as received
                    FROM goods_receipt_details grd
                    JOIN goods_receipts gr ON grd.gr_id = gr.id
                    WHERE gr.po_id = ?
                    GROUP BY grd.product_id, grd.product_name
                ) r ON (
                    (pod.product_id IS NOT NULL AND pod.product_id = r.product_id) OR 
                    (pod.product_id IS NULL AND pod.product_name = r.product_name)
                )
                WHERE pod.po_id = ?
            `, [cleanPoId, cleanPoId]);

            const poMap = new Map();
            poItems.forEach(pi => {
                const key = pi.product_id ? `id_${Number(pi.product_id)}` : `name_${pi.product_name}`;
                poMap.set(key, pi);
            });

            // Check if the PO itself is already fully received (before this transaction)
            const isPOAlreadyFull = poItems.length > 0 && poItems.every(pi => Number(pi.total_received) >= Number(pi.quantity));
            if (isPOAlreadyFull) {
                throw new Error("Penerimaan barang gagal: Purchase Order ini sudah terpenuhi seluruhnya.");
            }

            // Validate current items against remaining balance
            for (const item of items) {
                const key = item.product_id ? `id_${Number(item.product_id)}` : `name_${item.product_name}`;
                const poItem = poMap.get(key);
                if (poItem) {
                    const remaining = Number(poItem.quantity) - Number(poItem.total_received);
                    if (Number(item.qty_received) > remaining) {
                        throw new Error(`Kuantitas diterima untuk ${item.product_name} melebihi sisa PO (${remaining}).`);
                    }
                }
            }
        }

        const [result] = await connection.query(
            `INSERT INTO goods_receipts SET ?`,
            [{
                reference,
                bpb_number: bpb_number || null,
                date: date || new Date(),
                supplier_id,
                po_id: cleanPoId,
                pr_id: cleanPrId,
                department_id: cleanDeptId,
                users_id: userId,
                status: 'Completed',
                note,
                po_date: po_date || null,
                shipping_address: shipping_address || null,
                created_at: new Date(),
                updated_at: new Date()
            }]
        );

        const grId = result.insertId;

        if (items && items.length > 0) {
            for (const item of items) {
                const detailData = {
                    gr_id: grId,
                    product_id: item.product_id || null,
                    product_name: item.product_name,
                    product_code: item.product_code,
                    qty_ordered: item.qty_ordered || 0,
                    qty_received: item.qty_received || 0,
                    product_unit: item.product_unit,
                    created_at: new Date(),
                    updated_at: new Date()
                };
                await connection.query(`INSERT INTO goods_receipt_details SET ?`, [detailData]);

                 // Update product quantity in stock
                 if (item.product_id) {
                     // Check if product has mapped suppliers
                     const [suppliersForProduct] = await connection.execute(
                         'SELECT id FROM product_suppliers WHERE product_id = ? LIMIT 1',
                         [item.product_id]
                     );

                     const finalSupplierId = suppliersForProduct.length > 0 ? supplier_id : null;

                     // Fetch unit price for the incoming item
                     let unitPrice = 0;
                     if (cleanPoId) {
                         const [poItemRows] = await connection.execute(
                             'SELECT unit_price FROM purchase_order_details WHERE po_id = ? AND product_id = ? LIMIT 1',
                             [cleanPoId, item.product_id]
                         );
                         if (poItemRows.length > 0) {
                             unitPrice = Number(poItemRows[0].unit_price || 0);
                         }
                     }

                     // Fallback to master buy price if unitPrice is still 0
                     if (unitPrice === 0) {
                         const [prodUnitRows] = await connection.execute(
                             'SELECT buy_price FROM product_units WHERE product_id = ? AND level = 1 LIMIT 1',
                             [item.product_id]
                         );
                         if (prodUnitRows.length > 0) {
                             unitPrice = Number(prodUnitRows[0].buy_price || 0);
                         } else {
                             const [prodRows] = await connection.execute(
                                 'SELECT product_price FROM products WHERE id = ? LIMIT 1',
                                 [item.product_id]
                             );
                             unitPrice = prodRows.length > 0 ? Number(prodRows[0].product_price || 0) : 0;
                         }
                     }

                     // Update or Insert warehouse_stocks (MATKOM is warehouse_id = 1)
                     const [wsRows] = await connection.execute(
                         'SELECT id, qty_stock, hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = 1 AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL))',
                         [item.product_id, finalSupplierId, finalSupplierId]
                     );

                     if (wsRows.length > 0) {
                         const qtyOld = Number(wsRows[0].qty_stock || 0);
                         const hppOld = Number(wsRows[0].hpp || 0);
                         const qtyNew = Number(item.qty_received || 0);
                         let hppNew = hppOld;
                         if (qtyOld + qtyNew > 0) {
                             hppNew = (qtyOld * hppOld + qtyNew * unitPrice) / (qtyOld + qtyNew);
                         }
                         await connection.execute(
                             'UPDATE warehouse_stocks SET qty_stock = qty_stock + ?, hpp = ?, updated_at = NOW() WHERE id = ?',
                             [item.qty_received, hppNew, wsRows[0].id]
                         );
                     } else {
                         await connection.execute(
                             'INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at) VALUES (?, 1, ?, ?, ?, NOW(), NOW())',
                             [item.product_id, finalSupplierId, item.qty_received, unitPrice]
                         );
                     }

                     // Update global product quantity
                     await connection.execute(
                         'UPDATE products SET product_quantity = product_quantity + ? WHERE id = ?',
                         [item.qty_received, item.product_id]
                     );
                 }
             }
         }
 
         // If from PO, update PO status if needed (e.g., mark as received)
         // For simplicity, we just keep it as is or the user can "Tutup PO" manually.
 
         await connection.commit();
         return res.status(201).json({ success: true, message: 'Goods Receipt created', id: grId, reference });
     } catch (error) {
         await connection.rollback();
         res.status(500).json({ message: error.message });
     } finally {
         connection.release();
     }
 };
 
 exports.deleteGoodsReceipt = async (req, res) => {
     const connection = await db.getConnection();
     try {
         await connection.beginTransaction();
         const { id } = req.params;
 
         const [grHeader] = await connection.execute('SELECT supplier_id FROM goods_receipts WHERE id = ?', [id]);
         const supplier_id = grHeader[0]?.supplier_id || null;

         // Decrease stock before deleting
         const [details] = await connection.execute('SELECT product_id, qty_received FROM goods_receipt_details WHERE gr_id = ?', [id]);
         for (const item of details) {
             if (item.product_id) {
                 // Check if product has mapped suppliers
                 const [suppliersForProduct] = await connection.execute(
                     'SELECT id FROM product_suppliers WHERE product_id = ? LIMIT 1',
                     [item.product_id]
                 );

                 const finalSupplierId = suppliersForProduct.length > 0 ? supplier_id : null;

                 // Decrease warehouse_stocks (MATKOM is warehouse_id = 1)
                 await connection.execute(
                     'UPDATE warehouse_stocks SET qty_stock = GREATEST(0, qty_stock - ?), updated_at = NOW() WHERE product_id = ? AND warehouse_id = 1 AND (supplier_id = ? OR (supplier_id IS NULL AND ? IS NULL))',
                     [item.qty_received, item.product_id, finalSupplierId, finalSupplierId]
                 );

                 // Decrease global product quantity
                 await connection.execute(
                     'UPDATE products SET product_quantity = GREATEST(0, product_quantity - ?) WHERE id = ?',
                     [item.qty_received, item.product_id]
                 );
             }
         }
 
         await connection.execute('DELETE FROM goods_receipts WHERE id = ?', [id]);
         
         await connection.commit();
         return res.json({ success: true, message: 'Goods Receipt deleted and stock adjusted' });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: error.message });
    } finally {
        connection.release();
    }
};

exports.getGoodsReceiptsByPo = async (req, res) => {
    try {
        const { po_id } = req.params;
        const [rows] = await db.execute(`
            SELECT gr.*, s.supplier_name, po.reference as po_reference
            FROM goods_receipts gr
            LEFT JOIN suppliers s ON gr.supplier_id = s.id
            LEFT JOIN purchase_orders po ON gr.po_id = po.id
            WHERE gr.po_id = ?
            ORDER BY gr.id ASC`, [po_id]);

        // Fetch all invoices that reference any GR from this PO
        const [invoices] = await db.execute(
            `SELECT id, gr_id, gr_ids FROM purchase_invoices WHERE po_id = ?`,
            [po_id]
        );

        // Build a Set of invoiced GR IDs
        const invoicedGrIds = new Set();
        for (const inv of invoices) {
            // Single gr_id column
            if (inv.gr_id) invoicedGrIds.add(Number(inv.gr_id));
            // JSON array gr_ids column
            if (inv.gr_ids) {
                try {
                    const arr = JSON.parse(inv.gr_ids);
                    if (Array.isArray(arr)) arr.forEach(id => invoicedGrIds.add(Number(id)));
                } catch {}
            }
        }

        // Fetch details and mark is_invoiced for each GR
        for (let gr of rows) {
            const [details] = await db.execute('SELECT * FROM goods_receipt_details WHERE gr_id = ?', [gr.id]);
            gr.details = details;
            gr.is_invoiced = invoicedGrIds.has(Number(gr.id)) ? 1 : 0;
        }

        return res.json({
            success: true,
            data: serialize(rows)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
