const db = require('./src/config/db');

async function run() {
  try {
    console.log('=== CREATING MOLD_PRODUCTS TABLE ===');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS mold_products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        mold_id INT NOT NULL,
        product_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_mold_product (mold_id, product_id),
        FOREIGN KEY (mold_id) REFERENCES molds(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('- Table "mold_products" created or already exists.');

    // Seed default connections based on existing product data
    const [existing] = await db.query('SELECT COUNT(*) as count FROM mold_products');
    if (existing[0].count === 0) {
      // Fetch molds
      const [molds] = await db.query('SELECT id, code FROM molds');
      // Fetch products to link
      const [products] = await db.query('SELECT id, product_code, product_name FROM products LIMIT 500');

      const seeds = [];

      for (const m of molds) {
        if (!m.code) continue;
        
        // Find products that match the mold keyword
        const moldKeyword = m.code.replace('MOLD-', '').replace('-RH', '').replace('-LH', '').toLowerCase();
        
        const matches = products.filter(p => {
          const codeMatch = p.product_code && p.product_code.toLowerCase().includes(moldKeyword);
          const nameMatch = p.product_name && p.product_name.toLowerCase().includes(moldKeyword);
          return codeMatch || nameMatch;
        });

        if (matches.length > 0) {
          for (const p of matches) {
            seeds.push([m.id, p.id]);
          }
        }
      }

      // If no dynamic matches, map some standard IDs (fallback)
      if (seeds.length === 0 && molds.length > 0 && products.length > 0) {
        seeds.push([molds[0].id, products[0].id]);
        if (products[1]) seeds.push([molds[0].id, products[1].id]); // 1 mold multiple products
        if (molds[1] && products[2]) seeds.push([molds[1].id, products[2].id]);
      }

      for (const row of seeds) {
        await db.query('INSERT IGNORE INTO mold_products (mold_id, product_id) VALUES (?, ?)', row);
      }
      console.log(`- Seeded ${seeds.length} initial mold-product mappings.`);
    } else {
      console.log('- Table "mold_products" already has data. Seeding skipped.');
    }

    console.log('=== MOLD_PRODUCTS MIGRATION COMPLETED SUCCESSFULLY ===');
  } catch (err) {
    console.error('Migration Failed:', err);
  } finally {
    process.exit(0);
  }
}

run();
