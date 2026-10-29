const db = require('../src/config/db');

async function main() {
  const [machines] = await db.query('SELECT id, code, name FROM machines');
  
  for (const m of machines) {
    const cleanName = m.name.replace(/\s*\(\d{4}\)/g, '').trim();
    if (cleanName !== m.name) {
      await db.query('UPDATE machines SET name = ?, updated_at = NOW() WHERE id = ?', [cleanName, m.id]);
      console.log(`Updated Machine ${m.code}: "${m.name}" -> "${cleanName}"`);
    }
  }

  const [updated] = await db.query(
    "SELECT id, code, name, capacity, line FROM machines ORDER BY CAST(SUBSTRING_INDEX(code, '-', -1) AS UNSIGNED) ASC"
  );
  console.log('\n--- DAFTAR MESIN SETELAH TAHUN DIHILANGKAN ---');
  console.table(updated);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
