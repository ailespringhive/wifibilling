import { Client, Databases, Query } from 'appwrite';

const client = new Client();
client
    .setEndpoint('https://appwrite.springhive.co/v1')
    .setProject('69c4840a0022d6824d83');

const databases = new Databases(client);

async function test() {
  try {
    const res = await databases.listDocuments(
      'wifi_billing_db',
      'users_profile',
      [Query.equal('role', 'technician'), Query.limit(100)]
    );
    console.log(`Found ${res.total} technicians`);
    for (const tech of res.documents) {
      console.log(tech.$id, tech.userId);
    }
  } catch (e) {
    console.error('Error fetching technicians:', e);
  }
}
test();
