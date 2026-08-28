const https = require('https');

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      console.log(`URL: ${url}`);
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers:`, res.headers['content-type'], res.headers['location']);
      res.resume();
      resolve(res.statusCode);
    }).on('error', (e) => {
      console.error(`Error on ${url}:`, e.message);
      resolve(0);
    });
  });
}

async function run() {
  const id = '18_xF229fXR0zn3dxFStSOKSpf-RHUUhJ';
  await testUrl(`https://drive.google.com/uc?export=view&id=${id}`);
  await testUrl(`https://lh3.googleusercontent.com/d/${id}`);
  await testUrl(`https://drive.google.com/thumbnail?id=${id}&sz=w1000`);
}
run();
