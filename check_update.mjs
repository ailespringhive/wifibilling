const endpoint = 'https://appwrite.springhive.co/v1';
const projectId = '69c4840a0022d6824d83';
const databaseId = 'wifi_billing_db';
const key = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';

fetch(endpoint + '/databases/' + databaseId + '/collections/notifications/documents', {
  headers: {
    'X-Appwrite-Project': projectId,
    'X-Appwrite-Key': key
  }
}).then(r => r.json()).then(async d => {
   const docs = d.documents;
   if(docs && docs.length > 0) {
      const doc = docs[0];
      console.log("Updating document: ", doc.$id);
      const res = await fetch(endpoint + '/databases/' + databaseId + '/collections/notifications/documents/' + doc.$id, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': projectId,
          'X-Appwrite-Key': key
        },
        body: JSON.stringify({ data: { isRead: true } })
      });
      const text = await res.text();
      console.log("Response:", res.status, text);
   }
});
