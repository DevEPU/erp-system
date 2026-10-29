const db = require('../src/config/db');

async function checkProductSuppliers() {
    console.log('--- CHECKING PRODUCTS SUPPLIER_ID & NAMES ---');
    const targetCodes = ['EPCM-CDITONBLK', 'EPGS-KGRSPLK1Z', 'EPLB-KLABCIKVB', 'EPNS-KNSP4MKWW', 'EPPP-MPPGF20SP'];
    
    const [products] = await db.query(
        `SELECT p.id, p.product_code, p.product_name, p.supplier_id, s.supplier_name
         FROM products p
         LEFT JOIN suppliers s ON p.supplier_id = s.id
         WHERE p.product_code IN (?)`,
        [targetCodes]
    );

    console.log('Products:', products);

    // Let's also check if suppliers table has sample suppliers
    const [sups] = await db.query('SELECT id, supplier_name FROM suppliers LIMIT 10');
    console.log('Suppliers sample:', sups);

    process.exit(0);
}

checkProductSuppliers().catch(e => {
    console.error(e);
    process.exit(1);
});
