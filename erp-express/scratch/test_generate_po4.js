const db = require('../src/config/db');

async function testGenerate() {
    console.log('--- TEST RUNNING GENERATE MRP FOR PO 4 ---');
    const po_customer_id = 4;

    const [poDetails] = await db.execute(
        'SELECT product_id, product_code, po_qty FROM customer_po_details WHERE po_id = ?',
        [po_customer_id]
    );

    console.log('poDetails:', poDetails);

    const requirementsMap = {};

    for (const item of poDetails) {
        console.log('Checking product_code:', item.product_code);
        const [bomRows] = await db.execute(
            "SELECT id, bom_code, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = 'Aktif' LIMIT 1",
            [item.product_code]
        );
        console.log('bomRows found:', bomRows);

        if (bomRows.length > 0) {
            const bom = bomRows[0];
            const fgQty = Number(bom.finished_good_qty) || 1;
            const bomRefStr = bom.bom_code || `BOM-${item.product_code}`;

            const [bomItems] = await db.execute(
                "SELECT product_code, qty, item_type FROM bom_items WHERE bom_id = ?",
                [bom.id]
            );

            console.log('bomItems found count:', bomItems.length);

            for (const bomItem of bomItems) {
                const [pRows] = await db.execute(
                    `SELECT p.id, p.product_name, p.product_code, p.product_unit, p.product_price, p.min_qty, p.supplier_id,
                            cat.category_name
                     FROM products p
                     LEFT JOIN categories cat ON p.category_id = cat.id
                     WHERE p.product_code = ? LIMIT 1`,
                    [bomItem.product_code]
                );

                if (pRows.length > 0) {
                    const rawProd = pRows[0];
                    const rawProductId = rawProd.id;
                    const qtyRequiredPerFG = Number(bomItem.qty);
                    
                    const baseGross = (Number(item.po_qty) / fgQty) * qtyRequiredPerFG;
                    const grossWithScrap = Math.ceil(baseGross * (1 + 0 / 100));

                    console.log(` -> Material: ${rawProd.product_code} (${rawProd.product_name}): item.po_qty=${item.po_qty}, fgQty=${fgQty}, qtyPerFG=${qtyRequiredPerFG} => baseGross=${baseGross}, grossWithScrap=${grossWithScrap}`);

                    if (!requirementsMap[rawProductId]) {
                        requirementsMap[rawProductId] = {
                            productId: rawProductId,
                            productCode: rawProd.product_code,
                            productName: rawProd.product_name,
                            grossQty: 0
                        };
                    }
                    requirementsMap[rawProductId].grossQty += grossWithScrap;
                } else {
                    console.log(` -> NOT FOUND IN PRODUCTS: ${bomItem.product_code}`);
                }
            }
        }
    }

    console.log('Final requirementsMap:', requirementsMap);
    process.exit(0);
}

testGenerate().catch(e => {
    console.error(e);
    process.exit(1);
});
