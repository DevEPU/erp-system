const fs = require('fs');
const path = require('path');

function searchFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      return; // skip broken symlinks etc.
    }
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('.next') && !file.includes('vendor')) {
        searchFiles(filePath, filter, fileList);
      }
    } else if (filter.test(file)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const files = searchFiles('c:/laragon/www/erp-epu-main', /\.(xlsx|xls|csv)$/i);
console.log('Found spreadsheet files:');
files.forEach(f => console.log(f));
