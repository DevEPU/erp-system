const db = require('./src/config/db');

async function main() {
    try {
        const [tables] = await db.query("SHOW TABLES");
        console.log("=== TABLES IN DATABASE ===");
        tables.forEach((t, i) => {
            console.log(`${i+1}: ${Object.values(t)[0]}`);
        });
    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

main();
