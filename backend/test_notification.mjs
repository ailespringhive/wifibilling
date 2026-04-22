import 'dotenv/config';

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const apiKey = process.env.VITE_APPWRITE_API_KEY;
const dbId = process.env.VITE_APPWRITE_DATABASE_ID;

async function main() {
  // 1. List existing notifications
  try {
    const listUrl = `${endpoint}/databases/${dbId}/collections/notifications/documents`;
    const res = await fetch(listUrl, {
      headers: { 'X-Appwrite-Project': projectId, 'X-Appwrite-Key': apiKey }
    });
    const data = await res.json();
    console.log('Total notifications:', data.total);
    if (data.documents) {
      data.documents.forEach(d => console.log(' -', d.$id, d.type, d.title));
    }
  } catch (e) {
    console.error('List error:', e.message);
  }

  // 2. Try creating a test notification
  try {
    const createUrl = `${endpoint}/databases/${dbId}/collections/notifications/documents`;
    const res = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId,
        'X-Appwrite-Key': apiKey,
      },
      body: JSON.stringify({
        documentId: 'unique()',
        data: {
          technicianId: 'admin',
          title: 'Repair Resolved',
          message: 'Test Technician updated repair for Test Customer to "Resolved"',
          type: 'status_update',
          isRead: false,
        },
        permissions: ['read("any")', 'update("any")', 'delete("any")'],
      })
    });
    const result = await res.json();
    if (res.ok) {
      console.log('✅ Created notification:', result.$id);
    } else {
      console.log('❌ Create failed:', res.status, JSON.stringify(result));
    }
  } catch (e) {
    console.error('Create error:', e.message);
  }
}

main();
