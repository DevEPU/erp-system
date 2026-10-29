const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join('c:', 'laragon', 'www', 'erp-epu-main', 'Customer & Part FG.xlsx');
try {
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);
    
    const suffixes = new Set();
    const colls = [];
    rows.forEach(r => {
        const comp = String(r['Component']).trim();
        const parts = comp.split('-');
        const suffix = parts.slice(1).join('-');
        if (suffixes.has(suffix)) {
            colls.push(suffix);
        }
        suffixes.add(suffix);
    });
    console.log('Total rows:', rows.length);
    console.log('Unique suffixes:', suffixes.size);
    console.log('Collisions:', colls);
} catch (e) {
    console.error(e);
}
