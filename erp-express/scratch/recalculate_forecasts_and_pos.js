const mysql = require('mysql2/promise');

async function fixForecastAndPOTransactions() {
    const connection = await mysql.createConnection({
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: '',
        database: 'budgeting'
    });

    try {
        console.log("=== STARTING RECALCULATION & SYNC OF FORECAST & PO TRANSACTIONS ===");

        // 1. Update Customer Forecast Details with Master Product Prices
        const [fdRows] = await connection.query(`
            SELECT fd.id, fd.forecast_id, fd.product_id, fd.forecast_qty, fd.price as old_price, p.product_name, p.product_code, p.product_price
            FROM customer_forecast_details fd
            JOIN products p ON fd.product_id = p.id
        `);

        console.log(`Found ${fdRows.length} forecast detail items to verify.`);

        for (const row of fdRows) {
            const masterPrice = Number(row.product_price || 0);
            const qty = Number(row.forecast_qty || 0);
            const newSubtotal = qty * masterPrice;

            await connection.query(`
                UPDATE customer_forecast_details 
                SET price = ?, sub_total = ?, weighted_amount = ? 
                WHERE id = ?
            `, [masterPrice, newSubtotal, newSubtotal, row.id]);

            console.log(`[FORECAST DETAIL SYNC] ID: ${row.id} | Product: ${row.product_code} ("${row.product_name}") | Price: Rp ${Number(row.old_price).toLocaleString('id-ID')} -> Rp ${masterPrice.toLocaleString('id-ID')} | Subtotal: Rp ${newSubtotal.toLocaleString('id-ID')}`);
        }

        // Recalculate Forecast Headers
        const [forecasts] = await connection.query("SELECT id FROM customer_forecasts");
        for (const f of forecasts) {
            const [sums] = await connection.query(`
                SELECT SUM(forecast_qty) as total_qty, SUM(sub_total) as total_amount, SUM(weighted_amount) as weighted_amount
                FROM customer_forecast_details
                WHERE forecast_id = ?
            `, [f.id]);

            const totalQty = Number(sums[0].total_qty || 0);
            const totalAmount = Number(sums[0].total_amount || 0);
            const weightedAmount = Number(sums[0].weighted_amount || 0);

            await connection.query(`
                UPDATE customer_forecasts
                SET total_qty = ?, total_amount = ?, weighted_amount = ?
                WHERE id = ?
            `, [totalQty, totalAmount, weightedAmount, f.id]);

            console.log(`[FORECAST HEADER UPDATED] Forecast ID: ${f.id} | Total Qty: ${totalQty} | Total Amount: Rp ${totalAmount.toLocaleString('id-ID')}`);
        }

        // 2. Update Customer PO Details with Master Product Prices
        const [poRows] = await connection.query(`
            SELECT pod.id, pod.po_id, pod.product_id, pod.po_qty, pod.discount_percent, pod.price as old_price, p.product_name, p.product_code, p.product_price
            FROM customer_po_details pod
            JOIN products p ON pod.product_id = p.id
        `);

        console.log(`\nFound ${poRows.length} customer PO detail items to verify.`);

        for (const row of poRows) {
            const masterPrice = Number(row.product_price || 0);
            const qty = Number(row.po_qty || 0);
            const discPercent = Number(row.discount_percent || 0);

            const grossSubtotal = qty * masterPrice;
            const discAmount = grossSubtotal * (discPercent / 100);
            const netSubtotal = grossSubtotal - discAmount;

            await connection.query(`
                UPDATE customer_po_details 
                SET price = ?, discount_amount = ?, sub_total = ? 
                WHERE id = ?
            `, [masterPrice, discAmount, netSubtotal, row.id]);

            console.log(`[PO DETAIL SYNC] ID: ${row.id} | Product: ${row.product_code} ("${row.product_name}") | Price: Rp ${Number(row.old_price).toLocaleString('id-ID')} -> Rp ${masterPrice.toLocaleString('id-ID')} | Subtotal: Rp ${netSubtotal.toLocaleString('id-ID')}`);
        }

        // Recalculate PO Headers
        const [pos] = await connection.query("SELECT id, discount_percent, tax_percent, shipping_cost FROM customer_po");
        for (const po of pos) {
            const [sums] = await connection.query(`
                SELECT SUM(po_qty) as total_qty, SUM(sub_total) as total_subtotal
                FROM customer_po_details
                WHERE po_id = ?
            `, [po.id]);

            const totalQty = Number(sums[0].total_qty || 0);
            const subTotal = Number(sums[0].total_subtotal || 0);

            const discPercent = Number(po.discount_percent || 0);
            const discAmount = subTotal * (discPercent / 100);
            const afterDisc = subTotal - discAmount;

            const taxPercent = Number(po.tax_percent || 0);
            const taxAmount = afterDisc * (taxPercent / 100);

            const shippingCost = Number(po.shipping_cost || 0);
            const grandTotal = afterDisc + taxAmount + shippingCost;

            await connection.query(`
                UPDATE customer_po
                SET total_qty = ?, sub_total = ?, discount_amount = ?, tax_amount = ?, grand_total = ?
                WHERE id = ?
            `, [totalQty, subTotal, discAmount, taxAmount, grandTotal, po.id]);

            console.log(`[PO HEADER UPDATED] PO ID: ${po.id} | Total Qty: ${totalQty} | Subtotal: Rp ${subTotal.toLocaleString('id-ID')} | Grand Total: Rp ${grandTotal.toLocaleString('id-ID')}`);
        }

        console.log(`\n=== TRANSACTION RECALCULATION & SYNC COMPLETED SUCCESSFULLY ===`);

    } catch (err) {
        console.error("Error fixing transactions:", err);
    } finally {
        await connection.end();
    }
}

fixForecastAndPOTransactions();
