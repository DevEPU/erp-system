const db = require('../config/db');

async function checkVendorStatus() {
    try {
        const [rows] = await db.execute(`
            SELECT ps.product_id, ps.supplier_part_number as part_no_vendor, ps.product_name as part_name_vendor,
                   p.product_code as internal_code, p.product_name as internal_name,
                   s.supplier_code, s.supplier_name, ps.is_primary, ps.is_mandatory, ps.allocation_percent, ps.purchase_price
            FROM product_suppliers ps
            JOIN products p ON ps.product_id = p.id
            JOIN suppliers s ON ps.supplier_id = s.id
            WHERE ps.product_id IN (
                SELECT product_id FROM product_suppliers GROUP BY product_id HAVING COUNT(supplier_id) > 1
            )
            ORDER BY ps.product_id ASC, ps.is_primary DESC, ps.id ASC
            LIMIT 15
        `);

        console.log("Sample Multi-Vendor mappings with Status Vendor (Mandatory vs Sub Vendor):");
        console.log(JSON.stringify(rows.map(r => ({
            part_no_vendor: r.part_no_vendor || r.internal_code,
            item_name: r.internal_name,
            vendor_name: r.supplier_name,
            vendor_status: r.is_primary ? 'Mandatory' : 'Sub Vendor',
            quota_percent: `${Number(r.allocation_percent || 0)}%`,
            harga_beli: `Rp ${Number(r.purchase_price || 0).toLocaleString()}`
        })), null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkVendorStatus();
