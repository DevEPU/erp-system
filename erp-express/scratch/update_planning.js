const db = require('../src/config/db');

async function updateData() {
  try {
    await db.query(`UPDATE planning_produksi SET machine_id = 'MC-22', start_date = '2026-10-01', end_date = '2026-10-06' WHERE id = 6`);
    await db.query(`UPDATE planning_produksi SET machine_id = 'MC-22', start_date = '2026-10-01', end_date = '2026-10-06' WHERE id = 5`);
    console.log('Successfully updated planning_produksi machine_id and dates to October 2026.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

updateData();
