const http = require('http');

http.get('http://127.0.0.1:5656/api/products?limit=10&page=1', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', e => console.error(e));
