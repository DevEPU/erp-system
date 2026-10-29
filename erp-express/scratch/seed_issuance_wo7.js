const db = require('../src/config/db');

async function seedIssuanceForWo7() {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const woId = 7;
    const woRef = 'WO/TEST-20261001/5050';

    // 1. Insert work order materials for WO 7
    // Materials for MIRROR,BACK (SET): Product 5039 (100 pcs), Product 5015 (2.4 kg), Product 5243 (0.1 kg)
    const materials = [
      { product_id: 5039, qty_required: 200, qty_issued: 200 },
      { product_id: 5257, qty_required: 200, qty_issued: 200 },
      { product_id: 5015, qty_required: 2.4, qty_issued: 2.4 },
      { product_id: 5243, qty_required: 0.1, qty_issued: 0.1 }
    ];

    for (const m of materials) {
      await conn.query(
        `INSERT INTO work_order_materials (work_order_id, product_id, qty_required, qty_issued, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [woId, m.product_id, m.qty_required, m.qty_issued]
      );
    }

    // 2. Insert material_issuances
    const mtrRef = 'MTR/MAT-EPU/26/10/0002';
    const [issRes] = await conn.query(
      `INSERT INTO material_issuances (reference, date, work_order_id, status, note, created_at, updated_at) VALUES (?, '2026-10-01', ?, 'Issued', 'Pengeluaran Bahan Baku Produksi E2E', NOW(), NOW())`,
      [mtrRef, woId]
    );
    const issuanceId = issRes.insertId;

    // 3. Insert material_issuance_details
    const issuanceDetails = [
      { product_id: 5039, supplier_id: 46, qty_to_issue: 200 },
      { product_id: 5257, supplier_id: 91, qty_to_issue: 200 },
      { product_id: 5015, supplier_id: 59, qty_to_issue: 2.4 },
      { product_id: 5243, supplier_id: 91, qty_to_issue: 0.1 }
    ];

    for (const d of issuanceDetails) {
      await conn.query(
        `INSERT INTO material_issuance_details (issuance_id, product_id, supplier_id, qty_to_issue, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [issuanceId, d.product_id, d.supplier_id, d.qty_to_issue]
      );
    }

    await conn.commit();
    console.log(`Successfully created material issuance ${mtrRef} (ID: ${issuanceId}) for ${woRef}`);
    process.exit(0);
  } catch (err) {
    await conn.rollback();
    console.error('Error creating material issuance:', err);
    process.exit(1);
  } finally {
    conn.release();
  }
}

seedIssuanceForWo7();
