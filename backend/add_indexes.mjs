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
  
  // Appwrite sometimes returns 204 No Content for successful deletes
  if (response.status === 204) return true;
  return response.json();
}

async function addIndexes() {
  console.log('🔄 Adding indexes to notifications...');

  await api('POST', `/databases/${DATABASE_ID}/collections/notifications/indexes`, {
    key: 'idx_technicianId',
    type: 'key',
    attributes: ['technicianId']
  });

  await api('POST', `/databases/${DATABASE_ID}/collections/notifications/indexes`, {
    key: 'idx_isRead',
    type: 'key',
    attributes: ['isRead']
  });
  
  await api('POST', `/databases/${DATABASE_ID}/collections/notifications/indexes`, {
    key: 'idx_tech_read',
    type: 'key',
    attributes: ['technicianId', 'isRead']
  });

  console.log('✅ Index update completed!');
}

addIndexes();
