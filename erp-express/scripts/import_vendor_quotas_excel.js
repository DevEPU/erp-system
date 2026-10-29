const XLSX = require('xlsx');
const db = require('../src/config/db.js');

async function importVendorQuotasExcel() {
  console.log("=== IMPORTING VENDOR QUOTAS FROM EXCEL TO DATABASE ===");
  try {
    const filePath = 'C:/laragon/www/erp-epu-main/MD Vendor New.xlsx';
    const workbook = XLSX.readFile(filePath);
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const itemsToProcess = [];
    for (let i = 3; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length < 7) continue;

      const partNo = row[2] ? String(row[2]).trim() : null;
      const partName = row[3] ? String(row[3]).trim() : null;
      const partNoVendor = row[4] ? String(row[4]).trim() : null;
      const partNameVendor = row[5] ? String(row[5]).trim() : null;
      const vendorName = row[6] ? String(row[6]).trim() : null;
      const price = row[7] ? Number(row[7]) || 0 : 0;
      const rawQuota = row[11] !== undefined && row[11] !== null ? Number(row[11]) : null;

      if (!partNo || !vendorName) continue;

      let quotaPercent = 0;
      if (rawQuota !== null && !isNaN(rawQuota)) {
        quotaPercent = rawQuota <= 1.0 ? Math.round(rawQuota * 100) : Math.round(rawQuota);
      }

      itemsToProcess.push({
        partNo,
        partName,
        partNoVendor,
        partNameVendor,
        vendorName,
        price,
        quotaPercent
      });
    }

    const [allSuppliers] = await db.query("SELECT id, supplier_name, supplier_code FROM suppliers");
    const [allProducts] = await db.query("SELECT id, product_code, product_name FROM products");

    const findSupplierId = (excelVendorName) => {
      if (!excelVendorName) return null;
      const cleanExcel = excelVendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const s of allSuppliers) {
        const cleanDB = s.supplier_name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanDB === cleanExcel || cleanDB.includes(cleanExcel) || cleanExcel.includes(cleanDB)) {
          return s.id;
        }
      }
      return null;
    };

    const findProductId = (partNo, partName) => {
      const matchByCode = allProducts.find(p => p.product_code === partNo);
      if (matchByCode) return matchByCode.id;

      const matchByName = allProducts.find(p => p.product_name === partName);
      if (matchByName) return matchByName.id;

      return null;
    };

    let updatedCount = 0;
    let insertedCount = 0;

    for (const item of itemsToProcess) {
      const productId = findProductId(item.partNo, item.partName);
      const supplierId = findSupplierId(item.vendorName);

      if (!productId || !supplierId) continue;

      const [existing] = await db.query(
        "SELECT id FROM product_suppliers WHERE product_id = ? AND supplier_id = ?",
        [productId, supplierId]
      );

      if (existing.length > 0) {
        await db.query(
          `UPDATE product_suppliers SET 
             allocation_percent = ?, 
             purchase_price = ?, 
             supplier_part_number = ?,
             updated_at = NOW() 
           WHERE id = ?`,
          [item.quotaPercent, item.price, item.partNoVendor, existing[0].id]
        );
        updatedCount++;
      } else {
        await db.query(
          `INSERT INTO product_suppliers 
             (product_id, supplier_id, supplier_part_number, purchase_price, allocation_percent, is_primary, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
          [productId, supplierId, item.partNoVendor, item.price, item.quotaPercent]
        );
        insertedCount++;
      }
    }

    console.log(`\nImport Success: Updated ${updatedCount} rows, Inserted ${insertedCount} rows.`);
    process.exit(0);
  } catch (err) {
    console.error("Import error:", err);
    process.exit(1);
  }
}

importVendorQuotasExcel();
