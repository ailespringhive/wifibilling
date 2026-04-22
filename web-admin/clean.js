import { apiBypass, COLLECTIONS, Query } from './src/config/appwrite.js';

async function run() {
  try {
    const res = await apiBypass.listDocuments(COLLECTIONS.REPAIR_TICKETS, [Query.equal('customerName', 'test')]);
    console.log('Found test tickets:', res.documents.length);
    for(const doc of res.documents) {
       await apiBypass.deleteDocument(COLLECTIONS.REPAIR_TICKETS, doc.$id);
       console.log('Deleted', doc.$id);
    }
    console.log('Done!');
  } catch(e) {
    console.log(e);
  }
}
run();
