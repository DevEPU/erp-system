const db = require('../config/db');

async function run() {
  try {
    const warehouse_id = 1;
    // Fetch products
    let productQuery = 'SELECT id, product_name, product_code, product_unit, is_mandatory, is_asset FROM products LIMIT 5';
    const [products] = await db.query(productQuery);
    console.log('--- Products ---');
    console.log(products);

    // Fetch product_suppliers
    const [productSuppliers] = await db.query(`
        SELECT ps.*, s.supplier_name 
        FROM product_suppliers ps
        JOIN suppliers s ON ps.supplier_id = s.id
    `);
    console.log('--- Product Suppliers count ---', productSuppliers.length);

    // Fetch all stocks for this warehouse
    const [warehouseStocks] = await db.query(`
        SELECT * FROM warehouse_stocks WHERE warehouse_id = ?
    `, [warehouse_id]);
    console.log('--- Warehouse Stocks count ---', warehouseStocks.length);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
