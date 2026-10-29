const xlsx = require('xlsx');

function excelSerialToDate(serial) {
  if (typeof serial !== 'number') return serial;
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  // Format as YYYY-MM-DD
  const y = date_info.getFullYear();
  const m = String(date_info.getMonth() + 1).padStart(2, '0');
  const d = String(date_info.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function run() {
  const workbook = xlsx.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  const row2 = data[2];
  
  console.log('Column details:');
  row2.forEach((val, idx) => {
    if (typeof val === 'number') {
      console.log(`Col ${idx}: ${val} -> ${excelSerialToDate(val)}`);
    } else {
      console.log(`Col ${idx}: ${val}`);
    }
  });
}

run();
