const db = require('./src/config/db');

async function run() {
  try {
    const [rows] = await db.query('SHOW TABLES');
    const tableNames = rows.map(r => Object.values(r)[0]);
    console.log('ALL TABLES:', JSON.stringify(tableNames, null, 2));
    
    const matches = tableNames.filter(name => 
      name.includes('tipe') || 
      name.includes('type') || 
      name.includes('jadi') || 
      name.includes('finished') || 
      name.includes('good')
    );
    console.log('MATCHING TABLES:', matches);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
