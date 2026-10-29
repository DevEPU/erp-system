// Global fetch is built-in in modern Node.js

async function check() {
    try {
        const res = await fetch('http://localhost:5656/api/products?parent_only=true');
        const data = await res.json();
        console.log('--- RAW RESPONSE (parent_only=true) ---');
        console.log(data);
    } catch (e) {
        console.error(e);
    }
}

check();
