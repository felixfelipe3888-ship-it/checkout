const http = require('https');

const data = JSON.stringify({ n: "TESTE_PERSISTENCIA" });

const options = {
  hostname: 'checkout-production-1349.up.railway.app',
  port: 443,
  path: '/api/save-config',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => {
    console.log('SAVE STATUS:', res.statusCode);
    console.log('SAVE RESPONSE:', chunks);
    
    // Now verify load
    http.get('https://checkout-production-1349.up.railway.app/api/load-config?t=' + Date.now(), resLoad => {
      let loadChunks = '';
      resLoad.on('data', d => loadChunks += d);
      resLoad.on('end', () => console.log('LOAD RESPONSE:', loadChunks));
    });
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
