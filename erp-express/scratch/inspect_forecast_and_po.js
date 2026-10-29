const mysql = require('mysql2/promise');

async function inspectForecastAndPO() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== INSPECTING CUSTOMER FORECASTS ===");
        const [forecasts] = await connection.query(`
            SELECT f.*, c.customer_name 
            FROM customer_forecasts f 
            LEFT JOIN customers c ON f.customer_id = c.id
        `);
        console.log(`Total Customer Forecast records: ${forecasts.length}`);
        console.table(forecasts);

        const [forecastDetails] = await connection.query(`
            SELECT fd.*, p.product_name, p.product_code, p.product_price
            FROM customer_forecast_details fd
            LEFT JOIN products p ON fd.product_id = p.id
            LIMIT 20
        `);
        console.log(`\nSample Customer Forecast Details (total ${forecastDetails.length}):`);
        console.table(forecastDetails);

        console.log("\n=== INSPECTING CUSTOMER POs ===");
        const [customerPOs] = await connection.query(`
            SELECT po.*, c.customer_name 
            FROM customer_po po 
            LEFT JOIN customers c ON po.customer_id = c.id
        `);
        console.log(`Total Customer PO records: ${customerPOs.length}`);
        console.table(customerPOs);

        const [poDetails] = await connection.query(`
            SELECT pod.*, p.product_name, p.product_code, p.product_price
            FROM customer_po_details pod
            LEFT JOIN products p ON pod.product_id = p.id
            LIMIT 20
        `);
        console.log(`\nSample Customer PO Details (total ${poDetails.length}):`);
        console.table(poDetails);

    } catch (err) {
        console.error("Error inspecting Forecast & PO:", err);
    } finally {
        await connection.end();
    }
}

inspectForecastAndPO();
