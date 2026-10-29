const db = require('../src/config/db');

async function setupProductSuppliers() {
    console.log('--- LINKING PRODUCTS TO SUPPLIERS ---');

    // Supplier definitions
    const supplierList = [
        { code: 'MJI', name: 'PT Mitra Juragan Indonesia (MJI)' },
        { code: 'GIP', name: 'PT. Ginsa Inti Pratama (GIP)' },
        { code: 'ET', name: 'PT Eran Teknikatama (ET)' },
        { code: 'MBS', name: 'PT Menara Berkah Sentosa (MBS)' },
        { code: 'ASTRA', name: 'PT Astra Komponen Indonesia' }
    ];

    const supplierMap = {};

    for (const sup of supplierList) {
        const [existing] = await db.query('SELECT id, supplier_name FROM suppliers WHERE supplier_name LIKE ? LIMIT 1', [`%${sup.code}%`]);
        if (existing.length > 0) {
            supplierMap[sup.code] = existing[0].id;
            console.log(`Found supplier ${sup.code}: ID ${existing[0].id} (${existing[0].supplier_name})`);
        } else {
            const [ins] = await db.query(
                'INSERT INTO suppliers (supplier_code, supplier_name, created_at, updated_at) VALUES (?, ?, NOW(), NOW())',
                [sup.code, sup.name]
            );
            supplierMap[sup.code] = ins.insertId;
            console.log(`Inserted supplier ${sup.code}: ID ${ins.insertId} (${sup.name})`);
        }
    }

    // Assign default supplier_id to products
    const productSupplierMap = [
        { code: 'EPCM-CDITONBLK', supCode: 'MJI' },     // DITON -> PT Mitra Juragan Indonesia (MJI)
        { code: 'EPGS-KGRSPLK1Z', supCode: 'ET' },      // GUARD SPLASH RR -> PT Eran Teknikatama (ET)
        { code: 'EPLB-KLABCIKVB', supCode: 'GIP' },     // LABEL COOLANT -> PT. Ginsa Inti Pratama (GIP)
        { code: 'EPNS-KNSP4MKWW', supCode: 'GIP' },     // NUT SPRING 4 MM -> PT. Ginsa Inti Pratama (GIP)
        { code: 'EPPP-MPPGF20SP', supCode: 'MBS' }      // PP GF 20 SP -> PT Menara Berkah Sentosa (MBS)
    ];

    for (const item of productSupplierMap) {
        const supId = supplierMap[item.supCode];
        await db.query('UPDATE products SET supplier_id = ? WHERE product_code = ?', [supId, item.code]);
        console.log(`Updated product ${item.code} -> supplier_id: ${supId}`);
    }

    process.exit(0);
}

setupProductSuppliers().catch(e => {
    console.error(e);
    process.exit(1);
});
