const db = require('../src/config/db');

async function migrate() {
    console.log("Connected to MySQL DB.");

    const addCol = async (sql) => {
        try {
            await db.query(sql);
            console.log("EXEC OK:", sql);
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("Column exists:", e.message);
            } else {
                console.error("Migration error:", e.message);
            }
        }
    };

    await addCol("ALTER TABLE customer_po ADD COLUMN po_type VARCHAR(50) DEFAULT 'Regular Order' AFTER no_po_customer");
    await addCol("ALTER TABLE customer_po ADD COLUMN shipping_method VARCHAR(100) DEFAULT 'Franco' AFTER ship_to_address");
    await addCol("ALTER TABLE customer_po ADD COLUMN bill_to_address TEXT NULL AFTER shipping_method");
    await addCol("ALTER TABLE customer_po ADD COLUMN contact_person VARCHAR(100) NULL AFTER bill_to_address");
    await addCol("ALTER TABLE customer_po ADD COLUMN contact_phone VARCHAR(50) NULL AFTER contact_person");
    await addCol("ALTER TABLE customer_po ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Transfer Bank' AFTER currency_id");
    await addCol("ALTER TABLE customer_po ADD COLUMN shipping_cost DECIMAL(15,2) DEFAULT 0 AFTER tax_amount");

    process.exit(0);
}

migrate().catch((e) => { console.error(e); process.exit(1); });
