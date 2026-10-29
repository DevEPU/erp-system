const db = require('../src/config/db');
async function check() {
    try {
        const [rows] = await db.query('SHOW TABLES');
        const list = rows.map(r => Object.values(r)[0]);
        console.log('Tables Length:', list.length);
        console.log('Tables full list:', JSON.stringify(list, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
