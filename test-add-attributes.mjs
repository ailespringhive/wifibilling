const PROJECT_ID='69c4840a0022d6824d83';
const API_KEY='standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';
const ENDPOINT='https://appwrite.springhive.co/v1';

async function updateSchema() {
  const url1 = `${ENDPOINT}/databases/wifi_billing_db/collections/users_profile/attributes/string`;
  const url2 = `${ENDPOINT}/databases/wifi_billing_db/collections/users_profile/attributes/float`;

  try {
    const res1 = await fetch(url1, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY },
        body: JSON.stringify({ key: 'planName', size: 255, required: false })
    });
    console.log("planName string:", await res1.json());
    
    const res2 = await fetch(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY },
        body: JSON.stringify({ key: 'planRate', required: false })
    });
    console.log("planRate float:", await res2.json());
  } catch (e) {
    console.error(e);
  }
}
updateSchema();
