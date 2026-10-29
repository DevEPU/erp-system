const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'laragon', 'www', 'erp-epu-main', 'Customer & Part FG.xlsx');
console.log('Reading file:', filePath);

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    console.log('Sheet name:', sheetName);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);
    console.log('Total rows:', data.length);
    console.log('First 5 rows:', JSON.stringify(data.slice(0, 5), null, 2));
} catch (e) {
    console.error('Error:', e.message);
}
