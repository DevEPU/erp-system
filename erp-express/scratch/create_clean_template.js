const Excel = require('exceljs');

(async () => {
    try {
        console.log("=== GENERATING CLEAN TEMPLATE ===");

        const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const outputPath = 'c:/laragon/www/erp-epu-main/Schedule_Delivery_Template_Clean.xlsx';

        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const validSheets = ['GINSA', 'TATA, GRAF', 'FSCM', 'HYMAN', 'SASA', 'MATERIAL'];

        const excelSerialToDateStr = (serial) => {
            if (typeof serial !== 'number') return String(serial);
            const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
            const Y = date.getUTCFullYear();
            const M = String(date.getUTCMonth() + 1).padStart(2, '0');
            const D = String(date.getUTCDate()).padStart(2, '0');
            return `${Y}-${M}-${D}`;
        };

        for (const sheetName of validSheets) {
            const ws = workbook.getWorksheet(sheetName);
            if (!ws) continue;

            // Get all raw values to find headers
            const rawData = [];
            ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
                rawData[rowNumber] = row.values;
            });

            const headerRowIdx = rawData.findIndex(row => row && row.includes && (row.includes('Name Part') || row.includes('Part name')));
            if (headerRowIdx === -1) continue;

            const headers = rawData[headerRowIdx];
            const namePartIdx = headers.indexOf('Name Part');
            const scheduleIdx = headers.indexOf('Schedule');
            const deviasiIdx = headers.indexOf('Deviasi');

            const dateCols = [];
            for (let c = 1; c < headers.length; c++) {
                const val = headers[c];
                if (typeof val === 'number' && val > 40000) {
                    dateCols.push(c);
                }
            }

            // Iterate over items
            ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                if (rowNumber <= headerRowIdx) return;

                const partNameVal = row.getCell(namePartIdx).value;
                const partName = partNameVal ? String(partNameVal).trim() : '';

                if (partName) {
                    // This is the Schedule row, row+1 is Act In, row+2 is Dev
                    const rSched = ws.getRow(rowNumber);
                    const rAct = ws.getRow(rowNumber + 1);
                    const rDev = ws.getRow(rowNumber + 2);

                    // Clear date cells
                    for (const colIdx of dateCols) {
                        rSched.getCell(colIdx).value = null;
                        rAct.getCell(colIdx).value = null;
                        rDev.getCell(colIdx).value = null;

                        // Reset style fonts or fills if needed, but let's keep the original styles!
                    }

                    // Clear totals
                    if (scheduleIdx !== -1) {
                        rSched.getCell(scheduleIdx).value = null;
                        rAct.getCell(scheduleIdx).value = null;
                        rDev.getCell(scheduleIdx).value = null;
                    }
                    if (deviasiIdx !== -1) {
                        rSched.getCell(deviasiIdx).value = null;
                        rAct.getCell(deviasiIdx).value = null;
                        rDev.getCell(deviasiIdx).value = null;
                    }

                    rSched.commit();
                    rAct.commit();
                    rDev.commit();
                }
            });

            // Convert remaining formula cells to values to avoid exceljs error on write
            ws.eachRow({ includeEmpty: true }, (row) => {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    if (cell.value && typeof cell.value === 'object' && (cell.value.formula || cell.value.sharedFormula)) {
                        cell.value = cell.value.result !== undefined ? cell.value.result : null;
                    }
                });
            });
        }

        await workbook.xlsx.writeFile(outputPath);
        console.log("SUCCESS: Created clean template!");

    } catch (e) {
        console.error("Clean template generation failed:", e);
    }
    process.exit(0);
})();
