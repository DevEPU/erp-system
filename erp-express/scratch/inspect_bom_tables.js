const mysql = require('mysql2/promise');

async function inspectBomTables() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("--- boms Table Columns ---");
        const [bomCols] = await connection.query("SHOW COLUMNS FROM boms");
        console.log(bomCols);

        console.log("\n--- bom_items Table Columns ---");
        const [itemCols] = await connection.query("SHOW COLUMNS FROM bom_items");
        console.log(itemCols);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspectBomTables();
