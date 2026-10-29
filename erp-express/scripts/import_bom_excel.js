const XLSX = require('xlsx');
const db = require('../src/config/db.js');

async function importBomExcel() {
  console.log("=== IMPORTING ALL 66 BOMS & 656 COMPONENTS FROM MD BOM.xlsx ===");
  try {
    const filePath = 'C:/laragon/www/erp-epu-main/MD BOM.xlsx';
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const bomsMap = new Map();

    for (let i = 2; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length < 4) continue;

      const fgCode = row[3] ? String(row[3]).trim() : null;
      const fgName = row[4] ? String(row[4]).trim() : null;

      if (!fgCode || fgCode === 'Component') continue;

      if (!bomsMap.has(fgCode)) {
        bomsMap.set(fgCode, {
          fgCode,
          fgName,
          excelRows: []
        });
      }

      bomsMap.get(fgCode).excelRows.push(row);
    }

    const [allProducts] = await db.query("SELECT id, product_code, product_name, product_price, purchase_price, product_unit FROM products");
    const [allWarehouses] = await db.query("SELECT id, code, name FROM warehouses");
    
    // Automatically find Finished Goods Warehouse
    let fgWarehouse = allWarehouses.find(w => 
      w.name.toLowerCase().includes('finished') || 
      w.name.toLowerCase().includes('fg') || 
      w.code.toLowerCase().includes('fg')
    );
    const targetWarehouseId = fgWarehouse ? fgWarehouse.id : (allWarehouses[0]?.id || 3);

    const [existingBoms] = await db.query("SELECT id, bom_code, finished_good_code FROM boms");

    let totalInsertedLevel2 = 0;
    let totalInsertedLevel3 = 0;
    let totalInsertedLevel4 = 0;

    for (const [fgCode, bomGroup] of bomsMap.entries()) {
      const existingBom = existingBoms.find(b => b.finished_good_code === fgCode);
      if (!existingBom) continue;

      const bomId = existingBom.id;

      // Update header target warehouse to Finished Goods
      await db.query("UPDATE boms SET target_warehouse_id = ? WHERE id = ?", [targetWarehouseId, bomId]);
      await db.query("DELETE FROM bom_items WHERE bom_id = ?", [bomId]);

      let opSeq = 10;
      let matCostTotal = 0;

      for (const row of bomGroup.excelRows) {
        const comp2Code = row[6] ? String(row[6]).trim() : null;
        const comp2Name = row[7] ? String(row[7]).trim() : null;
        const comp2Qty = row[8] !== undefined && row[8] !== null && !isNaN(Number(row[8])) ? Number(row[8]) : 0;
        const comp2Uom = row[9] ? String(row[9]).trim() : 'Pcs';
        const comp2Price = row[10] !== undefined && row[10] !== null && !isNaN(Number(row[10])) ? Number(row[10]) : 0;

        const comp3Code = row[13] ? String(row[13]).trim() : null;
        const comp3Name = row[14] ? String(row[14]).trim() : null;
        const comp3Qty = row[15] !== undefined && row[15] !== null && !isNaN(Number(row[15])) ? Number(row[15]) : 0;
        const comp3Uom = row[16] ? String(row[16]).trim() : 'Pcs';
        const comp3Price = row[17] !== undefined && row[17] !== null && !isNaN(Number(row[17])) ? Number(row[17]) : 0;

        const comp4Code = row[20] ? String(row[20]).trim() : null;
        const comp4Name = row[21] ? String(row[21]).trim() : null;
        const comp4Qty = row[22] !== undefined && row[22] !== null && !isNaN(Number(row[22])) ? Number(row[22]) : 0;
        const comp4Uom = row[23] ? String(row[23]).trim() : 'Pcs';
        const comp4Price = row[24] !== undefined && row[24] !== null && !isNaN(Number(row[24])) ? Number(row[24]) : 0;

        if (!comp2Code) continue;

        const matchedProd2 = allProducts.find(p => p.product_code === comp2Code);
        const finalPrice2 = comp2Price || (matchedProd2 ? Number(matchedProd2.purchase_price || matchedProd2.product_price || 0) : 0);
        const itemType2 = comp3Code ? 'WIP' : (comp2Code.startsWith('EPIN') || comp2Code.startsWith('EPIB') || comp2Code.startsWith('EPPK') ? 'PACKAGING' : (comp2Code.startsWith('EPCM') ? 'CONSUMABLE' : 'RAW'));

        const [comp2Res] = await db.query(
          `INSERT INTO bom_items (
             bom_id, parent_item_id, item_type, warehouse_id, product_code, 
             part_number, product_name, qty, unit, price, scrap_percent, gross_qty, operation_seq, created_at
           ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, NOW())`,
          [bomId, itemType2, targetWarehouseId, comp2Code, comp2Code, comp2Name || comp2Code, comp2Qty, comp2Uom, finalPrice2, comp2Qty, opSeq]
        );

        const parent2Id = comp2Res.insertId;
        totalInsertedLevel2++;
        opSeq += 10;
        matCostTotal += (comp2Qty * finalPrice2);

        if (comp3Code) {
          const matchedProd3 = allProducts.find(p => p.product_code === comp3Code);
          const finalPrice3 = comp3Price || (matchedProd3 ? Number(matchedProd3.purchase_price || matchedProd3.product_price || 0) : 0);
          const itemType3 = comp4Code ? 'WIP' : 'RAW';

          const [comp3Res] = await db.query(
            `INSERT INTO bom_items (
               bom_id, parent_item_id, item_type, warehouse_id, product_code, 
               part_number, product_name, qty, unit, price, scrap_percent, gross_qty, operation_seq, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, NOW())`,
            [bomId, parent2Id, itemType3, targetWarehouseId, comp3Code, comp3Code, comp3Name || comp3Code, comp3Qty, comp3Uom, finalPrice3, comp3Qty, opSeq]
          );

          const parent3Id = comp3Res.insertId;
          totalInsertedLevel3++;
          opSeq += 5;
          matCostTotal += (comp3Qty * finalPrice3);

          if (comp4Code) {
            const matchedProd4 = allProducts.find(p => p.product_code === comp4Code);
            const finalPrice4 = comp4Price || (matchedProd4 ? Number(matchedProd4.purchase_price || matchedProd4.product_price || 0) : 0);

            await db.query(
              `INSERT INTO bom_items (
                 bom_id, parent_item_id, item_type, warehouse_id, product_code, 
                 part_number, product_name, qty, unit, price, scrap_percent, gross_qty, operation_seq, created_at
               ) VALUES (?, ?, 'RAW', ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, NOW())`,
              [bomId, parent3Id, targetWarehouseId, comp4Code, comp4Code, comp4Name || comp4Code, comp4Qty, comp4Uom, finalPrice4, comp4Qty, opSeq]
            );

            totalInsertedLevel4++;
            opSeq += 5;
            matCostTotal += (comp4Qty * finalPrice4);
          }
        }
      }

      await db.query("UPDATE boms SET total_cost = ? WHERE id = ?", [matCostTotal, bomId]);
    }

    console.log(`\nImport Full Success: ${totalInsertedLevel2 + totalInsertedLevel3 + totalInsertedLevel4} total component items inserted across all 66 BOMs with Target Warehouse = Gudang Finished Goods.`);
    process.exit(0);
  } catch (err) {
    console.error("Import BOM error:", err);
    process.exit(1);
  }
}

importBomExcel();
