const db = require('../src/config/db');

async function check() {
    try {
        const tables = ['material_issuance_replacements', 'vendor_claims'];
        for (const t of tables) {
            console.log(`=== SCHEMA FOR ${t} ===`);
            const [rows] = await db.query(`DESCRIBE ${t}`);
            console.log(JSON.stringify(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Key: r.Key, Default: r.Default })), null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
