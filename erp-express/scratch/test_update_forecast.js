const db = require('../src/config/db');

async function testUpdate() {
    try {
        console.log("=== UPDATING FORECAST ID 6 (FCT/26/08/0002) WITH PRICE 150000 ===");
        
        // Fetch existing details
        const [rows] = await db.query("SELECT * FROM customer_forecasts WHERE id = 6");
        if (!rows.length) return console.log("Forecast 6 not found");

        const items = [
            {
                product_id: 5181,
                product_name: 'BOX LUGGAGE K1Z',
                product_code: 'EPBL-FBXLUGK1Z',
                product_unit: 'pcs',
                forecast_qty: 1000,
                price: 150000,
                confidence_level: 100,
                remark: 'Test update'
            }
        ];

        // Call update API logic
        const conn = await db.getConnection();
        await conn.beginTransaction();

        const qty = 1000;
        const price = 150000;
        const subTotal = qty * price;
        const total_qty = qty;
        const total_amount = subTotal;
        const weighted_amount = subTotal;

        await conn.query(`UPDATE customer_forecasts SET total_qty=?, total_amount=?, weighted_amount=?, updated_at=NOW() WHERE id=?`,
            [total_qty, total_amount, weighted_amount, 6]);

        await conn.execute(`DELETE FROM customer_forecast_details WHERE forecast_id=?`, [6]);

        await conn.query(`INSERT INTO customer_forecast_details (forecast_id, product_id, product_name, product_code, product_unit, forecast_qty, price, confidence_level, sub_total, weighted_amount, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW())`,
            [6, 5181, 'BOX LUGGAGE K1Z', 'EPBL-FBXLUGK1Z', 'pcs', qty, price, 100, subTotal, weighted_amount]);

        await conn.commit();
        conn.release();

        console.log("=== UPDATE SUCCESSFUL. VERIFYING: ===");
        const [h] = await db.query("SELECT id, reference, total_qty, total_amount, weighted_amount FROM customer_forecasts WHERE id = 6");
        console.log("Header:", h[0]);

        const [d] = await db.query("SELECT * FROM customer_forecast_details WHERE forecast_id = 6");
        console.log("Details:", d[0]);

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await db.end();
    }
}

testUpdate();
