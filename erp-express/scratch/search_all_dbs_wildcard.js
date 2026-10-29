const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/');
  const [dbs] = await conn.query('SHOW DATABASES');
  const dbNames = dbs.map(d => Object.values(d)[0]).filter(name => 
    !['information_schema', 'performance_schema', 'mysql', 'sys'].includes(name)
  );

  console.log(`Searching across ${dbNames.length} databases for wildcards...`);

  for (const dbName of dbNames) {
    try {
      await conn.query(`USE \`${dbName}\``);
      const [tables] = await conn.query('SHOW TABLES');
      
      for (const tRow of tables) {
        const tableName = Object.values(tRow)[0];
        
        const [columns] = await conn.query(`DESCRIBE \`${tableName}\``);
        const textCols = columns
          .filter(c => c.Type.includes('varchar') || c.Type.includes('text'))
          .map(c => c.Field);
          
        if (textCols.length === 0) continue;
        
        const conditions = textCols.map(col => `\`${col}\` LIKE ?`).join(' OR ');
        const query = `SELECT * FROM \`${tableName}\` WHERE ${conditions} LIMIT 5`;
        
        // Search for ELMNTK60R
        let [results] = await conn.query(query, textCols.map(() => '%ELMNTK60R%'));
        if (results.length > 0) {
          console.log(`\n🎉 Found ELMNTK60R in DB "${dbName}", Table "${tableName}":`);
          console.log(results);
        }

        // Search for FCVACLK1A
        [results] = await conn.query(query, textCols.map(() => '%FCVACLK1A%'));
        if (results.length > 0) {
          console.log(`\n🎉 Found FCVACLK1A in DB "${dbName}", Table "${tableName}":`);
          console.log(results);
        }
      }
    } catch (e) {
      // ignore
    }
  }
  await conn.end();
}

run();
