const fs = require('fs');
const path = require('path');

const prismaPath = path.join(__dirname, 'prisma/schema.prisma');
const content = fs.readFileSync(prismaPath, 'utf8');

const lines = content.split('\n');
console.log('Total lines:', lines.length);

console.log('--- Matching Lines for "work_orders" or "bom" ---');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('work_orders') || line.toLowerCase().includes('boms') || line.toLowerCase().includes('bom_items')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
