const xlsx = require('xlsx');

function checkAllCKebutuhan() {
    const f1 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-1.xlsx';
    const f2 = 'c:/laragon/www/erp-epu-main/8. Agustus 2026 MRP-2 Rev02.xlsx';

    const wb1 = xlsx.readFile(f1);
    const dataC1 = xlsx.utils.sheet_to_json(wb1.Sheets['C. Kebutuhan'], { header: 1 });

    console.log('=== MRP 1 C. Kebutuhan Column Analysis ===');
    console.log('Row 0 (WD):', dataC1[0]);
    console.log('Row 1 (Level):', dataC1[1]);
    console.log('Row 2 (Headers):', dataC1[2]);
    console.log('Row 3 (1st Item - Band 48):', dataC1[3]);
    console.log('Row 4 (2nd Item - Seat Lock K0JA):', dataC1[4]);
    console.log('Row 5 (3rd Item - Seat Lock K3VA):', dataC1[5]);

    const wb2 = xlsx.readFile(f2);
    const dataC2 = xlsx.utils.sheet_to_json(wb2.Sheets['C. Kebutuhan'], { header: 1 });

    console.log('\n=== MRP 2 C. Kebutuhan Column Analysis ===');
    console.log('Row 0 (WD):', dataC2[0]);
    console.log('Row 1 (Level):', dataC2[1]);
    console.log('Row 2 (Headers):', dataC2[2]);
    console.log('Row 3 (1st Item - Band 48):', dataC2[3]);
    console.log('Row 4 (2nd Item - Seat Lock K0JA):', dataC2[4]);
    console.log('Row 5 (3rd Item - Seat Lock K3VA):', dataC2[5]);
}

checkAllCKebutuhan();
