const db = require('../src/config/db.js');

async function addMatkomProductsToProduksi() {
  console.log("=== LINKING ALL MATKOM PRODUCTS TO GUDANG PRODUKSI ===");
  try {
    const matkomWhId = 1;
    const prodWhId = 2;

    const [matkomPlRows] = await db.query("SELECT * FROM product_locations WHERE warehouse_id = ?", [matkomWhId]);
    const [prodPlRows] = await db.query("SELECT product_id FROM product_locations WHERE warehouse_id = ?", [prodWhId]);
    const existingProdPlIds = new Set(prodPlRows.map(r => r.product_id));

    let addedPlCount = 0;
    for (const pl of matkomPlRows) {
      if (!existingProdPlIds.has(pl.product_id)) {
        await db.query(
          `INSERT INTO product_locations (product_id, warehouse_id, aisle, stock, min_qty, max_qty, created_at, updated_at)
           VALUES (?, ?, ?, 0.00, ?, ?, NOW(), NOW())`,
          [pl.product_id, prodWhId, pl.aisle || null, pl.min_qty || 0, pl.max_qty || 0]
        );
        addedPlCount++;
        existingProdPlIds.add(pl.product_id);
      }
    }

    const [matkomWsRows] = await db.query("SELECT * FROM warehouse_stocks WHERE warehouse_id = ?", [matkomWhId]);
    const [prodWsRows] = await db.query("SELECT product_id, supplier_id FROM warehouse_stocks WHERE warehouse_id = ?", [prodWhId]);
    const existingProdWsKeys = new Set(prodWsRows.map(r => `${r.product_id}_${r.supplier_id || 0}`));

    let addedWsCount = 0;
    for (const ws of matkomWsRows) {
      const key = `${ws.product_id}_${ws.supplier_id || 0}`;
      if (!existingProdWsKeys.has(key)) {
        await db.query(
          `INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at)
           VALUES (?, ?, ?, 0.00, ?, NOW(), NOW())`,
          [ws.product_id, prodWhId, ws.supplier_id || null, ws.hpp || 0.00]
        );
        addedWsCount++;
        existingProdWsKeys.add(key);
      }
    }

    console.log(`Success: Added ${addedPlCount} product locations and ${addedWsCount} warehouse stock records to Gudang Produksi.`);
    process.exit(0);
  } catch (err) {
    console.error("Error linking MATKOM products to Gudang Produksi:", err);
    process.exit(1);
  }
}

addMatkomProductsToProduksi();
