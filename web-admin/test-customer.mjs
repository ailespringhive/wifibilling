import { databases } from './src/config/appwrite.js';

async function checkSchema() {
  const dbId = 'wifi_billing_db';
  const collectionId = 'users_profile';
  try {
    const res = await databases.listDocuments(dbId, collectionId);
    console.log("Customer docs:", res.documents[0]);
  } catch(e) {
    console.error(e);
  }
}
checkSchema();
