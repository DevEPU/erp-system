const jwt = require('jsonwebtoken');

async function testSummary() {
    const baseUrl = 'http://localhost:5656/api';
    const token = jwt.sign({ id: 10, name: 'Admin Staff', role: 'admin' }, 'secret_key_budgeting_express_2026');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const res = await fetch(`${baseUrl}/manufacturing/mrp/55`, { headers }).then(r => r.json());
        const summary = res.data.cycle_summary || [];
        console.log(`Summary items: ${summary.length}`);
        summary.slice(0, 5).forEach(s => {
            console.log(`\nProduct: ${s.product_code} (${s.product_name})`);
            console.log(`Total MRP Qty: ${s.total_mrp_qty} | Total Released: ${s.total_released_pr} | Sisa: ${s.total_sisa_qty}`);
            console.log('Breakdown:', s.mrp_breakdown);
        });
    } catch (e) {
        console.error(e);
    }
}

testSummary();
