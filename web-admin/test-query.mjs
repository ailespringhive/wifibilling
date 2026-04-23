
const ENDPOINT    = 'https://appwrite.springhive.co/v1';
const PROJECT_ID  = '69c4840a0022d6824d83';
const API_KEY     = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';
const DATABASE_ID = 'wifi_billing_db';
const COLLECTION  = 'repair_tickets';

async function test() {
  const currentFilter = "in_progress";
  // Test syntax 1
  const queries1 = [
    JSON.stringify({ method: 'equal', values: ['status', currentFilter] })
  ];
  let params1 = new URLSearchParams();
  queries1.forEach(q => params1.append('queries[]', q));
  
  let res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION}/documents?${params1}`,
    { headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY } });
  let data = await res.json();
  console.log("Syntax 1 JSON string value length:", data.documents?.length, data.message || "");

  // Test syntax 2
  const queries2 = [
    JSON.stringify({ method: 'equal', values: ['status', [currentFilter]] })
  ];
  let params2 = new URLSearchParams();
  queries2.forEach(q => params2.append('queries[]', q));
  res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION}/documents?${params2}`,
    { headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY } });
  data = await res.json();
  console.log("Syntax 2 JSON array value length:", data.documents?.length, data.message || "");

  // Test syntax 3 (SDK string)
  const queries3 = [ `equal("status", ["in_progress"])` ];
  let params3 = new URLSearchParams();
  queries3.forEach(q => params3.append('queries[]', q));
  res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${COLLECTION}/documents?${params3}`,
    { headers: { 'X-Appwrite-Project': PROJECT_ID, 'X-Appwrite-Key': API_KEY } });
  data = await res.json();
  console.log("Syntax 3 Pure String length:", data.documents?.length, data.message || "");
}
test();
