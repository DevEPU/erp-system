const db = require('../config/db');

async function run() {
  try {
    const [departments] = await db.execute('SELECT * FROM departments LIMIT 2');
    console.log('--- Departments ---');
    console.log(departments);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
