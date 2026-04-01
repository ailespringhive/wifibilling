import { Client, Account, Databases, ID, Query, Permission, Role } from 'appwrite';

// ============================================================
// APPWRITE CONFIGURATION
// Reads from backend/.env via Vite's envDir
// ============================================================
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const APPWRITE_PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;

// Collection IDs
export const COLLECTIONS = {
  USERS_PROFILE: 'users_profile',
  WIFI_PLANS: 'wifi_plans',
  SUBSCRIPTIONS: 'subscriptions',
  BILLINGS: 'billings',
  PAYMENT_EXTENSIONS: 'payment_extensions',
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
export { ID, Query, Permission, Role };
export default client;
