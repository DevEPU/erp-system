const db = require('../src/config/db');

async function run() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    
    console.log('Searching for "ASKI" in all tables...');
    for (const tRow of tables) {
      const tableName = Object.values(tRow)[0];
      
      // Describe the table to get column names
      const [columns] = await db.query(`DESCRIBE ${tableName}`);
      
      // Filter text columns
      const textCols = columns
        .filter(c => c.Type.includes('varchar') || c.Type.includes('text'))
        .map(c => c.Field);
        
      if (textCols.length === 0) continue;
      
      // Build a query checking all text columns for %ASKI%
      const conditions = textCols.map(col => `\`${col}\` LIKE ?`).join(' OR ');
      const query = `SELECT * FROM \`${tableName}\` WHERE ${conditions} LIMIT 5`;
      const params = textCols.map(() => '%ASKI%');
      
      const [results] = await db.query(query, params);
      if (results.length > 0) {
        console.log(`\n🎉 Found in table "${tableName}":`);
        console.log(results);
      }
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}

run();
