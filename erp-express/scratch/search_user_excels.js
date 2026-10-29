const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function searchFiles(dir, filter, fileList = []) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return fileList;
  }
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      return;
    }
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.') && !file.includes('AppData')) {
        searchFiles(filePath, filter, fileList);
      }
    } else if (filter.test(file)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

async function run() {
  const userDirs = [
    'C:/Users/Fikri/Downloads',
    'C:/Users/Fikri/Desktop'
  ];

  const excelFiles = [];
  userDirs.forEach(dir => {
    searchFiles(dir, /\.(xlsx|xls)$/i, excelFiles);
  });

  console.log(`Found ${excelFiles.length} Excel files. Searching inside...`);

  for (const file of excelFiles) {
    // Skip lock files
    if (path.basename(file).startsWith('~$')) continue;

    try {
      const wb = XLSX.readFile(file);
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        const text = JSON.stringify(data);
        if (text.includes('ELMNTK60R') || text.includes('ASKI-2')) {
          console.log(`\n🎉 FOUND MATCH! File: ${file} (Sheet: ${sheetName})`);
          // Print first few rows of match
          const matchingRows = data.filter(row => JSON.stringify(row).includes('ELMNTK60R') || JSON.stringify(row).includes('ASKI-2'));
          console.log(matchingRows.slice(0, 5));
        }
      }
    } catch (e) {
      // console.error(`Error reading ${file}:`, e.message);
    }
  }
  console.log('\nSearch completed.');
}

run();
