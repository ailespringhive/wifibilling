
import dotenv from 'dotenv';
dotenv.config();

const PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const API_KEY = process.env.APPWRITE_API_KEY;
const ENDPOINT = process.env.APPWRITE_ENDPOINT;
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

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

async function updateSchema() {
  console.log('🔄 Adding Latitude & Longitude to users_profile...');
  await api('POST', `/databases/${DATABASE_ID}/collections/users_profile/attributes/float`, {
    key: 'latitude',
    required: false,
  });
  await api('POST', `/databases/${DATABASE_ID}/collections/users_profile/attributes/float`, {
    key: 'longitude',
    required: false,
  });

  console.log('🔄 Creating notifications collection...');
  // Create notifications collection
  const notifCol = await api('POST', `/databases/${DATABASE_ID}/collections`, {
    collectionId: 'notifications',
    name: 'Notifications',
    permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")'
    ]
  });
  
  if (notifCol) {
    console.log('🔄 Adding attributes to notifications...');
    await api('POST', `/databases/${DATABASE_ID}/collections/notifications/attributes/string`, { key: 'technicianId', size: 100, required: true });
    await api('POST', `/databases/${DATABASE_ID}/collections/notifications/attributes/string`, { key: 'title', size: 255, required: true });
    await api('POST', `/databases/${DATABASE_ID}/collections/notifications/attributes/string`, { key: 'message', size: 1000, required: true });
    await api('POST', `/databases/${DATABASE_ID}/collections/notifications/attributes/string`, { key: 'type', size: 50, required: true, default: 'info' });
    await api('POST', `/databases/${DATABASE_ID}/collections/notifications/attributes/boolean`, { key: 'isRead', required: false, default: false });
  }

  console.log('✅ Schema update completed!');
}

updateSchema();
