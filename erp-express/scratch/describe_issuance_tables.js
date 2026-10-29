const db = require('../src/config/db');

async function main() {
    try {
        const tables = ['material_issuances', 'material_issuance_details', 'material_issuance_replacements', 'vendor_claims'];
        for (const table of tables) {
            console.log(`\n=== DESCRIBE ${table} ===`);
            const [rows] = await db.query(`DESCRIBE ${table}`);
            console.log(rows.map(r => ({ Field: r.Field, Type: r.Type, Null: r.Null, Key: r.Key, Default: r.Default, Extra: r.Extra })));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
