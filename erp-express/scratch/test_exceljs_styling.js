const Excel = require('exceljs');

(async () => {
    try {
        console.log("=== TESTING EXCELJS STYLING ===");

        const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const outputPath = 'c:/laragon/www/erp-epu-main/Schedule_Delivery_Styled_ExcelJS.xlsx';

        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const ws = workbook.getWorksheet('GINSA');
        
        // Let's modify cell I6 (Dev cell) to -500 and color it red
        const cell = ws.getCell('I6');
        cell.value = -500;
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFC7CE' } // Light red
        };
        cell.font = {
            color: { argb: 'FF9C0006' }, // Dark red
            bold: true,
            size: 9
        };

        // Let's modify cell J6 (Dev cell) to +1200 and color it green
        const cellJ = ws.getCell('J6');
        cellJ.value = 1200;
        cellJ.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFC6EFCE' } // Light green
        };
        cellJ.font = {
            color: { argb: 'FF006100' }, // Dark green
            bold: true,
            size: 9
        };

        // Convert formulas to values to prevent shared formula errors
        ws.eachRow({ includeEmpty: true }, (row) => {
            row.eachCell({ includeEmpty: true }, (c) => {
                if (c.value && typeof c.value === 'object' && (c.value.formula || c.value.sharedFormula)) {
                    c.value = c.value.result !== undefined ? c.value.result : 0;
                }
            });
        });

        await workbook.xlsx.writeFile(outputPath);
        console.log("SUCCESS: Styled workbook saved cleanly!");

    } catch (e) {
        console.error("Styling test failed:", e);
    }
    process.exit(0);
})();
