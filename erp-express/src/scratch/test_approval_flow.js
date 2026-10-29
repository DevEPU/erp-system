const jwt = require('jsonwebtoken');

async function testFeatures() {
    const baseUrl = 'http://localhost:5656/api';
    const token = jwt.sign({ id: 10, name: 'Admin Staff', role: 'admin' }, 'secret_key_budgeting_express_2026');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        console.log('--- 1. Submitting MRP #56 for approval ---');
        const submitRes = await fetch(`${baseUrl}/manufacturing/mrp/56/submit-approval`, {
            method: 'POST',
            headers
        }).then(r => r.json());
        console.log('Submit approval result:', submitRes);

        const checkRes = await fetch(`${baseUrl}/manufacturing/mrp/56`, { headers }).then(r => r.json());
        console.log('Status after submit (should be Waiting for Approval):', checkRes.data.status);

        console.log('\n--- 2. Deleting MRP #56 while in Waiting for Approval ---');
        const deleteRes = await fetch(`${baseUrl}/manufacturing/mrp/56`, {
            method: 'DELETE',
            headers
        }).then(r => r.json());
        console.log('Delete result:', deleteRes);

        const afterListRes = await fetch(`${baseUrl}/manufacturing/mrp`, { headers }).then(r => r.json());
        console.log('Remaining MRP count:', (afterListRes.data || []).length);
        console.log('Remaining MRPs:', (afterListRes.data || []).map(m => `${m.id}: ${m.reference_code} (${m.status})`));

    } catch (err) {
        console.error('Error during test:', err);
    }
}

testFeatures();
