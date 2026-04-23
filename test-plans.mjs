const PROJECT_ID='69c4840a0022d6824d83';
const API_KEY='standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';
const ENDPOINT='https://appwrite.springhive.co/v1';
async function test() {
  const getQ = await fetch(`${ENDPOINT}/databases/wifi_billing_db/collections/users_profile/documents?queries[]={"method":"limit","values":[1]}`, {
      headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY }
  });
  const data = await getQ.json();
  console.log(JSON.stringify(data, null, 2));
}
test();
