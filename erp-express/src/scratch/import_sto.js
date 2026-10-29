const db = require('../config/db');
const xlsx = require('xlsx');
const path = require('path');

(async () => {
    try {
        console.log("=== STARTING STO STOCK IMPORT ===");

        // 1. Reset all stock in products table to 0
        const [resProdReset] = await db.query("UPDATE products SET product_quantity = 0");
        console.log(`[RESET] Set product_quantity = 0 for all ${resProdReset.affectedRows} products in 'products' table.`);

        // 2. Reset all stock in product_locations table to 0
        const [resLocReset] = await db.query("UPDATE product_locations SET stock = 0");
        console.log(`[RESET] Set stock = 0 for all ${resLocReset.affectedRows} entries in 'product_locations' table.`);

        // 3. Read c:\laragon\www\erp-epu-main\STO.xlsx
        const filePath = path.join('c:', 'laragon', 'www', 'erp-epu-main', 'STO.xlsx');
        console.log("Reading file:", filePath);
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Part No') || row.includes('Part name')));
        if (headerRowIdx === -1) {
            throw new Error("Could not find header row containing 'Part No' or 'Part name' in STO.xlsx");
        }
        const headers = rawData[headerRowIdx];
        const partNoIdx = headers.indexOf('Part No');
        const partNameIdx = headers.indexOf('Part name');
        const stoIdx = headers.indexOf('STO');

        const stoList = [];
        for (let i = headerRowIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row) continue;
            const code = row[partNoIdx] ? String(row[partNoIdx]).trim() : '';
            const name = row[partNameIdx] ? String(row[partNameIdx]).trim() : '';
            let sto = row[stoIdx];
            sto = Number(sto) || 0;
            if (code || name) {
                stoList.push({ code, name, sto });
            }
        }

        console.log(`[EXCEL] Found ${stoList.length} items in STO.xlsx.`);

        // 4. Fetch all DB products
        const [dbProducts] = await db.query("SELECT id, product_code, product_name, category_id, product_type FROM products");

        let updatedCount = 0;
        let matchedCount = 0;
        let unmatchedList = [];

        for (const stoItem of stoList) {
            // Find match by code or name
            let match = dbProducts.find(p => p.product_code && p.product_code.trim().toUpperCase() === stoItem.code.toUpperCase());
            if (!match && stoItem.name) {
                match = dbProducts.find(p => p.product_name && p.product_name.trim().toUpperCase() === stoItem.name.toUpperCase());
            }
            if (!match && stoItem.name) {
                const cleanStoName = stoItem.name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
                match = dbProducts.find(p => {
                    const cleanDbName = p.product_name ? p.product_name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase() : '';
                    return cleanDbName === cleanStoName;
                });
            }

            if (match) {
                matchedCount++;
                const newStock = stoItem.sto;

                // Update products table
                await db.query("UPDATE products SET product_quantity = ? WHERE id = ?", [newStock, match.id]);

                // Determine warehouse: Finished Goods -> warehouse_id 3, else 1
                const isFG = match.category_id === 1 || String(match.product_type).toUpperCase().includes('FINISHED');
                const targetWarehouseId = isFG ? 3 : 1;

                // Check if product_location row exists
                const [locRows] = await db.query("SELECT id FROM product_locations WHERE product_id = ?", [match.id]);
                if (locRows.length > 0) {
                    await db.query("UPDATE product_locations SET stock = ?, warehouse_id = ? WHERE id = ?", [newStock, targetWarehouseId, locRows[0].id]);
                } else {
                    await db.query("INSERT INTO product_locations (product_id, warehouse_id, aisle, stock) VALUES (?, ?, 'A1', ?)", [match.id, targetWarehouseId, newStock]);
                }

                if (newStock > 0) {
                    updatedCount++;
                }
            } else {
                unmatchedList.push(stoItem);
            }
        }

        console.log(`\n=== STO STOCK IMPORT COMPLETED ===`);
        console.log(`Matched Products: ${matchedCount}`);
        console.log(`Products Updated with Stock > 0: ${updatedCount}`);
        console.log(`Unmatched Products Count: ${unmatchedList.length}`);
        if (unmatchedList.length > 0) {
            console.log("Sample Unmatched (first 5):", unmatchedList.slice(0, 5));
        }

        // Verify top products with non-zero stock
        const [sampleProducts] = await db.query("SELECT id, product_code, product_name, product_quantity FROM products WHERE product_quantity > 0 ORDER BY product_quantity DESC LIMIT 10");
        console.log("\nSample Top Stock Products in Database:");
        console.log(JSON.stringify(sampleProducts, null, 2));

    } catch (err) {
        console.error("Error syncing STO stocks:", err);
    }
    process.exit(0);
})();
