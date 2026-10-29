const db = require('../config/db');

async function testMultiVendorCols() {
    try {
        const [rows] = await db.execute(`
            SELECT ps.supplier_part_number as part_no_vendor,
                   p.product_name as internal_name,
                   cat.category_name,
                   p.product_unit,
                   p.product_type,
                   s.supplier_name,
                   ps.is_primary,
                   ps.allocation_percent,
                   ps.purchase_price
            FROM product_suppliers ps
            JOIN products p ON ps.product_id = p.id
            LEFT JOIN categories cat ON p.category_id = cat.id
            JOIN suppliers s ON ps.supplier_id = s.id
            LIMIT 10
        `);

        console.log("Sample Multi-Vendor rows with Category, Unit, Type:");
        console.log(JSON.stringify(rows.map(r => ({
            part_no_vendor: r.part_no_vendor,
            item_name: r.internal_name,
            category: r.category_name || 'Component',
            unit_uom: r.product_unit || 'PCS',
            type: r.product_type || 'Component',
            vendor_name: r.supplier_name,
            status_vendor: r.is_primary ? 'Mandatory' : 'Sub Vendor',
            quota_percent: `${Number(r.allocation_percent || 0)}%`,
            harga_beli: `Rp ${Number(r.purchase_price || 0).toLocaleString()}`
        })), null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

testMultiVendorCols();
