import dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = process.env.VITE_APPWRITE_API_KEY;
const ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT;
const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID;

async function api(method, path, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': PROJECT_ID,
      'X-Appwrite-Key': API_KEY,
    },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${ENDPOINT}${path}`, options);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Status ${response.status} on ${path}: ${errorBody}`);
    return null;
  }
  
  return response.json();
}

async function testQuery() {
  console.log('🔄 Testing listDocuments...');

  // The Flutter app query is basically: equal("technicianId", ["col2"]) & orderDesc("$createdAt") & limit(50)
  const queries = [
    'equal("technicianId", ["col2"])',
    'limit(50)'
  ];

  const queryParams = queries.map(q => `queries[]=${encodeURIComponent(q)}`).join('&');
  const path = `/databases/${DATABASE_ID}/collections/notifications/documents?${queryParams}`;

  const docs = await api('GET', path);
  if (docs) {
    console.log(`✅ Found ${docs.documents.length} docs`);
  }
}

testQuery();
