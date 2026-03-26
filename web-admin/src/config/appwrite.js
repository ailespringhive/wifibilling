import { Client, Account, Databases, ID, Query } from 'appwrite';

// ============================================================
// APPWRITE CONFIGURATION
// Replace these with your actual Appwrite project credentials
// ============================================================
const APPWRITE_ENDPOINT = 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '69c4840a0022d6824d83';
const APPWRITE_DATABASE_ID = 'wifi_billing_db';

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
export { ID, Query };
export default client;
