const db = require('../src/config/db');

async function createTables() {
    const connection = await db.getConnection();
    try {
        console.log('Creating work_orders table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS work_orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(255) NOT NULL UNIQUE,
                date DATE NOT NULL,
                parent_product_id BIGINT UNSIGNED NOT NULL,
                target_qty DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                status VARCHAR(50) NOT NULL DEFAULT 'Pending',
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        console.log('Creating work_order_materials table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS work_order_materials (
                id INT AUTO_INCREMENT PRIMARY KEY,
                work_order_id INT NOT NULL,
                product_id BIGINT UNSIGNED NOT NULL,
                qty_required DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                qty_issued DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        console.log('Creating material_issuances table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS material_issuances (
                id INT AUTO_INCREMENT PRIMARY KEY,
                reference VARCHAR(255) NOT NULL UNIQUE,
                date DATE NOT NULL,
                work_order_id INT NOT NULL,
                status VARCHAR(50) NOT NULL DEFAULT 'Draft',
                note TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
            )
        `);

        console.log('Creating material_issuance_details table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS material_issuance_details (
                id INT AUTO_INCREMENT PRIMARY KEY,
                issuance_id INT NOT NULL,
                product_id BIGINT UNSIGNED NOT NULL,
                supplier_id BIGINT UNSIGNED NULL,
                qty_to_issue DECIMAL(15,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (issuance_id) REFERENCES material_issuances(id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
            )
        `);

        console.log('All tables created successfully!');
    } catch (e) {
        console.error('Error creating tables:', e);
    } finally {
        connection.release();
        process.exit();
    }
}

createTables();
