const endpoint = 'https://appwrite.springhive.co/v1';
const projectId = '69c4840a0022d6824d83';
const databaseId = 'wifi_billing_db';
const key = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';

async function req(path, method, body) {
  const r = await fetch(endpoint + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': projectId,
      'X-Appwrite-Key': key
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  console.log(r.status, text.substring(0, 100));
}

async function run() {
  console.log('Creating users_profile indexes...');
  await req(`/databases/${databaseId}/collections/users_profile/indexes`, 'POST', {
    key: 'idx_userId', type: 'key', attributes: ['userId']
  });

  console.log('Creating billings indexes...');
  await req(`/databases/${databaseId}/collections/billings/indexes`, 'POST', {
    key: 'idx_customerId', type: 'key', attributes: ['customerId']
  });
  await req(`/databases/${databaseId}/collections/billings/indexes`, 'POST', {
    key: 'idx_paymentStatus', type: 'key', attributes: ['paymentStatus']
  });
  await req(`/databases/${databaseId}/collections/billings/indexes`, 'POST', {
    key: 'idx_billingMonth', type: 'key', attributes: ['billingMonth']
  });
  await req(`/databases/${databaseId}/collections/billings/indexes`, 'POST', {
    key: 'idx_createdAt', type: 'key', attributes: ['$createdAt']
  });
  await req(`/databases/${databaseId}/collections/billings/indexes`, 'POST', {
    key: 'idx_paidDate', type: 'key', attributes: ['paidDate']
  });

  console.log('Creating subscriptions indexes...');
  await req(`/databases/${databaseId}/collections/subscriptions/indexes`, 'POST', {
    key: 'idx_collectorId', type: 'key', attributes: ['collectorId']
  });
  await req(`/databases/${databaseId}/collections/subscriptions/indexes`, 'POST', {
    key: 'idx_status', type: 'key', attributes: ['status']
  });
  
  console.log('Creating notifications indexes...');
  await req(`/databases/${databaseId}/collections/notifications/indexes`, 'POST', {
    key: 'idx_type', type: 'key', attributes: ['type']
  });
  await req(`/databases/${databaseId}/collections/notifications/indexes`, 'POST', {
    key: 'idx_createdAt', type: 'key', attributes: ['$createdAt']
  });
}
run();
