const db = require('./src/config/db');

async function run() {
  try {
    const [woColumns] = await db.execute('DESCRIBE work_orders');
    console.log('--- work_orders COLUMNS ---');
    console.table(woColumns);

    const [womColumns] = await db.execute('DESCRIBE work_order_materials');
    console.log('\n--- work_order_materials COLUMNS ---');
    console.table(womColumns);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
