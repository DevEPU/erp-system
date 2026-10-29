const db = require('./src/config/db');

async function run() {
  try {
    const [proColumns] = await db.execute('DESCRIBE planning_produksi');
    console.log('--- planning_produksi COLUMNS ---');
    console.table(proColumns);

    const [osColumns] = await db.execute('DESCRIBE order_sheets').catch(() => [[]]);
    console.log('\n--- order_sheets COLUMNS ---');
    console.table(osColumns);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
