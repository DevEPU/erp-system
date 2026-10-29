const db = require('../src/config/db');
async function check() {
    try {
        const [rows] = await db.query('SHOW TABLES');
        console.log('Tables:', rows.map(r => Object.values(r)[0]));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
