const mysql = require('mysql2/promise');

async function viewCategories() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [cats] = await connection.query("SELECT * FROM categories");
        console.log("Categories:", cats);
    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

viewCategories();
