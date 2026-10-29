const db = require('../config/db');
const xlsx = require('xlsx');
const path = require('path');

(async () => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();

        const filePath = path.join('c:', 'laragon', 'www', 'erp-epu-main', 'Customer & Part FG.xlsx');
        console.log('Opening file:', filePath);
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsx.utils.sheet_to_json(sheet);

        console.log(`Starting import of ${rows.length} molds...`);

        let insertedCount = 0;
        for (const row of rows) {
            const component = String(row['Component']).trim();
            const matDesc = String(row['Material Description']).trim();
            if (!component || !matDesc) continue;

            // Generate Mold Code
            const parts = component.split('-');
            const suffix = parts.slice(1).join('-');
            const moldCode = `MOLD-${suffix}`;

            // Find Product ID
            const [pRows] = await conn.execute('SELECT id FROM products WHERE product_code = ?', [component]);
            if (pRows.length === 0) {
                console.log(`WARNING: Product not found for code ${component}, skipping.`);
                continue;
            }
            const productId = pRows[0].id;

            // Check if mold code already exists
            const [mRows] = await conn.execute('SELECT id FROM molds WHERE code = ?', [moldCode]);
            let moldId;
            if (mRows.length > 0) {
                moldId = mRows[0].id;
                // Update name & description just in case
                await conn.execute(
                    'UPDATE molds SET name = ?, description = ? WHERE id = ?',
                    [matDesc, `Mold untuk part ${matDesc} (${component})`, moldId]
                );
            } else {
                // Insert new mold
                const [result] = await conn.execute(
                    'INSERT INTO molds (code, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, NOW(), NOW())',
                    [moldCode, matDesc, `Mold untuk part ${matDesc} (${component})`]
                );
                moldId = result.insertId;
                insertedCount++;
            }

            // Check if link in mold_products already exists
            const [mpRows] = await conn.execute('SELECT id FROM mold_products WHERE mold_id = ? AND product_id = ?', [moldId, productId]);
            if (mpRows.length === 0) {
                await conn.execute(
                    'INSERT INTO mold_products (mold_id, product_id, created_at) VALUES (?, ?, NOW())',
                    [moldId, productId]
                );
            }
        }

        await conn.commit();
        console.log(`SUCCESS: Successfully processed molds. Inserted new: ${insertedCount}.`);
    } catch (e) {
        await conn.rollback();
        console.error('Import failed, rolled back.', e);
    } finally {
        conn.release();
    }
    process.exit(0);
})();
