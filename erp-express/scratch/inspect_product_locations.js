const mysql = require('mysql2/promise');

async function inspectProductLocations() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [cols] = await connection.query("SHOW COLUMNS FROM product_locations");
        console.log("product_locations columns:", cols);

        const [warehouses] = await connection.query("SELECT * FROM warehouses");
        console.log("Warehouses list:", warehouses);

        const [locCount] = await connection.query("SELECT COUNT(*) as count FROM product_locations");
        console.log("Total rows in product_locations:", locCount[0].count);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspectProductLocations();
