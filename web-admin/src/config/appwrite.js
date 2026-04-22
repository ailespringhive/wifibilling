import { Client, Account, Databases, ID, Query, Permission, Role } from 'appwrite';

// ============================================================
// APPWRITE CONFIGURATION
// Reads from backend/.env via Vite's envDir
// ============================================================
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://appwrite.springhive.co/v1';
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID || '69c4840a0022d6824d83';
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || 'wifi_billing_db';
const APPWRITE_API_KEY = import.meta.env.VITE_APPWRITE_API_KEY || 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';

// Collection IDs
export const COLLECTIONS = {
  USERS_PROFILE: 'users_profile',
  WIFI_PLANS: 'wifi_plans',
  SUBSCRIPTIONS: 'subscriptions',
  BILLINGS: 'billings',
  PAYMENT_EXTENSIONS: 'payment_extensions',
  REPAIR_TICKETS: 'repair_tickets',
};

// Initialize Appwrite Client
const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID);

// Services
export const account = new Account(client);
export const databases = new Databases(client);
export const DATABASE_ID = APPWRITE_DATABASE_ID;
export const ENDPOINT = APPWRITE_ENDPOINT;
export const PROJECT_ID = APPWRITE_PROJECT_ID;
export const API_KEY = APPWRITE_API_KEY;
export { ID, Query, Permission, Role };

export const apiBypass = {
  async listDocuments(collectionId, queries = []) {
    const params = new URLSearchParams();
    queries.forEach(q => {
      params.append('queries[]', typeof q === 'string' ? q : JSON.stringify(q));
    });
    const url = `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents?${params.toString()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('API Bypass List Failed: ' + text);
    }
    return await res.json();
  },
  async getDocument(collectionId, documentId) {
    const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
    });
    if (!res.ok) throw new Error('API Bypass Get Failed');
    return await res.json();
  },
  async createDocument(collectionId, documentId, data, perms = null) {
    const permissions = perms || [
      'read("any")',
      'update("any")',
      'delete("any")'
    ];
    const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
      body: JSON.stringify({ documentId, data, permissions })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error('API Bypass Create Failed: ' + text);
    }
    return await res.json();
  },
  async updateDocument(collectionId, documentId, data) {
    const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      },
      body: JSON.stringify({ data })
    });
    if (!res.ok) throw new Error('API Bypass Update Failed');
    return await res.json();
  },
  async deleteDocument(collectionId, documentId) {
    const res = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
      }
    });
    if (!res.ok) throw new Error('API Bypass Delete Failed');
    return;
  }
};

export default client;
