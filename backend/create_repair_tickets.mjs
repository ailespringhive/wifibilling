/**
 * Create repair_tickets collection in Appwrite
 * Run: node --experimental-modules backend/create_repair_tickets.mjs
 */
import { Client, Databases, ID } from 'node-appwrite';
import 'dotenv/config';

const client = new Client()
  .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.VITE_APPWRITE_API_KEY);

const databases = new Databases(client);
const DB = process.env.VITE_APPWRITE_DATABASE_ID;
const COLLECTION_ID = 'repair_tickets';

async function main() {
  console.log('🔧 Creating repair_tickets collection...');

  try {
    // 1. Create collection
    await databases.createCollection(DB, COLLECTION_ID, 'Repair Tickets', [
      // Open permissions for dev — technicians can read/update their own tickets
      'read("any")',
      'create("any")',
      'update("any")',
      'delete("any")',
    ]);
    console.log('✅ Collection created');
  } catch (e) {
    if (e.code === 409) {
      console.log('⚠️  Collection already exists, continuing with attributes...');
    } else {
      throw e;
    }
  }

  // 2. Create attributes
  const attrs = [
    { key: 'customerId', type: 'string', size: 255, required: false },
    { key: 'customerName', type: 'string', size: 500, required: false },
    { key: 'customerAddress', type: 'string', size: 1000, required: false },
    { key: 'technicianId', type: 'string', size: 255, required: false },
    { key: 'status', type: 'string', size: 50, required: false },
    { key: 'priority', type: 'string', size: 20, required: false },
    { key: 'issue', type: 'string', size: 2000, required: false },
    { key: 'notes', type: 'string', size: 5000, required: false },
    { key: 'latitude', type: 'float', required: false },
    { key: 'longitude', type: 'float', required: false },
  ];

  for (const attr of attrs) {
    try {
      if (attr.type === 'float') {
        await databases.createFloatAttribute(DB, COLLECTION_ID, attr.key, attr.required, undefined, undefined, undefined);
      } else {
        await databases.createStringAttribute(DB, COLLECTION_ID, attr.key, attr.size, attr.required);
      }
      console.log(`  ✅ Attribute: ${attr.key}`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`  ⚠️  Attribute ${attr.key} already exists`);
      } else {
        console.log(`  ❌ Failed ${attr.key}: ${e.message}`);
      }
    }
  }

  // 3. Wait for attributes to be ready
  console.log('⏳ Waiting for attributes to sync...');
  await new Promise(r => setTimeout(r, 3000));

  // 4. Create indexes
  const indexes = [
    { key: 'idx_technician', attrs: ['technicianId'] },
    { key: 'idx_status', attrs: ['status'] },
    { key: 'idx_priority', attrs: ['priority'] },
  ];

  for (const idx of indexes) {
    try {
      await databases.createIndex(DB, COLLECTION_ID, idx.key, 'key', idx.attrs);
      console.log(`  ✅ Index: ${idx.key}`);
    } catch (e) {
      if (e.code === 409) {
        console.log(`  ⚠️  Index ${idx.key} already exists`);
      } else {
        console.log(`  ❌ Failed index ${idx.key}: ${e.message}`);
      }
    }
  }

  console.log('\n🎉 repair_tickets collection is ready!');
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
