const db = require('../src/config/db');

async function run() {
  try {
    const page = 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    let query = `
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

    // Apply sorting
    query += ` ORDER BY p.id DESC, ps.id ASC LIMIT ${limit} OFFSET ${offset}`;

    const [rows] = await db.query(query);
    console.log(`\n=== Rows returned on Page 1 (Limit ${limit}): ${rows.length} ===`);
    rows.forEach((r, idx) => {
      console.log(`${idx + 1}. ID: ${r.id} | Name: ${r.ps_product_name || r.parent_name} | Code: ${r.ps_product_code || r.supplier_part_number || r.parent_code} | Supplier: ${r.supplier_name || '-'}`);
    });

    // Count query
    let countQuery = `
      SELECT COUNT(*) as count
      FROM products p
      LEFT JOIN product_suppliers ps ON p.id = ps.product_id
    `;
    const [[{ count }]] = await db.query(countQuery);
    console.log(`\n=== Total Count of Unified/Expanded Rows: ${count} ===`);

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
