const db = require('../src/config/db');

async function run() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    console.log('=== Database Tables ===');
    tables.forEach(t => console.log(Object.values(t)[0]));

    // Check if there's any table with 'customer' or 'sales' in the name
    console.log('\n=== Customer/Sales Tables ===');
    tables.forEach(t => {
      const name = Object.values(t)[0];
      if (name.includes('customer') || name.includes('sale') || name.includes('fg')) {
        console.log(name);
      }
    });

    // Let's describe some tables if they exist
    const checkTables = ['customers', 'sales_products', 'product_customers', 'sales'];
    for (const tbl of checkTables) {
      try {
        const [desc] = await db.query(`DESCRIBE ${tbl}`);
        console.log(`\n=== Column definition for ${tbl} ===`);
        desc.forEach(c => console.log(`${c.Field} - ${c.Type}`));
      } catch (err) {
        console.log(`\nTable ${tbl} does not exist`);
      }
    }

  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
