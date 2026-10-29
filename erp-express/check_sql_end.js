const fs = require('fs');

function checkEnd() {
  const content = fs.readFileSync('C:\\Users\\Fikri\\Downloads\\products.sql', 'utf8');
  const lines = content.split('\n');
  console.log('Total lines:', lines.length);
  console.log('Last 20 lines:');
  console.log(lines.slice(-20).join('\n'));
}

checkEnd();
