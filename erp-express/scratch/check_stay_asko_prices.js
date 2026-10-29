const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function checkStayAskoPrices() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== CHECKING STAY ASKI RH AND CAPLOCK NUT IN MD BOM.xlsx ===");
        const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const c2Code = row[6] || '';
            const c2Name = row[7] || '';
            const c2Price = row[10];

            const c3Code = row[13] || '';
            const c3Name = row[14] || '';
            const c3Price = row[17];

            if (c2Name.toUpperCase().includes('STAY') || c3Name.toUpperCase().includes('CAPLOCK') || c2Code.includes('KASKI') || c3Code.includes('CPLOC')) {
                console.log(`Row ${i} | L2 Code: ${c2Code} ("${c2Name}") Price L2 (Col K): ${c2Price} | L3 Code: ${c3Code} ("${c3Name}") Price L3 (Col R): ${c3Price}`);
            }
        }

        console.log("\n=== CHECKING BOM ITEMS IN MYSQL DATABASE ===");
        const [dbItems] = await connection.query(`
            SELECT id, bom_id, parent_item_id, item_type, product_code, product_name, price, qty
            FROM bom_items
            WHERE product_name LIKE '%STAY%' OR product_name LIKE '%CAPLOCK%' OR product_code LIKE '%KASKI%' OR product_code LIKE '%CPLOC%'
        `);
        console.table(dbItems);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkStayAskoPrices();
