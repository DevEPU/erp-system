const mysql = require('mysql2/promise');
const XLSX = require('xlsx');

async function run() {
  const conn = await mysql.createConnection('mysql://root:@127.0.0.1:3306/budgeting');
  console.log('Connected to DB');

  // Load Excel
  const wb = XLSX.readFile('C:/laragon/www/erp-epu-main/06. Jun MD Vendor 1.xlsx');
  const ws = wb.Sheets['4. MD Vendor'];
  const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });
  const rows = rawData.slice(3).filter(r => r[3] && r[4] && r[5]); // partNo, partName, vendor

  console.log(`Excel records: ${rows.length}`);

  // Load product_suppliers
  const [psRows] = await conn.query('SELECT id, product_id, supplier_part_number, product_name FROM product_suppliers');
  console.log(`DB product_suppliers records: ${psRows.length}`);

  let exactMatches = 0;
  let codeMatchesOnly = 0;
  let nameMatchesOnly = 0;
  let noMatches = 0;

  for (const r of rows) {
    const partNo = String(r[3]).trim().toLowerCase();
    const partName = String(r[4]).trim().toLowerCase();
    const priceJune2026 = r[48]; // Column index 48 (2026-06-01)

    const exact = psRows.find(ps => 
      String(ps.supplier_part_number || '').trim().toLowerCase() === partNo &&
      String(ps.product_name || '').trim().toLowerCase() === partName
    );

    if (exact) {
      exactMatches++;
      continue;
    }

    const codeOnly = psRows.find(ps => 
      String(ps.supplier_part_number || '').trim().toLowerCase() === partNo
    );

    if (codeOnly) {
      codeMatchesOnly++;
      continue;
    }

    const nameOnly = psRows.find(ps => 
      String(ps.product_name || '').trim().toLowerCase() === partName
    );

    if (nameOnly) {
      nameMatchesOnly++;
      continue;
    }

    noMatches++;
  }

  console.log(`Exact Matches (Code & Name): ${exactMatches}`);
  console.log(`Code Matches Only: ${codeMatchesOnly}`);
  console.log(`Name Matches Only: ${nameMatchesOnly}`);
  console.log(`No Matches at all: ${noMatches}`);

  await conn.end();
}

run();
