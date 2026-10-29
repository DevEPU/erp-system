const http = require('http');

http.get('http://localhost:5656/api/reports/ach-rate?year=2026&month=8', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log('SUCCESS:', json.success);
            console.log('DATA COUNT:', json.data.length);
            console.log('DATA:', JSON.stringify(json.data, null, 2));
        } catch(e) {
            console.log('PARSE ERROR:', e.message);
            console.log('RAW DATA:', data);
        }
        process.exit(0);
    });
}).on('error', err => {
    console.log('HTTP ERROR:', err.message);
    process.exit(1);
});
