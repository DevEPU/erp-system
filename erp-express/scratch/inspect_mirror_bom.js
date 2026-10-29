const db = require('../src/config/db');

async function main() {
    try {
        const [boms] = await db.query("SELECT * FROM boms WHERE bom_name LIKE '%MIRROR%' OR bom_name LIKE '%FED%' OR bom_name LIKE '%ASDOM%' OR finished_good_name LIKE '%MIRROR%' OR finished_good_name LIKE '%FED%' OR finished_good_name LIKE '%ASDOM%'");
        console.log('Found BOMs:', boms);

        for (const bom of boms) {
            const [items] = await db.query(`
                SELECT bi.*, p2.id as raw_prod_id, p2.product_name, p2.product_unit, p2.product_price, p2.supplier_id, s.supplier_name, s.supplier_code
                FROM bom_items bi
                LEFT JOIN products p2 ON bi.product_code = p2.product_code
                LEFT JOIN suppliers s ON p2.supplier_id = s.id
                WHERE bi.bom_id = ?
            `, [bom.id]);
            console.log(`\n======================================================`);
            console.log(`BOM ID ${bom.id} | Name: ${bom.bom_name} | FG: [${bom.finished_good_code}] ${bom.finished_good_name} | Qty FG: ${bom.finished_good_qty}`);
            console.log(`======================================================`);
            console.table(items.map(it => ({
                product_code: it.product_code,
                product_name: it.product_name,
                item_type: it.item_type,
                unit: it.product_unit,
                bom_qty: it.qty,
                req_for_1000: Number(it.qty) * (1000 / (Number(bom.finished_good_qty) || 1)),
                supplier: it.supplier_name || 'N/A'
            })));
        }

        const [tables] = await db.query("SHOW TABLES LIKE '%schedule%'");
        console.log('\nSchedule tables:', tables);

        const [vCols] = await db.query("DESCRIBE vendor_schedules");
        console.log('\nvendor_schedules cols:', vCols.map(c => c.Field));

        const [rCols] = await db.query("SHOW TABLES LIKE '%receipt%'");
        console.log('\nReceipt tables:', rCols);

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
