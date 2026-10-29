const fs = require('fs');
const xlsx = require('xlsx');
const path = require('path');

const rootDir = 'c:/laragon/www/erp-epu-main';

const wb1 = xlsx.readFile(path.join(rootDir, 'Customer & Part FG.xlsx'));
console.log("=== Customer & Part FG.xlsx ===");
const s1 = wb1.Sheets[wb1.SheetNames[0]];
console.log(xlsx.utils.sheet_to_json(s1).slice(0, 5));

const wb2 = xlsx.readFile(path.join(rootDir, 'MD BOM.xlsx'));
console.log("\n=== MD BOM.xlsx: MD Finished Goods ===");
const s2 = wb2.Sheets['MD Finished Goods'];
console.log(xlsx.utils.sheet_to_json(s2).slice(0, 5));

console.log("\n=== MD BOM.xlsx: MD BOM ===");
const s3 = wb2.Sheets['MD BOM'];
console.log(xlsx.utils.sheet_to_json(s3).slice(0, 5));

const wb3 = xlsx.readFile(path.join(rootDir, '8. Agustus 2026 MRP-2 Rev02.xlsx'));
console.log("\n=== 8. Agustus 2026 MRP-2 Rev02.xlsx: 1. MD FG ===");
const s4 = wb3.Sheets['1. MD FG'];
console.log(xlsx.utils.sheet_to_json(s4).slice(0, 5));
