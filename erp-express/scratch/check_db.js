const mysql = require('mysql2/promise');

async function check() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [tables] = await connection.query('SHOW TABLES');
        console.log('Tables:', tables);

        const [columns] = await connection.query('DESCRIBE bank_accounts');
        console.log('bank_accounts columns:', columns);
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await connection.end();
    }
}

check();
