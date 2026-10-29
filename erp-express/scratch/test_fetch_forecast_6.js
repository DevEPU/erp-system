const http = require('http');

http.get('http://localhost:5656/api/forecasts/6', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log("=== API RESPONSE FOR /api/forecasts/6 ===");
        console.log(JSON.stringify(JSON.parse(data), null, 2));
    });
}).on('error', err => console.error("API Error:", err.message));
