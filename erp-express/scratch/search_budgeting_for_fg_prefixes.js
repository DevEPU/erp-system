const db = require('../src/config/db');

async function run() {
  try {
    const [tables] = await db.query('SHOW TABLES');
    const prefixes = ['EPPL-%', 'EPCV-%', 'EPCS-%', 'EPPI-%', 'EPBL-%'];
    
    console.log('Searching all tables in "budgeting" for prefixes...');
    for (const tRow of tables) {
      const tableName = Object.values(tRow)[0];
      
      const [columns] = await db.query(`DESCRIBE \`${tableName}\``);
      const textCols = columns
        .filter(c => c.Type.includes('varchar') || c.Type.includes('text'))
        .map(c => c.Field);
        
      if (textCols.length === 0) continue;
      
      for (const col of textCols) {
        for (const pref of prefixes) {
          const [results] = await db.query(
            `SELECT \`${col}\`, COUNT(*) as count FROM \`${tableName}\` WHERE \`${col}\` LIKE ? GROUP BY \`${col}\` LIMIT 10`,
            [pref]
          );
          if (results.length > 0) {
            console.log(`\nFound prefix matches in Table "${tableName}", Column "${col}":`);
            console.log(results);
          }
        }
      }
    }
  } catch (e) {
    console.error(e.message);
  } finally {
    process.exit(0);
  }
}

run();
