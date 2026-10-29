const db = require('../config/db');

(async () => {
  try {
    await db.query('ALTER TABLE stock_opnames MODIFY warehouse_id INT NULL');
    console.log('Successfully altered warehouse_id to be nullable in stock_opnames');
    const [cols] = await db.query('SHOW COLUMNS FROM stock_opnames');
    const w = cols.find(c => c.Field === 'warehouse_id');
    console.log('Result:', w);
  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    process.exit(0);
  }
})();
