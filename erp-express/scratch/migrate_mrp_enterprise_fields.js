const db = require('../src/config/db');

async function migrateMRP() {
    console.log('[MIGRATION] Adding enterprise manufacturing ERP fields to MRP tables...');
    
    // Columns to add to `mrps`
    const mrpCols = [
        `ALTER TABLE mrps ADD COLUMN planning_source VARCHAR(100) DEFAULT 'PO Customer' AFTER po_customer_id`,
        `ALTER TABLE mrps ADD COLUMN forecast_id BIGINT UNSIGNED NULL AFTER planning_source`,
        `ALTER TABLE mrps ADD COLUMN warehouse_id BIGINT UNSIGNED NULL AFTER forecast_id`,
        `ALTER TABLE mrps ADD COLUMN planner_name VARCHAR(255) NULL AFTER warehouse_id`,
        `ALTER TABLE mrps ADD COLUMN safety_stock_percent DECIMAL(5,2) DEFAULT 0.00 AFTER planner_name`,
        `ALTER TABLE mrps ADD COLUMN scrap_loss_percent DECIMAL(5,2) DEFAULT 0.00 AFTER safety_stock_percent`,
        `ALTER TABLE mrps ADD COLUMN total_gross_qty DECIMAL(15,2) DEFAULT 0.00 AFTER time_frame_end`,
        `ALTER TABLE mrps ADD COLUMN total_net_qty DECIMAL(15,2) DEFAULT 0.00 AFTER total_gross_qty`,
        `ALTER TABLE mrps ADD COLUMN total_est_cost DECIMAL(15,2) DEFAULT 0.00 AFTER total_net_qty`,
        `ALTER TABLE mrps ADD COLUMN note TEXT NULL AFTER total_est_cost`
    ];

    for (const q of mrpCols) {
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

    // Columns to add to `mrp_details`
    const mrpDetailCols = [
        `ALTER TABLE mrp_details ADD COLUMN gross_qty DECIMAL(15,2) DEFAULT 0.00 AFTER product_id`,
        `ALTER TABLE mrp_details ADD COLUMN safety_stock_qty DECIMAL(15,2) DEFAULT 0.00 AFTER gross_qty`,
        `ALTER TABLE mrp_details ADD COLUMN current_stock DECIMAL(15,2) DEFAULT 0.00 AFTER safety_stock_qty`,
        `ALTER TABLE mrp_details ADD COLUMN on_order_qty DECIMAL(15,2) DEFAULT 0.00 AFTER current_stock`,
        `ALTER TABLE mrp_details ADD COLUMN net_qty DECIMAL(15,2) DEFAULT 0.00 AFTER qty_required`,
        `ALTER TABLE mrp_details ADD COLUMN unit_price DECIMAL(15,2) DEFAULT 0.00 AFTER net_qty`,
        `ALTER TABLE mrp_details ADD COLUMN subtotal_cost DECIMAL(15,2) DEFAULT 0.00 AFTER unit_price`,
        `ALTER TABLE mrp_details ADD COLUMN bom_ref VARCHAR(255) NULL AFTER subtotal_cost`,
        `ALTER TABLE mrp_details ADD COLUMN remark VARCHAR(255) NULL AFTER bom_ref`
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

    console.log('[MIGRATION COMPLETED] Enterprise MRP schema ready.');
    process.exit(0);
}

migrateMRP().catch(e => {
    console.error('[MIGRATION FAILED]', e);
    process.exit(1);
});
