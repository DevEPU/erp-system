const fs = require('fs');

(async () => {
    try {
        console.log("=== SIMULATING IMPORT UPLOAD VIA FETCH ===");
        const filePath = 'c:/laragon/www/erp-epu-main/Schedule_Delivery_Template_Clean.xlsx';
        
        // Log in
        console.log("Logging in...");
        const loginRes = await fetch('http://localhost:5656/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'password' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        // Build form data
        const blob = new Blob([fs.readFileSync(filePath)]);
        const form = new FormData();
        form.append('file', blob, 'Schedule_Delivery_Template_Clean.xlsx');

        console.log("Uploading file...");
        const uploadRes = await fetch('http://localhost:5656/api/vendor-schedules/import', {
            method: 'POST',
            headers: {
                'x-bypass-auth': 'true'
            },
            body: form
        });

        const uploadData = await uploadRes.json();
        console.log("RESPONSE status:", uploadRes.status);
        console.log("RESPONSE data:", uploadData);
    } catch (err) {
        console.error("RESPONSE ERROR:", err.message);
    }
    process.exit(0);
})();
