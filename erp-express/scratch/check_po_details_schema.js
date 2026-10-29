const db = require('../src/config/db');

async function testPODetails() {
    console.log('--- CUSTOMER PO DETAILS SCHEMA & SAMPLE DATA ---');
    const [cols] = await db.query('DESCRIBE customer_po_details');
    console.log('Columns in customer_po_details:', cols.map(c => c.Field));

    const [sample] = await db.query('SELECT * FROM customer_po_details LIMIT 5');
    console.log('Sample rows in customer_po_details:', sample);

    console.log('--- CUSTOMER PO HEADER SAMPLE ---');
    const [poHeader] = await db.query('SELECT * FROM customer_po ORDER BY id DESC LIMIT 5');
    console.log('Sample customer_po headers:', poHeader);

    console.log('--- BOM SAMPLE DATA ---');
    const [boms] = await db.query('SELECT * FROM boms LIMIT 5');
    console.log('Sample boms:', boms);

    const [bomItems] = await db.query('SELECT * FROM bom_items LIMIT 10');
    console.log('Sample bom_items:', bomItems);

    process.exit(0);
}

testPODetails().catch(e => {
    console.error(e);
    process.exit(1);
});
