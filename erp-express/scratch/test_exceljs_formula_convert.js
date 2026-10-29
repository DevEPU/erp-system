const Excel = require('exceljs');

(async () => {
    try {
        console.log("=== TESTING EXCELJS FORMULA CONVERSION WORKAROUND ===");

        const templatePath = 'c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx';
        const outputPath = 'c:/laragon/www/erp-epu-main/Schedule_Delivery_Exported_ExcelJS_Test.xlsx';

        const workbook = new Excel.Workbook();
        await workbook.xlsx.readFile(templatePath);

        const validSheets = ['GINSA', 'TATA, GRAF', 'FSCM', 'HYMAN', 'SASA', 'MATERIAL'];

        for (const sheetName of validSheets) {
            const ws = workbook.getWorksheet(sheetName);
            if (!ws) continue;

            ws.eachRow({ includeEmpty: true }, (row) => {
                row.eachCell({ includeEmpty: true }, (cell) => {
                    // Check if it is a formula cell
                    if (cell.value && typeof cell.value === 'object' && (cell.value.formula || cell.value.sharedFormula)) {
                        // Convert to static value (or result) to break the shared formula reference
                        const resultVal = cell.value.result !== undefined ? cell.value.result : 0;
                        cell.value = resultVal;
                    }
                });
            });
        }

        await workbook.xlsx.writeFile(outputPath);
        console.log("SUCCESS: Saved workbook with exceljs after converting formula cells!");

    } catch (e) {
        console.error("Failed to save using formula convert workaround:", e);
    }
    process.exit(0);
})();
