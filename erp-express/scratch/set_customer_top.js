const mysql = require('mysql2/promise');

async function updateCustomerTOP() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("Connected to MySQL database...");
        
        // Inspect table structure
        const [columns] = await connection.query("SHOW COLUMNS FROM customers");
        console.log("Customer table columns:", columns.map(c => c.Field));

        const hasTopDays = columns.some(c => c.Field === 'top_days');
        const hasTop = columns.some(c => c.Field === 'top');

        if (hasTopDays) {
            const [res] = await connection.query("UPDATE customers SET top_days = 45");
            console.log(`Updated ${res.affectedRows} customers setting top_days = 45.`);
        } else if (hasTop) {
            const [res] = await connection.query("UPDATE customers SET top = 45");
            console.log(`Updated ${res.affectedRows} customers setting top = 45.`);
        } else {
            console.log("Adding top_days column to customers table...");
            await connection.query("ALTER TABLE customers ADD COLUMN top_days INT DEFAULT 45");
            await connection.query("UPDATE customers SET top_days = 45");
            console.log("Added column top_days and updated all customers to 45.");
        }

        // Print updated customers list
        const [rows] = await connection.query("SELECT id, customer_name, top_days FROM customers");
        console.log("Updated customers list:", rows);

    } catch (err) {
        console.error("Error updating customers:", err);
    } finally {
        await connection.end();
    }
}

updateCustomerTOP();
