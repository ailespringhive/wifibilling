const fetch = require('node-fetch'); // If error, use dynamic import or write .mjs

async function run() {
const dbId='wifi_billing_db'; 
const col='repair_tickets'; 
const proj='69c4840a0022d6824d83'; 
const key='standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c'; 

try {
  let res = await fetch(`https://appwrite.springhive.co/v1/databases/${dbId}/collections/${col}/attributes/string`, { 
    method: 'POST', 
    headers: {'Content-Type': 'application/json', 'X-Appwrite-Project': proj, 'X-Appwrite-Key': key}, 
    body: JSON.stringify({ 
      key: 'imageUrls',
      size: 1000,
      required: false,
      array: true
    }) 
  });
  console.log(await res.json());
} catch (e) {
  console.error(e);
}
}
run();
