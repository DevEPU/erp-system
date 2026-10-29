const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [columns] = await connection.query('DESCRIBE currencies');
        console.log('currencies columns:', columns);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

check();
