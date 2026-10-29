const db = require('./src/config/db'); 
async function test() { 
  const conn = await db.getConnection(); 
  try { 
    await conn.beginTransaction(); 
    const poId = 1; // Assuming PO 1 exists
    const podSql = `INSERT INTO purchase_order_details SET 
                        po_id = ?, 
                        product_id = ?, 
                        pr_detail_id = ?, 
                        product_name = ?, 
                        product_code = ?, 
                        quantity = ?, 
                        price = ?, 
                        unit_price = ?, 
                        product_unit = ?, 
                        sub_total = ?, 
                        is_asset = ?, 
                        product_discount_amount = ?, 
                        product_discount_type = ?, 
                        product_tax_amount = ?, 
                        created_at = NOW(), 
                        updated_at = NOW()`;

    const podParams = [
      poId, 1, null, 'Test Prod', 'T001', 1, 100, 100, 'Pcs', 100, 0, 0, 'fixed', 0
    ];

    console.log('Inserting POD...');
    const [res] = await conn.execute(podSql, podParams);
    console.log('POD OK', res.insertId);
  } catch(e) { 
    console.error('FAIL:', e.message); 
  } finally { 
    await conn.rollback();
    conn.release();
    process.exit(0);
  } 
} 
test();
