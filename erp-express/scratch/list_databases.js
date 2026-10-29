const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/');
  const [dbs] = await conn.query('SHOW DATABASES');
  console.log('Databases on server:', dbs.map(d => Object.values(d)[0]));
  await conn.end();
}

run().catch(e => console.error(e));
