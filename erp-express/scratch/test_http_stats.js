require('dotenv').config();
const jwt = require('jsonwebtoken');

const token = jwt.sign({ id: 1, email: 'super.admin@epu.com' }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

async function test() {
    try {
        console.log('=== FETCH STATS WITH parent_only=true ===');
        let res = await fetch(`http://localhost:5656/api/products/stats?parent_only=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        let data = await res.json();
        console.log('Status code:', res.status);
        console.log('Stats:', data);

        console.log('=== FETCH STATS WITH parent_only=false ===');
        res = await fetch(`http://localhost:5656/api/products/stats?parent_only=false`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await res.json();
        console.log('Status code:', res.status);
        console.log('Stats:', data);

        console.log('=== FETCH PRODUCTS WITH parent_only=true ===');
        res = await fetch(`http://localhost:5656/api/products?parent_only=true&limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        data = await res.json();
        const filtered = data.data ? data.data.filter(p => p.id === 10000) : [];
        console.log('Product ID 10000 consolidated product_code:', filtered[0]?.product_code);
    } catch (e) {
        console.error(e);
    }
}

test();
