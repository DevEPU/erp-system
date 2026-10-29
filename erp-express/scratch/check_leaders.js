const xlsx = require('xlsx');

const wb = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');

['Mapping Group', 'Sum Per Group', '1'].forEach(sheetName => {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return;
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n=== CHECKING LEADERS IN SHEET: ${sheetName} ===`);
  rows.forEach((r, idx) => {
    const str = JSON.stringify(r);
    if (str.includes('Asep') || str.includes('Sarmadi') || str.includes('Yusuf')) {
      console.log(`Row ${idx}:`, r);
    }
  });
});
