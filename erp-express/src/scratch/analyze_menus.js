const fs = require('fs');
const path = require('path');

const constantsPath = path.resolve('..', 'erp-next', 'src', 'lib', 'constants.ts');
const content = fs.readFileSync(constantsPath, 'utf8');

// Parse menus by matching { id: ..., name: "...", path: "..." }
const lines = content.split('\n');
const items = [];
let currentItem = {};

for (const line of lines) {
  const nameMatch = line.match(/name:\s*"([^"]+)"/);
  const pathMatch = line.match(/path:\s*"([^"]+)"/);
  const isDivider = line.includes('is_divider: true');

  if (nameMatch) {
    currentItem.name = nameMatch[1];
  }
  if (pathMatch) {
    currentItem.path = pathMatch[1];
  }
  if (isDivider) {
    currentItem.isDivider = true;
  }
  if (line.includes('},') || line.includes('}')) {
    if (currentItem.name && !currentItem.isDivider) {
      items.push({ ...currentItem });
    }
    currentItem = {};
  }
}

console.log('Found valid items:', items.length);
fs.writeFileSync('src/scratch/parsed_menus.json', JSON.stringify(items, null, 2));
console.log('Saved to src/scratch/parsed_menus.json');
