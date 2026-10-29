const db = require('../src/config/db');

async function main() {
  const [allTables] = await db.query('SHOW TABLES');
  const tableNames = allTables.map(r => Object.values(r)[0]);
  const relevant = tableNames.filter(t => 
    t.includes('mach') || t.includes('mold') || t.includes('uph') || t.includes('shift') || t.includes('capacit')
  );
  console.log('RELEVANT TABLES:', relevant);

  for (const t of relevant) {
    const [cols] = await db.query(`DESCRIBE ${t}`);
    const [count] = await db.query(`SELECT COUNT(*) as c FROM ${t}`);
    console.log(`\n--- TABLE: ${t} (${count[0].c} rows) ---`);
    console.log(cols.map(c => `${c.Field} (${c.Type})`).join(', '));
    if (count[0].c > 0) {
      const [sample] = await db.query(`SELECT * FROM ${t} LIMIT 3`);
      console.log('Sample row:', sample[0]);
    }
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
