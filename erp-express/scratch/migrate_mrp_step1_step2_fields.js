const db = require('../src/config/db');

async function migrateMRP2Step() {
    console.log('[MIGRATION] Adding 2-step MRP (Physical Demand & Vendor Allocation) fields...');

    const mrpDetailCols = [
        `ALTER TABLE mrp_details ADD COLUMN class_type VARCHAR(50) DEFAULT 'Component' AFTER product_id`,
        `ALTER TABLE mrp_details ADD COLUMN source_type VARCHAR(50) DEFAULT 'Buy' AFTER class_type`,
        `ALTER TABLE mrp_details ADD COLUMN need_all_qty DECIMAL(15,2) DEFAULT 0.00 AFTER source_type`,
        `ALTER TABLE mrp_details ADD COLUMN stock_std_qty DECIMAL(15,2) DEFAULT 0.00 AFTER need_all_qty`,
        `ALTER TABLE mrp_details ADD COLUMN sto_qty DECIMAL(15,2) DEFAULT 0.00 AFTER stock_std_qty`,
        `ALTER TABLE mrp_details ADD COLUMN supplier_id BIGINT UNSIGNED NULL AFTER remark`,
        `ALTER TABLE mrp_details ADD COLUMN part_no_vendor VARCHAR(255) NULL AFTER supplier_id`,
        `ALTER TABLE mrp_details ADD COLUMN part_name_vendor VARCHAR(255) NULL AFTER part_no_vendor`,
        `ALTER TABLE mrp_details ADD COLUMN ord_qty DECIMAL(15,2) DEFAULT 0.00 AFTER part_name_vendor`,
        `ALTER TABLE mrp_details ADD COLUMN mrp_qty DECIMAL(15,2) DEFAULT 0.00 AFTER ord_qty`,
        `ALTER TABLE mrp_details ADD COLUMN amount DECIMAL(15,2) DEFAULT 0.00 AFTER mrp_qty`
    ];

    for (const q of mrpDetailCols) {
        try {
            await db.query(q);
            console.log(`[OK] Executed: ${q.split('ADD COLUMN ')[1] || q}`);
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log(`[SKIP] Column already exists`);
            } else {
                console.error(`[ERROR] ${err.message}`);
            }
        }
    }

    console.log('[MIGRATION COMPLETED] 2-Step MRP schema ready.');
    process.exit(0);
}

migrateMRP2Step().catch(e => {
    console.error('[MIGRATION FAILED]', e);
    process.exit(1);
});
