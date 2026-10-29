const http = require('http');

const data = JSON.stringify({
    planning_source: 'PO Customer',
    po_customer_id: 4,
    planner_name: 'PPIC Team Test',
    safety_stock_percent: 0,
    scrap_loss_percent: 0,
    time_frame_start: '2026-08-10',
    time_frame_end: '2026-09-09',
    note: 'Test API'
});

const req = http.request({
    hostname: 'localhost',
    port: 5656,
    path: '/api/manufacturing/mrp/generate',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
}, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response Body:', body);
        const parsed = JSON.parse(body);
        if (parsed.mrp_id) {
            http.get(`http://localhost:5656/api/manufacturing/mrp/${parsed.mrp_id}`, (res2) => {
                let body2 = '';
                res2.on('data', chunk => body2 += chunk);
                res2.on('end', () => {
                    console.log('Detail MRP from API:', JSON.stringify(JSON.parse(body2), null, 2));
                    process.exit(0);
                });
            });
        } else {
            process.exit(0);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
    process.exit(1);
});

req.write(data);
req.end();
