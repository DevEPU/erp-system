const jwt = require('jsonwebtoken');

async function verifyDraft() {
    const baseUrl = 'http://localhost:5656/api';
    const token = jwt.sign({ id: 10, name: 'Admin Staff', role: 'admin' }, 'secret_key_budgeting_express_2026');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const res = await fetch(`${baseUrl}/manufacturing/mrp/55`, { headers }).then(r => r.json());
        const data = res.data;
        console.log(`MRP ${data.reference_code}: status=${data.status}, details count=${data.details?.length}`);
    } catch (e) {
        console.error('Error:', e);
    }
}

verifyDraft();
