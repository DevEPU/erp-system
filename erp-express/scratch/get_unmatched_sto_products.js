const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function getUnmatchedProducts() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
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

        console.log(`Column Indexes -> Part No: ${partNoIdx}, Part Name: ${partNameIdx}, Class: ${classIdx}, STO: ${stoIdx}`);

        const stoList = [];
        for (let i = headerRowIdx + 1; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row) continue;
            const code = row[partNoIdx] ? String(row[partNoIdx]).trim() : '';
            const name = row[partNameIdx] ? String(row[partNameIdx]).trim() : '';
            const itemClass = row[classIdx] ? String(row[classIdx]).trim() : '-';
            let sto = row[stoIdx];
            sto = Number(sto) || 0;

            if (code || name) {
                stoList.push({ code, name, itemClass, sto });
            }
        }

        const [dbProducts] = await connection.query("SELECT id, product_code, product_name FROM products");

        const unmatchedList = [];

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
                unmatchedList.push(item);
            }
        }

        console.log(`\nFound ${unmatchedList.length} products in STO.xlsx that do NOT exist in the Database.`);
        console.log(JSON.stringify(unmatchedList, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

getUnmatchedProducts();
