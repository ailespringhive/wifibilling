import fs from 'fs';

function parseEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
  return env;
}

const env = parseEnv('./backend/.env');
const PROJECT_ID = env.APPWRITE_PROJECT_ID || env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = env.APPWRITE_API_KEY || env.VITE_APPWRITE_API_KEY;
const ENDPOINT = env.APPWRITE_ENDPOINT || env.VITE_APPWRITE_ENDPOINT;
const DATABASE_ID = env.APPWRITE_DATABASE_ID || env.VITE_APPWRITE_DATABASE_ID;

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
  if (response.status === 204) return null;
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
  await api('DELETE', `/databases/${DATABASE_ID}/collections/notifications`);
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
    await api('POST', `/databases/${DATABASE_ID}/collections/notifications/attributes/string`, { key: 'type', size: 50, required: false, default: 'info' });
    await api('POST', `/databases/${DATABASE_ID}/collections/notifications/attributes/boolean`, { key: 'isRead', required: false, default: false });
  }

  console.log('✅ Schema update completed!');
}

updateSchema();
