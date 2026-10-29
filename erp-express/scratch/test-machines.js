const baseUrl = 'http://localhost:5656/api';

async function test() {
    try {
        console.log('Sending request to GET /api/manufacturing/planning-produksi...');
        const response = await fetch(`${baseUrl}/manufacturing/planning-produksi?bypass_auth=true`);
        
        console.log('Status Code:', response.status);
        const text = await response.text();
        console.log('Response Body Snippet:', text.substring(0, 500));
    } catch (err) {
        console.error('Fetch error:', err);
    }
}

test();
