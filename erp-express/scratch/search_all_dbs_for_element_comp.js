const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/');
  const [dbs] = await conn.query('SHOW DATABASES');
  const dbNames = dbs.map(d => Object.values(d)[0]).filter(name => 
    !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(name)
  );

  console.log(`Searching across ${dbNames.length} databases for "ELEMENT COMP" or "K60R"...`);

  for (const dbName of dbNames) {
    try {
      await conn.query(`USE \`${dbName}\``);
      const [tables] = await conn.query('SHOW TABLES');
      
      for (const tRow of tables) {
        const tableName = Object.values(tRow)[0];
        
        // Describe table
        const [columns] = await conn.query(`DESCRIBE \`${tableName}\``);
        const textCols = columns
          .filter(c => c.Type.includes('varchar') || c.Type.includes('text'))
          .map(c => c.Field);
          
        if (textCols.length === 0) continue;
        
        const conditions = textCols.map(col => `\`${col}\` LIKE ?`).join(' OR ');
        const query = `SELECT * FROM \`${tableName}\` WHERE ${conditions} LIMIT 5`;
        const params = textCols.map(() => '%ELEMENT COMP%');
        
        const [results] = await conn.query(query, params);
        if (results.length > 0) {
          console.log(`\n🎉 Found in DB "${dbName}", Table "${tableName}":`);
          console.log(results);
        }
      }
    } catch (e) {
      // Ignore errors for specific databases/tables
    }
  }
  await conn.end();
}

run();
