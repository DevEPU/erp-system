const db = require('../src/config/db');

async function testAll() {
  console.log('=== 1. CHECK WORK ORDERS API QUERY ===');
  try {
    const queryWo = `
      SELECT wo.*, p.product_name, p.product_code, p.product_unit,
             COALESCE(os.customer_id, latest_po.customer_id) as customer_id,
             COALESCE(c.customer_name, cust.customer_name) as customer_name,
             COALESCE(os.reference, pro.pro_code) as order_sheet_ref,
             COALESCE(latest_po.no_po_customer, latest_po.reference) as no_po_customer,
             COALESCE(wom_stats.total_required, 0) as total_required,
             COALESCE(wom_stats.total_issued, 0) as total_issued
      FROM work_orders wo
      JOIN products p ON wo.parent_product_id = p.id
      LEFT JOIN planning_produksi pro ON pro.wo_id = wo.id
      LEFT JOIN order_sheets os ON (pro.order_sheet_id = os.id OR wo.sales_order_id = os.id)
      LEFT JOIN customers c ON os.customer_id = c.id
      LEFT JOIN (
          SELECT pod.product_id, po.customer_id, po.no_po_customer, po.reference
          FROM customer_po_details pod
          JOIN customer_po po ON pod.po_id = po.id
          ORDER BY po.id DESC
          LIMIT 1
      ) latest_po ON latest_po.product_id = wo.parent_product_id
      LEFT JOIN customers cust ON latest_po.customer_id = cust.id
      LEFT JOIN (
          SELECT work_order_id, 
                 SUM(qty_required) as total_required,
                 SUM(qty_issued) as total_issued
          FROM work_order_materials
          GROUP BY work_order_id
      ) wom_stats ON wo.id = wom_stats.work_order_id
      ORDER BY wo.id DESC
    `;
    const [rowsWo] = await db.query(queryWo);
    console.log(`Found ${rowsWo.length} Work Orders:`, rowsWo.map(r => ({ id: r.id, ref: r.reference, status: r.status, product: r.product_name })));
  } catch (err) {
    console.error('WO Query Error:', err);
  }

  console.log('\n=== 2. CHECK PLANNING PRODUKSI (MPP) ===');
  try {
    const queryPlan = `
      SELECT p.*, pr.product_name, pr.product_code, wo.reference as wo_reference
      FROM planning_produksi p
      LEFT JOIN products pr ON p.product_id = pr.id
      LEFT JOIN work_orders wo ON p.wo_id = wo.id
      ORDER BY p.id DESC
    `;
    const [rowsPlan] = await db.query(queryPlan);
    console.log(`Found ${rowsPlan.length} Planning Produksi:`, rowsPlan.map(r => ({ id: r.id, pro_code: r.pro_code, status: r.status, wo_ref: r.wo_reference })));
  } catch (err) {
    console.error('Plan Query Error:', err);
  }

  console.log('\n=== 3. CHECK PRODUCTION OUTPUTS (REALISASI & QC) ===');
  try {
    const queryOutputs = `
      SELECT po.*, p.pro_code, pr.product_name, pr.product_code
      FROM production_outputs po
      JOIN planning_produksi p ON po.pro_id = p.id
      LEFT JOIN products pr ON p.product_id = pr.id
      ORDER BY po.id DESC
    `;
    const [rowsOutputs] = await db.query(queryOutputs);
    console.log(`Found ${rowsOutputs.length} Production Outputs:`, rowsOutputs.map(r => ({ id: r.id, pro_id: r.pro_id, pro_code: r.pro_code, status: r.status, good: r.qty_ok, ng: r.qty_ng })));
  } catch (err) {
    console.error('Outputs Query Error:', err);
  }

  console.log('\n=== 4. CHECK SURAT JALAN ===');
  try {
    const querySj = `
      SELECT sj.*, c.customer_name
      FROM surat_jalan sj
      LEFT JOIN customers c ON sj.customer_id = c.id
      ORDER BY sj.id DESC
    `;
    const [rowsSj] = await db.query(querySj);
    console.log(`Found ${rowsSj.length} Surat Jalan:`, rowsSj.map(r => ({ id: r.id, ref: r.reference, customer: r.customer_name, status: r.status })));
  } catch (err) {
    console.error('SJ Query Error:', err);
  }

  console.log('\n=== 5. CHECK SURAT JALAN DETAILS ===');
  try {
    const [rowsSjd] = await db.query('SELECT * FROM surat_jalan_details ORDER BY id DESC LIMIT 10');
    console.log(`Found ${rowsSjd.length} Surat Jalan Details:`, rowsSjd);
  } catch (err) {
    console.error('SJD Query Error:', err);
  }

  process.exit(0);
}

testAll();
