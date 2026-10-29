require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 1, email: 'super.admin@epu.com' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

async function test() {
    try {
        console.log('=== FETCH WITH parent_only=true ===');
        let res = await fetch(`http://localhost:5656/api/products?parent_only=true&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        let data = await res.json();
        console.log('Status code:', res.status);
        console.log('Total products returned:', data.data ? data.data.length : 'none');
        let filtered = data.data ? data.data.filter(p => p.id === 10000) : [];
        console.log('Returned count for ID 10000:', filtered.length);
        if (filtered.length > 0) {
            console.log('Filtered product name:', filtered[0].product_name);
        }

        console.log('=== FETCH WITH parent_only=false ===');
        res = await fetch(`http://localhost:5656/api/products?parent_only=false&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await res.json();
        console.log('Status code:', res.status);
        console.log('Total products returned:', data.data ? data.data.length : 'none');
        filtered = data.data ? data.data.filter(p => p.id === 10000) : [];
        console.log('Returned count for ID 10000:', filtered.length);
        if (filtered.length > 0) {
            console.log('Filtered product names:', filtered.map(f => f.product_name));
        }
    } catch (e) {
        console.error(e);
    }
}

test();
