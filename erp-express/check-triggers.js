const db = require('./src/config/db'); 
db.query("SHOW TRIGGERS").then(([r]) => console.table(r)).catch(console.error).finally(() => process.exit());
