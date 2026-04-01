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

const DEMO_BILLINGS = ['bill_001','bill_002','bill_003','bill_004','bill_005','bill_006','bill_007','bill_008'];
const DEMO_CUSTOMERS = ['cust_001','cust_002','cust_003','cust_004','cust_005','cust_006','cust_007','cust_008'];
const DEMO_SUBS = ['sub_001','sub_002','sub_003','sub_004','sub_005'];
const DEMO_COLLECTORS = ['coll_001','coll_002'];

async function deleteDocs(collectionId, ids) {
  for (const id of ids) {
    try {
      const res = await fetch(`${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok || res.status === 404) {
        console.log(`[${collectionId}] Deleted ${id}`);
      } else {
        const text = await res.text();
        console.log(`[${collectionId}] Failed ${id}: ${res.status} ${text}`);
      }
    } catch (e) {
      console.log(`[${collectionId}] Error deleting ${id}: ${e.message}`);
    }
  }
}

async function run() {
  console.log('Cleaning up demo data from Appwrite...\n');
  await deleteDocs('billings', DEMO_BILLINGS);
  await deleteDocs('subscriptions', DEMO_SUBS);
  await deleteDocs('users_profile', DEMO_CUSTOMERS);
  await deleteDocs('users_profile', DEMO_COLLECTORS);
  console.log('\nAll demo data removed successfully!');
}

run().catch(console.error);
