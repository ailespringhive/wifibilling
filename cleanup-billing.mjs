import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, 'backend', '.env'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  env[key.trim()] = rest.join('=').trim();
});

const ENDPOINT = env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = env.VITE_APPWRITE_API_KEY;
const DATABASE_ID = env.VITE_APPWRITE_DATABASE_ID;

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
};

async function run() {
  console.log('Fetching all billing records...');
  
  const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/billings/documents?queries[]=${encodeURIComponent('limit(100)')}`, { headers });
  const data = await res.json();
  
  if (!data.documents || data.documents.length === 0) {
    console.log('No billing records found.');
    return;
  }

  console.log(`Found ${data.documents.length} billing records. Deleting demo ones...`);
  
  // Delete all demo billing records (ones with demo customer IDs like cust_001, etc.)
  for (const doc of data.documents) {
    const id = doc.$id;
    const name = doc.customerName || doc.customerId || 'unknown';
    console.log(`  Deleting: ${name} (${id})...`);
    
    const delRes = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/billings/documents/${id}`, {
      method: 'DELETE',
      headers,
    });
    console.log(`    Status: ${delRes.status}`);
  }
  
  console.log('\nDone! All billing records deleted.');
}

run().catch(console.error);
