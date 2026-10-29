const mysql = require('mysql2/promise');

async function inspectAllForecastDetails() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== ALL CUSTOMER FORECAST HEADERS ===");
        const [forecasts] = await connection.query(`
            SELECT f.id, f.reference, c.customer_name, f.total_qty, f.total_amount, f.month, f.year, f.status
            FROM customer_forecasts f
            LEFT JOIN customers c ON f.customer_id = c.id
        `);
        console.table(forecasts);

        console.log("\n=== ALL CUSTOMER FORECAST DETAILS ===");
        const [details] = await connection.query(`
            SELECT fd.id, fd.forecast_id, p.product_code, p.product_name, p.product_price as master_selling_price, 
                   fd.unit_price as forecast_unit_price, fd.forecast_qty, fd.total_amount as detail_total_amount
            FROM customer_forecast_details fd
            LEFT JOIN products p ON fd.product_id = p.id
        `);
        console.table(details);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

inspectAllForecastDetails();
