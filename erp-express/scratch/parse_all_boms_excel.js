const xlsx = require('xlsx');

function parseAllBoms() {
    const filePath = 'c:/laragon/www/erp-epu-main/MD BOM.xlsx';
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

    const headerRowIdx = 1;
    const headers = rawData[headerRowIdx];
    console.log("Headers:", headers);

    const bomsMap = new Map();

    for (let i = headerRowIdx + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const fgCode = row[3] ? String(row[3]).trim() : '';
        const fgName = row[4] ? String(row[4]).trim() : '';
        if (!fgCode) continue;

        if (!bomsMap.has(fgCode)) {
            bomsMap.set(fgCode, {
                fgCode,
                fgName,
                rows: []
            });
        }

        const comp2Code = row[6] ? String(row[6]).trim() : '';
        const comp2Name = row[7] ? String(row[7]).trim() : '';
        const comp2Qty = row[8] !== undefined ? Number(row[8]) : 0;
        const comp2Unit = row[9] ? String(row[9]).trim() : 'Pcs';
        const comp2Price = row[10] !== undefined ? Number(row[10]) : 0;

        const comp3Code = row[13] ? String(row[13]).trim() : '';
        const comp3Name = row[14] ? String(row[14]).trim() : '';
        const comp3Qty = row[15] !== undefined ? Number(row[15]) : 0;
        const comp3Unit = row[16] ? String(row[16]).trim() : 'Pcs';
        const comp3Price = row[17] !== undefined ? Number(row[17]) : 0;

        const comp4Code = row[20] ? String(row[20]).trim() : '';
        const comp4Name = row[21] ? String(row[21]).trim() : '';
        const comp4Qty = row[22] !== undefined ? Number(row[22]) : 0;
        const comp4Unit = row[23] ? String(row[23]).trim() : 'Pcs';

        bomsMap.get(fgCode).rows.push({
            comp2Code, comp2Name, comp2Qty, comp2Unit, comp2Price,
            comp3Code, comp3Name, comp3Qty, comp3Unit, comp3Price,
            comp4Code, comp4Name, comp4Qty, comp4Unit
        });
    }

    console.log(`\nFound ${bomsMap.size} Unique Finished Goods BOMs in MD BOM.xlsx:`);
    for (const [code, bom] of bomsMap.entries()) {
        console.log(`- FG Code: ${code} | Name: "${bom.fgName}" | Excel Rows: ${bom.rows.length}`);
    }
}

parseAllBoms();
