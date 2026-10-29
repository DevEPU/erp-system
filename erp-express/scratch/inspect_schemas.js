const mysql = require('mysql2/promise');

async function inspectSchemas() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("--- customers Columns ---");
        const [cCols] = await connection.query("SHOW COLUMNS FROM customers");
        console.log(cCols.map(c => c.Field));

        console.log("\n--- customer_forecasts Columns ---");
        const [fCols] = await connection.query("SHOW COLUMNS FROM customer_forecasts");
        console.log(fCols.map(c => c.Field));

        console.log("\n--- customer_po Columns ---");
        const [poCols] = await connection.query("SHOW COLUMNS FROM customer_po");
        console.log(poCols.map(c => c.Field));

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspectSchemas();
