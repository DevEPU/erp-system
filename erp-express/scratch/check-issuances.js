const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDb() {
  try {
    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    
    console.log('--- ALL MATERIAL ISSUANCES ---');
    const [issuances] = await connection.execute('SELECT * FROM material_issuances LIMIT 10');
    console.log(issuances);
    
    console.log('--- ALL WORK ORDERS ---');
    const [wos] = await connection.execute('SELECT * FROM work_orders LIMIT 10');
    console.log(wos);
    
    console.log('--- INNER JOIN TEST ---');
    const [joined] = await connection.execute(`
      SELECT mi.id, mi.reference, mi.work_order_id, wo.reference as wo_reference, wo.parent_product_id
      FROM material_issuances mi
      INNER JOIN work_orders wo ON mi.work_order_id = wo.id
    `);
    console.log('Inner Join with WOs count:', joined.length);
    console.log(joined);

    console.log('--- PRODUCTS JOIN TEST ---');
    const [joinedProducts] = await connection.execute(`
      SELECT mi.id, mi.reference, mi.work_order_id, wo.reference as wo_reference, p.product_name
      FROM material_issuances mi
      INNER JOIN work_orders wo ON mi.work_order_id = wo.id
      INNER JOIN products p ON wo.parent_product_id = p.id
    `);
    console.log('Inner Join with Products count:', joinedProducts.length);
    console.log(joinedProducts);

    await connection.end();
  } catch (error) {
    console.error('Error running check:', error);
  }
}

checkDb();
