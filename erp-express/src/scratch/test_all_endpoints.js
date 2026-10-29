const jwt = require('jsonwebtoken');

async function testEndpoints() {
    const baseUrl = 'http://localhost:5656/api';
    const token = jwt.sign({ id: 10, name: 'Admin Staff', role: 'admin' }, 'secret_key_budgeting_express_2026');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        console.log('--- 1. Testing Draft PR Percent PUT ---');
        const draftRes = await fetch(`${baseUrl}/manufacturing/mrp/55/draft-pr-percent`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                items: [
                    { id: 354, percent: 80, release_qty: 2400 },
                    { id: 355, percent: 100, release_qty: 3500 }
                ]
            })
        }).then(r => r.json());
        console.log('draft-pr-percent response:', draftRes);

        console.log('\n--- 2. Testing updateMRP PUT ---');
        const updateRes = await fetch(`${baseUrl}/manufacturing/mrp/55`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                details: []
            })
        }).then(r => r.json());
        console.log('updateMRP response:', updateRes);

        console.log('\n--- 3. Checking final MRP #55 status ---');
        const detailRes = await fetch(`${baseUrl}/manufacturing/mrp/55`, { headers }).then(r => r.json());
        console.log(`Status: ${detailRes.data.status}`);

    } catch (e) {
        console.error('Error:', e);
    }
}

testEndpoints();
