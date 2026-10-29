const Excel = require('exceljs');

(async () => {
    const workbook = new Excel.Workbook();
    await workbook.xlsx.readFile('c:/laragon/www/erp-epu-main/Schedule Delivery Agustus 2026.xlsx');
    const ws = workbook.getWorksheet('GINSA');
    
    // Let's print cells of Row 4 (Schedule), Row 5 (Act In), Row 6 (Dev) for columns H, I, J, K
    const columns = [8, 9, 10, 11]; // H, I, J, K (1-based)
    for (let r = 4; r <= 6; r++) {
        const row = ws.getRow(r);
        console.log(`\n=== Row ${r} ===`);
        columns.forEach(c => {
            const cell = row.getCell(c);
            console.log(`Col ${c} (${cell.address}): value=${JSON.stringify(cell.value)}, type=${cell.type}, fill=${JSON.stringify(cell.fill)}`);
        });
    }
})();
