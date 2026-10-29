const mysql = require('mysql2/promise');
const xlsx = require('xlsx');

async function testBomMatching() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

        const [dbProducts] = await connection.query("SELECT id, product_code, product_name, product_unit, purchase_price, product_price FROM products");
        console.log(`Database has ${dbProducts.length} products.`);

        const findProd = (code, name) => {
            if (!code && !name) return null;
            let m = dbProducts.find(p => p.product_code && code && p.product_code.trim().toUpperCase() === code.trim().toUpperCase());
            if (!m && name) {
                m = dbProducts.find(p => p.product_name && p.product_name.trim().toUpperCase() === name.trim().toUpperCase());
            }
            if (!m && name) {
                const cleanName = name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase();
                m = dbProducts.find(p => {
                    const cleanDbName = p.product_name ? p.product_name.replace(/\s*\([^)]+\)\s*$/, '').trim().toUpperCase() : '';
                    return cleanDbName === cleanName;
                });
            }
            return m;
        };

        const missingProds = [];

        for (let i = 2; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;

            const fgCode = row[3] ? String(row[3]).trim() : '';
            const fgName = row[4] ? String(row[4]).trim() : '';
            if (fgCode && !findProd(fgCode, fgName)) {
                missingProds.push({ code: fgCode, name: fgName, type: 'Finished Goods' });
            }

            const c2Code = row[6] ? String(row[6]).trim() : '';
            const c2Name = row[7] ? String(row[7]).trim() : '';
            if (c2Code && !findProd(c2Code, c2Name)) {
                missingProds.push({ code: c2Code, name: c2Name, type: 'Component Layer 2' });
            }

            const c3Code = row[13] ? String(row[13]).trim() : '';
            const c3Name = row[14] ? String(row[14]).trim() : '';
            if (c3Code && !findProd(c3Code, c3Name)) {
                missingProds.push({ code: c3Code, name: c3Name, type: 'Component Layer 3' });
            }

            const c4Code = row[20] ? String(row[20]).trim() : '';
            const c4Name = row[21] ? String(row[21]).trim() : '';
            if (c4Code && !findProd(c4Code, c4Name)) {
                missingProds.push({ code: c4Code, name: c4Name, type: 'Component Layer 4' });
            }
        }

        // Deduplicate missing products
        const uniqueMissing = [];
        const seen = new Set();
        for (const item of missingProds) {
            if (!seen.has(item.code)) {
                seen.add(item.code);
                uniqueMissing.push(item);
            }
        }

        console.log(`Missing products count: ${uniqueMissing.length}`);
        if (uniqueMissing.length > 0) {
            console.log("Missing items preview:", uniqueMissing);
        } else {
            console.log("100% of FG and Component items in MD BOM.xlsx match existing products in the Database!");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

testBomMatching();
