const productController = require('../src/controllers/productController');

async function run() {
  const req = {
    query: {
      limit: '10',
      page: '1',
      parent_only: 'false'
    },
    user: { id: 1 } // Super Admin or mocked user
  };

  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log('\n=== DIRECT CONTROLLER RESPONSE ===');
      console.log('Success     :', data.success);
      console.log('Current Page:', data.current_page);
      console.log('Per Page    :', data.per_page);
      console.log('Last Page   :', data.last_page);
      console.log('Total Count :', data.total);
      console.log('Rows Length :', data.data ? data.data.length : 'undefined');
      
      if (data.data) {
        console.log('\nFirst 3 items:');
        data.data.slice(0, 3).forEach((item, idx) => {
          console.log(`${idx + 1}. ID: ${item.id} | Name: ${item.product_name} | Code: ${item.product_code} | Supplier: ${item.supplier?.supplier_name || '-'}`);
        });
      } else {
        console.log('Error/No data:', data);
      }
    }
  };

  try {
    await productController.getProducts(req, res);
  } catch (e) {
    console.error('Controller call failed:', e);
  }
}

run();
