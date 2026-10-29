const fs = require('fs');
const path = require('path');

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
      // Don't recurse too deep in system folders
      if (!file.includes('node_modules') && !file.includes('.') && !file.includes('AppData')) {
        searchFiles(filePath, filter, fileList);
      }
    } else if (filter.test(file)) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

const userDirs = [
  'C:/Users/Fikri/Downloads',
  'C:/Users/Fikri/Desktop'
];

console.log('Searching user directories...');
userDirs.forEach(dir => {
  console.log(`\nSearching ${dir}:`);
  const files = searchFiles(dir, /\.(xlsx|xls|csv)$/i);
  files.forEach(f => console.log(' -', f));
});
