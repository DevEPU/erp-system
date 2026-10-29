const fs = require('fs');
const path = require('path');

function searchFileContents(dir, term, fileList = []) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (e) {
    return fileList;
  }
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      continue;
    }
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', '.next', 'vendor', 'storage', 'bootstrap'].includes(file)) {
        searchFileContents(filePath, term, fileList);
      }
    } else if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls') || filePath.endsWith('.csv') || filePath.endsWith('.txt') || filePath.endsWith('.json') || filePath.endsWith('.sql')) {
      try {
        // For spreadsheets, we read via xlsx, for text we read via fs
        if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
          const XLSX = require('xlsx');
          const wb = XLSX.readFile(filePath);
          for (const sheetName of wb.SheetNames) {
            const sheet = wb.Sheets[sheetName];
            const text = JSON.stringify(XLSX.utils.sheet_to_json(sheet));
            if (text.includes(term)) {
              console.log(`🎉 Found in Excel: ${filePath} (Sheet: ${sheetName})`);
              fileList.push(filePath);
              break;
            }
          }
        } else {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes(term)) {
            console.log(`🎉 Found in text file: ${filePath}`);
            fileList.push(filePath);
          }
        }
      } catch (e) {
        // ignore read errors
      }
    }
  }
  return fileList;
}

console.log('Searching c:/laragon/www/ for "EPPL-ELMNTK60R"...');
const results = searchFileContents('c:/laragon/www', 'EPPL-ELMNTK60R');
console.log('Search finished. Results:', results.length);
