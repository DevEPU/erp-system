const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function syncStoStocks() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== STARTING STO STOCK RESET & RE-POPULATION ===");

        // 1. Reset all stock in products table to 0
        const [resProdReset] = await connection.query("UPDATE products SET product_quantity = 0");
        console.log(`[RESET] Set product_quantity = 0 for all ${resProdReset.affectedRows} products in 'products' table.`);

        // 2. Reset all stock in product_locations table to 0
        const [resLocReset] = await connection.query("UPDATE product_locations SET stock = 0");
        console.log(`[RESET] Set stock = 0 for all ${resLocReset.affectedRows} entries in 'product_locations' table.`);

        // 3. Read STO.xlsx
        const filePath = 'c:/laragon/www/erp-epu-main/STO.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Part No') || row.includes('Part name')));
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
        const [dbProducts] = await connection.query("SELECT id, product_code, product_name, category_id, product_type FROM products");

        let updatedCount = 0;
        let matchedCount = 0;

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
                await connection.query("UPDATE products SET product_quantity = ? WHERE id = ?", [newStock, match.id]);

                // Determine warehouse: Finished Goods -> warehouse_id 3, else 1
                const isFG = match.category_id === 1 || String(match.product_type).toUpperCase().includes('FINISHED');
                const targetWarehouseId = isFG ? 3 : 1;

                // Check if product_location row exists
                const [locRows] = await connection.query("SELECT id FROM product_locations WHERE product_id = ?", [match.id]);
                if (locRows.length > 0) {
                    await connection.query("UPDATE product_locations SET stock = ?, warehouse_id = ? WHERE id = ?", [newStock, targetWarehouseId, locRows[0].id]);
                } else {
                    await connection.query("INSERT INTO product_locations (product_id, warehouse_id, aisle, stock) VALUES (?, ?, 'A1', ?)", [match.id, targetWarehouseId, newStock]);
                }

                if (newStock > 0) {
                    updatedCount++;
                }
            }
        }

        console.log(`\n=== STO STOCK UPDATE COMPLETED ===`);
        console.log(`Matched Products: ${matchedCount}`);
        console.log(`Products Updated with Stock > 0: ${updatedCount}`);

        // Verify top products with non-zero stock
        const [sampleProducts] = await connection.query("SELECT id, product_code, product_name, product_quantity FROM products WHERE product_quantity > 0 ORDER BY product_quantity DESC LIMIT 15");
        console.log("\nSample Top Stock Products in Database:");
        console.table(sampleProducts);

    } catch (err) {
        console.error("Error syncing STO stocks:", err);
    } finally {
        await connection.end();
    }
}

syncStoStocks();
