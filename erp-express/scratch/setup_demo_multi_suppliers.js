const db = require('../src/config/db');

async function setupDemoMultiSuppliers() {
    console.log('--- SETTING UP MULTI-SUPPLIERS FOR DEMO PRODUCTS IN product_suppliers ---');

    const demoMultiSuppliers = [
        // DITON (4970)
        { product_id: 4970, supplier_id: 68, part_number: 'EPCM-CDITONBLK', price: 79900, is_primary: 1 }, // MJI
        { product_id: 4970, supplier_id: 63, part_number: 'EPCM-CDITONBLK-ALT', price: 78500, is_primary: 0 }, // CV Murni Cahaya Pratama

        // GUARD SPLASH RR (4978)
        { product_id: 4978, supplier_id: 46, part_number: 'EPGS-KGRSPLK1Z-01', price: 3221, is_primary: 1 }, // ET
        { product_id: 4978, supplier_id: 47, part_number: 'EPGS-KGRSPLK1Z-02', price: 3150, is_primary: 0 }, // DPM

        // LABEL COOLANT (4986)
        { product_id: 4986, supplier_id: 45, part_number: 'EPLB-KLABCIKVB-01', price: 150, is_primary: 1 }, // GIP
        { product_id: 4986, supplier_id: 49, part_number: 'EPLB-KLABCIKVB-02', price: 145, is_primary: 0 }, // ASTRA

        // NUT SPRING 4 MM (5004)
        { product_id: 5004, supplier_id: 45, part_number: 'EPNS-KNSP4MKWW-01', price: 340, is_primary: 1 }, // GIP
        { product_id: 5004, supplier_id: 48, part_number: 'EPNS-KNSP4MKWW-02', price: 335, is_primary: 0 }, // ICHP

        // PP GF 20 SP (5020)
        { product_id: 5020, supplier_id: 59, part_number: 'EPPP-MPPGF20SP-01', price: 15000, is_primary: 1 }, // MBS
        { product_id: 5020, supplier_id: 60, part_number: 'EPPP-MPPGF20SP-02', price: 14800, is_primary: 0 }  // PT Adyabina Putramas
    ];

    for (const item of demoMultiSuppliers) {
        // Check if exists
        const [existing] = await db.query(
            'SELECT id FROM product_suppliers WHERE product_id = ? AND supplier_id = ?',
            [item.product_id, item.supplier_id]
        );

        if (existing.length === 0) {
            await db.query(
                `INSERT INTO product_suppliers (product_id, supplier_id, supplier_part_number, purchase_price, is_primary, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
                [item.product_id, item.supplier_id, item.part_number, item.price, item.is_primary]
            );
            console.log(`Inserted product_supplier for product ${item.product_id}, supplier ${item.supplier_id}`);
        } else {
            await db.query(
                `UPDATE product_suppliers SET supplier_part_number = ?, purchase_price = ?, is_primary = ? WHERE id = ?`,
                [item.part_number, item.price, item.is_primary, existing[0].id]
            );
            console.log(`Updated product_supplier for product ${item.product_id}, supplier ${item.supplier_id}`);
        }
    }

    process.exit(0);
}

setupDemoMultiSuppliers().catch(e => {
    console.error(e);
    process.exit(1);
});
