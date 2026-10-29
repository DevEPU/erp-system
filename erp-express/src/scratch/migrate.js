const db = require('../config/db');

(async () => {
    try {
        await db.execute('ALTER TABLE machines ADD COLUMN leader_group VARCHAR(100) DEFAULT NULL AFTER status, ADD COLUMN standard_mp INT DEFAULT 1 AFTER leader_group');
        console.log('OK: machines altered');
    } catch(e) {
        console.log('machines:', e.message);
    }

    try {
        await db.execute('ALTER TABLE planning_produksi ADD COLUMN shift_hours DECIMAL(4,2) DEFAULT 7.00 AFTER shift, ADD COLUMN uph_used INT DEFAULT NULL AFTER shift_hours, ADD COLUMN downtime_reason VARCHAR(255) DEFAULT NULL AFTER uph_used');
        console.log('OK: planning_produksi altered');
    } catch(e) {
        console.log('planning_produksi:', e.message);
    }

    try {
        await db.execute(`CREATE TABLE IF NOT EXISTS leader_groups (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            description VARCHAR(255) DEFAULT NULL,
            is_active TINYINT DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`);
        console.log('OK: leader_groups created');
    } catch(e) {
        console.log('leader_groups:', e.message);
    }

    process.exit(0);
})();
