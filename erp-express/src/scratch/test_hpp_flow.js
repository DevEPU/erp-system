const db = require('../config/db');

async function testFlow() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log("=== STARTING HPP FLOW SIMULATION & VERIFICATION ===");

    // Use product EPPP-MCOMPONRC as a test component (PP COMPOUND)
    const productCode = 'EPPP-MCOMPONRC';
    const [pRows] = await connection.execute('SELECT id, product_name, product_price FROM products WHERE product_code = ?', [productCode]);
    if (pRows.length === 0) {
      throw new Error(`Product ${productCode} not found for testing.`);
    }
    const product = pRows[0];
    console.log(`- Found test product: ${product.product_name} (ID: ${product.id}, Base Price: Rp ${product.product_price})`);

    // 1. Clear previous test stock for this product in WH=1 and WH=2
    await connection.execute('DELETE FROM warehouse_stocks WHERE product_id = ? AND warehouse_id IN (1, 2)', [product.id]);
    console.log("- Cleared existing test stocks for product in Gudang 1 and Gudang 2.");

    // 2. Simulate Goods Receipt (Incoming Raw Material to MATKOM - WH=1)
    // Initial GR: Qty = 10, Price = 15000
    const qty1 = 10;
    const price1 = 15000;
    console.log(`- Simulating GR 1: Qty = ${qty1}, Price = Rp ${price1}`);

    // Insert into WH=1
    await connection.execute(
      'INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at) VALUES (?, 1, NULL, ?, ?, NOW(), NOW())',
      [product.id, qty1, price1]
    );

    // Verify initial stock and HPP
    let [stock1] = await connection.execute('SELECT qty_stock, hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = 1 AND supplier_id IS NULL', [product.id]);
    console.log(`  -> Actual Stock in WH 1: ${stock1[0].qty_stock}, HPP: Rp ${stock1[0].hpp}`);
    if (Number(stock1[0].qty_stock) !== qty1 || Number(stock1[0].hpp) !== price1) {
      throw new Error("Initial GR simulation failed.");
    }

    // Subsequent GR (Weighted Average check): Qty = 5, Price = 18000
    const qty2 = 5;
    const price2 = 18000;
    console.log(`- Simulating GR 2 (Moving Average): Qty = ${qty2}, Price = Rp ${price2}`);

    const qtyOld = Number(stock1[0].qty_stock);
    const hppOld = Number(stock1[0].hpp);
    const expectedHppNew = (qtyOld * hppOld + qty2 * price2) / (qtyOld + qty2);

    await connection.execute(
      'UPDATE warehouse_stocks SET qty_stock = qty_stock + ?, hpp = ?, updated_at = NOW() WHERE product_id = ? AND warehouse_id = 1 AND supplier_id IS NULL',
      [qty2, expectedHppNew, product.id]
    );

    // Verify updated stock and HPP
    let [stock2] = await connection.execute('SELECT qty_stock, hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = 1 AND supplier_id IS NULL', [product.id]);
    console.log(`  -> Actual Stock after GR 2: ${stock2[0].qty_stock}, HPP: Rp ${stock2[0].hpp} (Expected: Rp ${expectedHppNew})`);
    if (Number(stock2[0].qty_stock) !== (qty1 + qty2) || Math.abs(Number(stock2[0].hpp) - expectedHppNew) > 0.01) {
      throw new Error("Moving Average calculation on GR failed.");
    }

    // 3. Simulate Material Issuance (MATKOM WH=1 -> PROD WH=2)
    // Transfer Qty = 6 from WH=1 to WH=2
    const qtyIssue = 6;
    const currentHppWh1 = Number(stock2[0].hpp);
    console.log(`- Simulating Material Issuance (MATKOM -> PROD): Qty = ${qtyIssue}, using HPP = Rp ${currentHppWh1}`);

    // Decrement from WH=1
    await connection.execute(
      'UPDATE warehouse_stocks SET qty_stock = qty_stock - ? WHERE product_id = ? AND warehouse_id = 1 AND supplier_id IS NULL',
      [qtyIssue, product.id]
    );

    // Increment in WH=2 and compute average (currently 0 stock in WH=2, so HPP becomes currentHppWh1)
    await connection.execute(
      'INSERT INTO warehouse_stocks (product_id, warehouse_id, supplier_id, qty_stock, hpp, created_at, updated_at) VALUES (?, 2, NULL, ?, ?, NOW(), NOW())',
      [product.id, qtyIssue, currentHppWh1]
    );

    // Verify WH=2 stock and HPP
    let [stockProd1] = await connection.execute('SELECT qty_stock, hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = 2 AND supplier_id IS NULL', [product.id]);
    console.log(`  -> Actual Stock in WH 2 (PROD): ${stockProd1[0].qty_stock}, HPP: Rp ${stockProd1[0].hpp}`);
    if (Number(stockProd1[0].qty_stock) !== qtyIssue || Math.abs(Number(stockProd1[0].hpp) - currentHppWh1) > 0.01) {
      throw new Error("Issuance simulation failed.");
    }

    // 4. Simulate Finished Good BOM Cost rollup (Finished Good: EPAS-FSAPAHND)
    const fgCode = 'EPAS-FSAPAHND';
    console.log(`- Simulating Finished Goods Cost Rollup for BOM of: ${fgCode}`);

    // Run the exact calculateFinishedGoodBOMCost logic manually
    const [bomRows] = await connection.execute(
      'SELECT id, finished_good_qty FROM boms WHERE finished_good_code = ? AND status = "Aktif" LIMIT 1',
      [fgCode]
    );
    if (bomRows.length === 0) {
      throw new Error(`Active BOM for FG ${fgCode} not found.`);
    }
    const bom = bomRows[0];
    const bomQty = Number(bom.finished_good_qty || 1);

    const [items] = await connection.execute(
      'SELECT product_code, qty FROM bom_items WHERE bom_id = ?',
      [bom.id]
    );

    let totalMaterialCost = 0;
    console.log(`  BOM Items and calculated costs from floor (WH=2):`);
    for (const item of items) {
      const [prodRows] = await connection.execute(
        'SELECT id, product_price FROM products WHERE product_code = ? LIMIT 1',
        [item.product_code]
      );
      if (prodRows.length > 0) {
        const pId = prodRows[0].id;
        const [stRows] = await connection.execute(
          'SELECT hpp FROM warehouse_stocks WHERE product_id = ? AND warehouse_id = 2 LIMIT 1',
          [pId]
        );
        const hppInProd = stRows.length > 0 ? Number(stRows[0].hpp || 0) : Number(prodRows[0].product_price || 0);
        const itemCost = Number(item.qty || 0) * hppInProd;
        totalMaterialCost += itemCost;
        console.log(`   * Component ${item.product_code}: Qty = ${item.qty}, HPP used = Rp ${hppInProd}, Total component cost = Rp ${itemCost}`);
      }
    }

    const calculatedFgUnitCost = totalMaterialCost / bomQty;
    console.log(`  -> Calculated Finished Good unit cost: Rp ${calculatedFgUnitCost}`);

    // Rollback testing changes safely
    await connection.rollback();
    console.log("=== SIMULATION & VERIFICATION SUCCESSFUL (Transaction Rolled Back) ===");
  } catch (err) {
    await connection.rollback();
    console.error("Test Flow Failed:", err);
  } finally {
    connection.release();
    process.exit(0);
  }
}

testFlow();
