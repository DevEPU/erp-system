const db = require('../src/config/db');

async function createTables() {
    const connection = await db.getConnection();
    try {
        console.log('Creating stock_opnames table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS stock_opnames (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(255) NOT NULL UNIQUE,
                date DATE NOT NULL,
                warehouse_id INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Draft',
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
            )
        `);

        console.log('Creating stock_opname_details table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS stock_opname_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                opname_id INT NOT NULL,
                product_id BIGINT UNSIGNED NOT NULL,
                supplier_id BIGINT UNSIGNED NULL,
                qty_system DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                qty_physical DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                qty_difference DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (opname_id) REFERENCES stock_opnames(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
            )
        `);

        console.log('Stock Opname tables created successfully!');
    } catch (e) {
        console.error('Error creating STO tables:', e);
    } finally {
        connection.release();
        process.exit();
    }
}

createTables();
