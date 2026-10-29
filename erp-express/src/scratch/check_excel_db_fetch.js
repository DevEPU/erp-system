const db = require('../config/db');

async function testFetch() {
    try {
        const [vRows] = await db.execute('SELECT supplier_code, supplier_name, contact_person, supplier_email, supplier_phone, region FROM suppliers LIMIT 10');
        console.log("Suppliers DB count:", vRows.length);
        if (vRows.length > 0) console.log("Sample Supplier:", vRows[0]);

        const [cRows] = await db.execute('SELECT id, customer_name, customer_email, customer_phone, city, country, address FROM customers LIMIT 10');
        console.log("Customers DB count:", cRows.length);
        if (cRows.length > 0) console.log("Sample Customer:", cRows[0]);

        const [pRows] = await db.execute('SELECT id, product_code, part_number, product_name, category_id, product_unit, product_type, product_quantity, min_qty, product_stock_alert, product_price FROM products LIMIT 10');
        console.log("Products DB count:", pRows.length);
        if (pRows.length > 0) console.log("Sample Product:", pRows[0]);

        const [bRows] = await db.execute(`
            SELECT b.bom_code, b.finished_good_code, bi.product_code as comp_code, bi.qty as comp_qty, bi.unit as comp_unit, bi.price as comp_price
            FROM boms b
            JOIN bom_items bi ON b.id = bi.bom_id
            WHERE b.finished_good_code = 'EPBL-FBXLUGK1Z' OR b.id = 22
        `);
        console.log("BOM Items count for PO product:", bRows.length);
        console.log("BOM Items:", bRows);

        const [poRows] = await db.execute(`
            SELECT po.reference, po.tanggal_po, po.customer_id, c.customer_name, pod.forecast_detail_id, pod.product_code, pod.product_name, pod.po_qty, pod.price, pod.discount_percent
            FROM customer_po po
            JOIN customer_po_details pod ON po.id = pod.po_id
            LEFT JOIN customers c ON po.customer_id = c.id
            WHERE po.reference = 'CPO/26/08/0001'
        `);
        console.log("Customer PO CPO/26/08/0001 count:", poRows.length);
        console.log("PO CPO/26/08/0001 Data:", poRows);

        const [mrpRows] = await db.execute(`
            SELECT mrp.reference_code, mrp.planning_source, cp.reference as po_ref, md.product_id, p.product_code, p.product_name, p.product_unit, md.gross_qty, md.current_stock, md.safety_stock_qty, md.net_qty, md.unit_price, md.amount
            FROM mrps mrp
            JOIN mrp_details md ON mrp.id = md.mrp_id
            JOIN products p ON md.product_id = p.id
            LEFT JOIN customer_po cp ON mrp.po_customer_id = cp.id
            WHERE cp.reference = 'CPO/26/08/0001' OR mrp.reference_code LIKE 'MRP/EPU/26/08%'
        `);
        console.log("MRP details for CPO/26/08/0001 count:", mrpRows.length);
        console.log("MRP details:", mrpRows);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testFetch();
