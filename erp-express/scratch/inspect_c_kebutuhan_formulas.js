const xlsx = require('xlsx');

function inspectFormulas() {
    const f1 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-1.xlsx';
    const f2 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-2 Rev02.xlsx';

    const wb1 = xlsx.readFile(f1, { cellFormula: true });
    const s1 = wb1.Sheets['C. Kebutuhan'];

    console.log('=== MRP 1 C. Kebutuhan (First 10 rows formulas) ===');
    for (let r = 1; r <= 15; r++) {
        const row = {};
        for (let c = 0; c <= 16; c++) {
            const col = xlsx.utils.encode_col(c);
            const cell = s1[col + r];
            if (cell) {
                row[col] = cell.f ? `[FORMULA: ${cell.f} = ${cell.v}]` : cell.v;
            }
        }
        console.log(`Row ${r}:`, row);
    }

    const wb2 = xlsx.readFile(f2, { cellFormula: true });
    const s2 = wb2.Sheets['C. Kebutuhan'];

    console.log('\n=== MRP 2 C. Kebutuhan (First 10 rows formulas) ===');
    for (let r = 1; r <= 15; r++) {
        const row = {};
        for (let c = 0; c <= 16; c++) {
            const col = xlsx.utils.encode_col(c);
            const cell = s2[col + r];
            if (cell) {
                row[col] = cell.f ? `[FORMULA: ${cell.f} = ${cell.v}]` : cell.v;
            }
        }
        console.log(`Row ${r}:`, row);
    }
}

inspectFormulas();
