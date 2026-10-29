const db = require('../config/db');

async function run() {
  try {
    const [boms] = await db.query('SELECT * FROM boms LIMIT 5');
    console.log('--- BOMs ---');
    console.log(boms);

    if (boms.length > 0) {
      const [items] = await db.query('SELECT * FROM bom_items WHERE bom_id = ?', [boms[0].id]);
      console.log('--- BOM Items for BOM ID ' + boms[0].id + ' ---');
      console.log(items);
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
