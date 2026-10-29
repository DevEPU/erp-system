const db = require('../src/config/db');

async function checkProductVariants() {
    console.log('--- CHECKING PRODUCTS MATCHING NUT SPRING 4 MM ---');
    
    const [products] = await db.query(`
        SELECT p.id, p.product_code, p.product_name, p.supplier_id, p.product_price, s.supplier_code, s.supplier_name
        FROM products p
        LEFT JOIN suppliers s ON p.supplier_id = s.id
        WHERE p.product_code LIKE 'EPNS-KNSP4MK%' OR p.product_name LIKE '%NUT SPRING 4 MM%'
    `);

    console.log('Found product rows:', products);

    // Check product_suppliers table for these products as well
    const productIds = products.map(p => p.id);
    if (productIds.length > 0) {
        const [ps] = await db.query(`
            SELECT ps.*, s.supplier_name, s.supplier_code
            FROM product_suppliers ps
            LEFT JOIN suppliers s ON ps.supplier_id = s.id
            WHERE ps.product_id IN (?)
        `, [productIds]);
        console.log('\nproduct_suppliers rows:', ps);
    }

    process.exit(0);
}

checkProductVariants().catch(e => {
    console.error(e);
    process.exit(1);
});
