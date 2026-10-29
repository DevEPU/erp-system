const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function updateFGSellPrices() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== STARTING FG SELLING PRICE UPDATE FROM Customer & Part FG.xlsx ===");

        const filePath = 'c:/laragon/www/erp-epu-main/Customer & Part FG.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const headerRowIdx = 0;
        const headers = rawData[headerRowIdx];
        console.log("Headers:", headers);

        // Fetch all products from DB
        const [dbProducts] = await connection.query("SELECT id, product_code, product_name, product_price FROM products");

        let matchedCount = 0;
        let updatedCount = 0;
        let notFoundCount = 0;

        const notFoundList = [];

        for (let i = headerRowIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length < 5) continue;

            const customer = row[1] ? String(row[1]).trim() : '';
            const code = row[2] ? String(row[2]).trim() : '';
            const name = row[3] ? String(row[3]).trim() : '';
            const price = Number(row[4]) || 0;

            if (!code && !name) continue;

            // Find product in DB
            let p = dbProducts.find(prod => prod.product_code && code && prod.product_code.trim().toUpperCase() === code.trim().toUpperCase());
            if (!p && name) {
                p = dbProducts.find(prod => prod.product_name && prod.product_name.trim().toUpperCase() === name.trim().toUpperCase());
            }
            if (!p && name) {
                const cleanName = name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
                p = dbProducts.find(prod => {
                    const cleanDbName = prod.product_name ? prod.product_name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase() : '';
                    return cleanDbName === cleanName;
                });
            }

            if (p) {
                matchedCount++;
                // Update products table product_price
                await connection.query("UPDATE products SET product_price = ? WHERE id = ?", [price, p.id]);

                // Check product_units table
                const [units] = await connection.query("SELECT id FROM product_units WHERE product_id = ? AND level = 1", [p.id]);
                if (units.length > 0) {
                    await connection.query("UPDATE product_units SET sell_price = ? WHERE product_id = ? AND level = 1", [price, p.id]);
                } else {
                    await connection.query(
                        "INSERT INTO product_units (product_id, unit_name, level, conversion_factor, buy_price, sell_price, is_default, created_at, updated_at) VALUES (?, ?, 1, 1.00, 0, ?, 1, NOW(), NOW())",
                        [p.id, p.product_unit || 'PCS', price]
                    );
                }

                updatedCount++;
                console.log(`[UPDATED] Code: ${p.product_code} | Name: "${p.product_name}" -> Harga Jual: Rp ${price.toLocaleString('id-ID')}`);
            } else {
                notFoundCount++;
                notFoundList.push({ code, name, price });
            }
        }

        console.log(`\n=== FG SELLING PRICE UPDATE SUMMARY ===`);
        console.log(`Total rows processed: ${rawData.length - 1}`);
        console.log(`Matched & Updated: ${updatedCount}`);
        console.log(`Not Found in DB: ${notFoundCount}`);

        if (notFoundList.length > 0) {
            console.log("\nUnmatched Items Preview:", notFoundList);
        }

    } catch (err) {
        console.error("Error updating FG prices:", err);
    } finally {
        await connection.end();
    }
}

updateFGSellPrices();
