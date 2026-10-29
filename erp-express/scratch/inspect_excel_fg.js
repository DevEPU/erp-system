const XLSX = require('xlsx');

function run() {
  const wb = XLSX.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  const ws = wb.Sheets['4. MD Vendor'];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  
  const searchCodes = [
    'EPPL-ELMNTK60R',
    'EPCV-FCVACLK1A',
    'EPCS-FCSEACK1A',
    'EPPL-ELMNTK0JA'
  ];

  console.log('Searching for codes in Excel...');
  rawData.forEach((row, i) => {
    const partNo = String(row[3] || '').trim();
    if (searchCodes.includes(partNo) || searchCodes.some(sc => partNo.includes(sc))) {
      console.log(`\nFound at Row ${i}:`);
      row.forEach((val, idx) => {
        if (val !== undefined && val !== null && val !== '') {
          console.log(`  Col ${idx}: ${val}`);
        }
      });
    }
  });
}

run();
