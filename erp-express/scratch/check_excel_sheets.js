const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const rootDir = 'c:/laragon/www/erp-epu-main';
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.xlsx') && !f.startsWith('~$'));

console.log("Analyzing excel files...");

const excelData = {};

for (const file of files) {
  try {
    const filePath = path.join(rootDir, file);
    const wb = xlsx.readFile(filePath);
    console.log(`\nFile: ${file}`);
    console.log(`Sheets:`, wb.SheetNames);
    
    // Check first 3 rows of each sheet to see columns
    for (const sheet of wb.SheetNames) {
      const ws = wb.Sheets[sheet];
      const json = xlsx.utils.sheet_to_json(ws, { header: 1 });
      if (json.length > 0) {
        console.log(`  Sheet [${sheet}] rows: ${json.length}, header sample:`, json.slice(0, 3));
      }
    }
  } catch (e) {
    console.error(`Error reading ${file}:`, e.message);
  }
}
