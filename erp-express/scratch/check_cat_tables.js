const mysql = require('mysql2/promise');

async function checkCategoryTables() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [tables] = await connection.query("SHOW TABLES LIKE '%cat%'");
        console.log("Category tables:", tables);

        const [allTables] = await connection.query("SHOW TABLES");
        console.log("All tables:", allTables.map(t => Object.values(t)[0]));

        const [prodCols] = await connection.query("SHOW COLUMNS FROM products");
        console.log("products columns:", prodCols.map(c => c.Field));

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkCategoryTables();
