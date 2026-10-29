require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 1, email: 'super.admin@epu.com' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

async function test() {
    try {
        console.log('=== FETCH PRODUCTS WITH warehouse_id=1 ===');
        let res = await fetch(`http://localhost:5656/api/products?warehouse_id=1&limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        let data = await res.json();
        console.log('Status code:', res.status);
        console.log('Total products returned:', data.data ? data.data.length : 'none');
        if (data.data && data.data.length > 0) {
            console.log('First product locations for warehouse_id=1:', data.data[0].locations?.map(l => l.warehouse_short_name));
        }

        console.log('=== FETCH STATS WITH warehouse_id=1 ===');
        res = await fetch(`http://localhost:5656/api/products/stats?warehouse_id=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await res.json();
        console.log('Status code:', res.status);
        console.log('Stats (filtered by warehouse 1):', data);
    } catch (e) {
        console.error(e);
    }
}

test();
