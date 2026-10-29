const db = require('../src/config/db');

async function checkData() {
    try {
        const [prods] = await db.query("SELECT id, product_code, product_name, product_price FROM products WHERE product_name LIKE '%LUGGAGE%' OR product_code LIKE '%EPBL%' LIMIT 5");
        console.log("Sample Products:", prods);

        console.log("\n=== CHECK FORECAST FCT/26/08/0002 ===");
        const [fct] = await db.query("SELECT * FROM customer_forecasts WHERE reference LIKE '%FCT/26/08/0002%' OR reference LIKE '%FCT%'");
        console.log("Forecast Header:", fct);

        if (fct.length > 0) {
            for (const f of fct) {
                const [fctDetails] = await db.query("SELECT * FROM customer_forecast_details WHERE forecast_id = ?", [f.id]);
                console.log(`Forecast Details for ID ${f.id} (${f.reference}):`, fctDetails);
            }
        }
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await db.end();
    }
}

checkData();
