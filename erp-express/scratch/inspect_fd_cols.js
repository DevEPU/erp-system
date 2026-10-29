const mysql = require('mysql2/promise');

async function inspectForecastCols() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        const [fdCols] = await connection.query("SHOW COLUMNS FROM customer_forecast_details");
        console.log("customer_forecast_details columns:", fdCols.map(c => c.Field));

        const [rows] = await connection.query("SELECT * FROM customer_forecast_details");
        console.log("customer_forecast_details rows:", rows);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspectForecastCols();
