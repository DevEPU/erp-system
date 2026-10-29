const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function testMatching() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        // Read STO Excel
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

        // Get DB products
        const [dbProducts] = await connection.query("SELECT id, product_code, product_name, product_quantity FROM products");
        console.log(`Database has ${dbProducts.length} total products.`);

        let matchedByCode = 0;
        let matchedByName = 0;
        let unmatchedSto = 0;

        const updatesMap = new Map();

        for (const stoItem of stoList) {
            let match = dbProducts.find(p => p.product_code && p.product_code.trim().toUpperCase() === stoItem.code.toUpperCase());
            if (match) {
                matchedByCode++;
                updatesMap.set(match.id, stoItem.sto);
                continue;
            }

            match = dbProducts.find(p => p.product_name && p.product_name.trim().toUpperCase() === stoItem.name.toUpperCase());
            if (match) {
                matchedByName++;
                updatesMap.set(match.id, stoItem.sto);
                continue;
            }

            // Fuzzy/clean name match
            const cleanStoName = stoItem.name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
            match = dbProducts.find(p => {
                const cleanDbName = p.product_name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
                return cleanDbName === cleanStoName;
            });

            if (match) {
                matchedByName++;
                updatesMap.set(match.id, stoItem.sto);
                continue;
            }

            unmatchedSto++;
            console.log(`Unmatched STO row: Code="${stoItem.code}", Name="${stoItem.name}", STO=${stoItem.sto}`);
        }

        console.log(`\nMatching Summary:`);
        console.log(`Matched by Code: ${matchedByCode}`);
        console.log(`Matched by Name: ${matchedByName}`);
        console.log(`Unmatched STO items: ${unmatchedSto}`);
        console.log(`Unique products to update stock: ${updatesMap.size}`);

        // Inspect locations table
        const [tables] = await connection.query("SHOW TABLES LIKE '%location%'");
        console.log("\nLocation tables:", tables);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

testMatching();
