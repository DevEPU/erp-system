const path = require('path');

const prismaPath = path.join(__dirname, 'prisma/schema.prisma');
const content = fs.readFileSync(prismaPath, 'utf8');
const lines = content.split('\n');

function printRange(start, end) {
  console.log(`\n--- Lines ${start} to ${end} ---`);
  for (let i = start - 1; i < end; i++) {
    if (lines[i] !== undefined) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  }
}

printRange(1881, 1910);
printRange(1217, 1235);
