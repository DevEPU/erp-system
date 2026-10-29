const http = require('http');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Querying API /api/products?limit=10&page=1...');
    const res = await get('http://127.0.0.1:5656/api/products?limit=10&page=1');
    
    console.log('\n=== API Response Pagination Details ===');
    console.log(`Success     : ${res.success}`);
    console.log(`Current Page: ${res.current_page}`);
    console.log(`Per Page    : ${res.per_page}`);
    console.log(`Last Page   : ${res.last_page}`);
    console.log(`Total Count : ${res.total}`);
    console.log(`Rows Length : ${res.data.length}`);
    
    console.log('\nFirst 3 items:');
    res.data.slice(0, 3).forEach((item, idx) => {
      console.log(`${idx + 1}. Name: ${item.product_name} | Code: ${item.product_code} | Supplier: ${item.supplier?.supplier_name || '-'}`);
    });
  } catch (e) {
    console.error('API request failed:', e.message);
  }
}

run();
