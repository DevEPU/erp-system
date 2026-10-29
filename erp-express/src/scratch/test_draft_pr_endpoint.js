const jwt = require('jsonwebtoken');

async function testDraftPRPercent() {
    const baseUrl = 'http://localhost:5656/api';
    const token = jwt.sign({ id: 10, name: 'Admin Staff', role: 'admin' }, 'secret_key_budgeting_express_2026');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        console.log('--- 1. Fetching MRP #55 ---');
        const getRes = await fetch(`${baseUrl}/manufacturing/mrp/55`, { headers }).then(r => r.json());
        const mrp = getRes.data;
        console.log(`Status before: ${mrp.status}`);
        const sampleDetails = mrp.details.slice(0, 3);

        console.log('\n--- 2. Saving Draft % PR (80%, 50%, 100%) ---');
        const saveRes = await fetch(`${baseUrl}/manufacturing/mrp/55/draft-pr-percent`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                items: [
                    { id: sampleDetails[0].id, percent: 80 },
                    { id: sampleDetails[1].id, percent: 50 },
                    { id: sampleDetails[2].id, percent: 100 }
                ]
            })
        }).then(r => r.json());
        console.log('Save result:', saveRes);

        console.log('\n--- 3. Checking MRP #55 Status and PR count in DB ---');
        const checkRes = await fetch(`${baseUrl}/manufacturing/mrp/55`, { headers }).then(r => r.json());
        console.log(`Status after saving draft % PR: ${checkRes.data.status} (Should still be Approved)`);
        console.log('Details allocation_percent after save:', checkRes.data.details.slice(0, 3).map(d => ({
            id: d.id,
            product_code: d.product_code,
            allocation_percent: d.allocation_percent,
            qty_released_pr: d.qty_released_pr
        })));

    } catch (e) {
        console.error('Error:', e);
    }
}

testDraftPRPercent();
