const endpoint = 'https://appwrite.springhive.co/v1';
const projectId = '69c4840a0022d6824d83';
const databaseId = 'wifi_billing_db';
const collectionId = 'repair_tickets';
const key = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';

async function testSubmit() {
    console.log("Testing POST to repair_tickets...");
    const res = await fetch(`${endpoint}/databases/${databaseId}/collections/${collectionId}/documents`, {
        method: 'POST',
        headers: {
            'X-Appwrite-Project': projectId,
            'X-Appwrite-Key': key,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            documentId: 'unique()',
            data: {
              customerId: 'test',
              customerName: 'test name',
              customerAddress: 'test addr',
              technicianId: '',
              technicianName: 'Unassigned',
              collectorId: 'collector-app', 
              collectorName: 'Collector',
              status: 'pending',
              priority: 'medium',
              issue: 'Test Issue',
              notes: 'Reported by Collector',
              imageUrls: []
            }
        })
    });
    const data = await res.json();
    console.log("Result:", JSON.stringify(data, null, 2));
}

testSubmit().catch(console.error);
