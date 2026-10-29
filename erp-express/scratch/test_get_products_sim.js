const db = require('../src/config/db');

async function testGetProducts() {
  try {
    // Let's simulate getProducts query for superadmin (userId: 1) or no user
    // In productController.js lines 139-260:
    const query = `
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
      WHERE (EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id IS NOT NULL AND pl.warehouse_id > 0) OR EXISTS (SELECT 1 FROM warehouse_stocks ws WHERE ws.product_id = p.id AND ws.warehouse_id IS NOT NULL AND ws.warehouse_id > 0))
      ORDER BY p.id DESC, ps.id ASC
      LIMIT 500
    `;

    const [rows] = await db.execute(query);
    console.log('Total rows returned by default getProducts (limit 500):', rows.length);
    console.log('First 10 rows:');
    rows.slice(0, 10).forEach(r => {
      console.log(`- ID ${r.id}: ${r.ps_product_name || r.parent_name} (${r.ps_product_code || r.parent_code}) | Cat: ${r.category_name}`);
    });

    // Check how many have warehouse stock or product_locations
    const [allMatched] = await db.execute(`
      SELECT DISTINCT p.id, p.product_code, p.product_name, c.category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE (EXISTS (SELECT 1 FROM product_locations pl WHERE pl.product_id = p.id AND pl.warehouse_id IS NOT NULL AND pl.warehouse_id > 0) 
         OR EXISTS (SELECT 1 FROM warehouse_stocks ws WHERE ws.product_id = p.id AND ws.warehouse_id IS NOT NULL AND ws.warehouse_id > 0))
    `);
    console.log('Total distinct products connected to warehouses:', allMatched.length);

    // Let's check what categories these belong to:
    const catCount = {};
    allMatched.forEach(p => {
      catCount[p.category_name] = (catCount[p.category_name] || 0) + 1;
    });
    console.log('Categories of connected products:', catCount);

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

testGetProducts();
