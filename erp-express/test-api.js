const baseUrl = 'http://localhost:5656/api';

async function test() {
    try {
        console.log('Testing Login...');
        const loginResponse = await fetch(`${baseUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@epu.com', password: 'password' })
        });
        
        if (!loginResponse.ok) {
            const err = await loginResponse.json();
            throw new Error(`Login failed: ${err.message}`);
        }

        const data = await loginResponse.json();
        const token = data.token;
        console.log('Login successful, token found');

        const headers = { 
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        };

        console.log('Testing /approvals/pending-counts...');
        const pendingResponse = await fetch(`${baseUrl}/approvals/pending-counts`, { headers });
        const pendingData = await pendingResponse.json();
        console.log('Pending Counts:', JSON.stringify(pendingData, null, 2));

        console.log('Testing /home/stats...');
        const statsResponse = await fetch(`${baseUrl}/home/stats?month=4&year=2026`, { headers });
        const statsData = await statsResponse.json();
        console.log('Home Stats:', JSON.stringify(statsData, null, 2));

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

test();
