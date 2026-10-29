const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function insertMissingProducts() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== CHECKING PRODUCT CATEGORIES AND MISSING STO PRODUCTS ===");

        // Fetch categories
        const [categories] = await connection.query("SELECT id, category_name FROM categories");
        console.log("Existing product categories:", categories.map(c => `${c.id}:${c.category_name}`));

        // Read STO.xlsx
        const filePath = 'c:/laragon/www/erp-epu-main/STO.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Part No') || row.includes('Part name')));
        const headers = rawData[headerRowIdx];
        
        const partNoIdx = headers.indexOf('Part No');
        const partNameIdx = headers.indexOf('Part name');
        const classIdx = headers.indexOf('Class');
        const stoIdx = headers.indexOf('STO');

        const stoList = [];
        for (let i = headerRowIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row) continue;
            const code = row[partNoIdx] ? String(row[partNoIdx]).trim() : '';
            const name = row[partNameIdx] ? String(row[partNameIdx]).trim() : '';
            const itemClass = row[classIdx] ? String(row[classIdx]).trim() : 'Raw Material';
            let sto = row[stoIdx];
            sto = Number(sto) || 0;

            if (code || name) {
                stoList.push({ code, name, itemClass, sto });
            }
        }

        // Fetch current DB products
        const [dbProducts] = await connection.query("SELECT id, product_code, product_name FROM products");

        const missingList = [];
        for (const item of stoList) {
            let match = dbProducts.find(p => p.product_code && p.product_code.trim().toUpperCase() === item.code.toUpperCase());
            if (!match && item.name) {
                match = dbProducts.find(p => p.product_name && p.product_name.trim().toUpperCase() === item.name.toUpperCase());
            }
            if (!match && item.name) {
                const cleanStoName = item.name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
                match = dbProducts.find(p => {
                    const cleanDbName = p.product_name ? p.product_name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase() : '';
                    return cleanDbName === cleanStoName;
                });
            }

            if (!match) {
                missingList.push(item);
            }
        }

        console.log(`Found ${missingList.length} missing products to insert.`);

        // Map category helper
        const getCategoryId = (className) => {
            const upper = className.toUpperCase();
            if (upper.includes("FINISHED")) {
                const match = categories.find(c => c.category_name.toUpperCase().includes("FINISHED"));
                return match ? match.id : 1;
            }
            if (upper.includes("COMPONENT")) {
                const match = categories.find(c => c.category_name.toUpperCase().includes("COMPONENT"));
                return match ? match.id : 2;
            }
            if (upper.includes("RAW")) {
                const match = categories.find(c => c.category_name.toUpperCase().includes("RAW"));
                return match ? match.id : 3;
            }
            if (upper.includes("PACKAGING")) {
                const match = categories.find(c => c.category_name.toUpperCase().includes("PACKAGING"));
                return match ? match.id : 4;
            }
            if (upper.includes("STICKER") || upper.includes("LABEL")) {
                const match = categories.find(c => c.category_name.toUpperCase().includes("STICKER") || c.category_name.toUpperCase().includes("LABEL"));
                return match ? match.id : (categories.find(c => c.category_name.toUpperCase().includes("PACKAGING"))?.id || 4);
            }
            if (upper.includes("CRUSHER")) {
                const match = categories.find(c => c.category_name.toUpperCase().includes("CRUSHER"));
                return match ? match.id : (categories.find(c => c.category_name.toUpperCase().includes("RAW"))?.id || 3);
            }
            return 3;
        };

        // Determine unit helper
        const getUnit = (className) => {
            const upper = className.toUpperCase();
            if (upper.includes("RAW") || upper.includes("CRUSHER")) return "Kg";
            return "PCS";
        };

        let insertedCount = 0;

        for (const item of missingList) {
            const catId = getCategoryId(item.itemClass);
            const unit = getUnit(item.itemClass);

            const [res] = await connection.query(
                `INSERT INTO products 
                (product_code, product_name, product_type, category_id, product_price, purchase_price, product_quantity, product_unit, min_qty, max_qty, product_stock_alert, created_at, updated_at) 
                VALUES (?, ?, ?, ?, 0, 0, ?, ?, 0, 0, 0, NOW(), NOW())`,
                [item.code || `PROD-${Date.now()}`, item.name, item.itemClass, catId, item.sto, unit]
            );

            const newProductId = res.insertId;
            const isFG = catId === 1 || item.itemClass.toUpperCase().includes("FINISHED");
            const targetWarehouseId = isFG ? 3 : 1;

            // Insert into product_locations
            await connection.query(
                `INSERT INTO product_locations (product_id, warehouse_id, aisle, stock, min_qty, max_qty, created_at, updated_at) 
                VALUES (?, ?, 'A1', ?, 0, 0, NOW(), NOW())`,
                [newProductId, targetWarehouseId, item.sto]
            );

            insertedCount++;
        }

        console.log(`\n=== INSERT COMPLETED ===`);
        console.log(`Successfully inserted ${insertedCount} missing products into database!`);

        // Total products in DB now
        const [totalDb] = await connection.query("SELECT COUNT(*) as count FROM products");
        console.log(`Total products in database is now: ${totalDb[0].count}`);

    } catch (err) {
        console.error("Error inserting missing products:", err);
    } finally {
        await connection.end();
    }
}

insertMissingProducts();
