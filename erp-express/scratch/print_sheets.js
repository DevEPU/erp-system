const xlsx = require('xlsx');

function run() {
  const workbook = xlsx.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  console.log('Sheet Names:', workbook.SheetNames);
}

run();
