const jwt = require('jsonwebtoken');

async function revertAndSubmit() {
    const baseUrl = 'http://localhost:5656/api';
    const token = jwt.sign({ id: 10, name: 'Admin Staff', role: 'admin' }, 'secret_key_budgeting_express_2026');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        console.log('--- 1. Submitting MRP #55 for Approval ---');
        const submitRes = await fetch(`${baseUrl}/manufacturing/mrp/55/submit-approval`, {
            method: 'POST',
            headers
        }).then(r => r.json());
        console.log('Submit Approval Result:', submitRes);

        console.log('\n--- 2. Checking MRP #55 Detail ---');
        const detailRes = await fetch(`${baseUrl}/manufacturing/mrp/55`, { headers }).then(r => r.json());
        const data = detailRes.data;
        console.log(`Status: ${data.status}`);
        console.log(`Reference: ${data.reference_code}`);
        console.log(`Details count: ${data.details?.length}`);
        console.log(`Sample details qty_released_pr:`, data.details?.slice(0, 3).map(d => ({ product_code: d.product_code, mrp_qty: d.mrp_qty, released: d.qty_released_pr })));

    } catch (e) {
        console.error('Error:', e);
    }
}

revertAndSubmit();
