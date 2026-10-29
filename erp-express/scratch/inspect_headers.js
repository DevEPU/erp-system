const xlsx = require('xlsx');

const wb = xlsx.readFile('c:/laragon/www/erp-epu-main/Dataset/Production Planning Ach Rate Control Agustus 2026 Rev01.xlsx');

wb.SheetNames.forEach(name => {
  const sheet = wb.Sheets[name];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n================ SHEET: ${name} ================`);
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    if (rows[i]) {
      console.log(`Row ${i}: A="${rows[i][0]}" | B="${rows[i][1]}" | C="${rows[i][2]}" | D="${rows[i][3]}" | E="${rows[i][4]}"`);
    }
  }
});
