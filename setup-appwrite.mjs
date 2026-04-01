/**
 * Appwrite Setup Script
 * Creates database, collections, attributes, indexes, and admin user
 * Reads credentials from backend/.env
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load env vars from backend/.env
const __dirname = dirname(fileURLToPath(import.meta.url));
const envFile = readFileSync(resolve(__dirname, 'backend', '.env'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  env[key.trim()] = rest.join('=').trim();
});

const ENDPOINT = env.VITE_APPWRITE_ENDPOINT;
const PROJECT_ID = env.VITE_APPWRITE_PROJECT_ID;
const API_KEY = env.VITE_APPWRITE_API_KEY;
const DATABASE_ID = env.VITE_APPWRITE_DATABASE_ID;

const headers = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': PROJECT_ID,
  'X-Appwrite-Key': API_KEY,
};

async function api(method, path, body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${ENDPOINT}${path}`, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    // 409 = already exists, that's fine
    if (res.status === 409) {
      console.log(`  ⚠ Already exists (skipped)`);
      return data;
    }
    console.error(`  ✗ Error ${res.status}:`, data?.message || text);
    return null;
  }
  return data;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ========== CREATE DATABASE ==========
async function createDatabase() {
  console.log('\n📦 Creating database...');
  const result = await api('POST', '/databases', {
    databaseId: DATABASE_ID,
    name: 'WiFi Billing DB',
  });
  if (result) console.log('  ✓ Database created');
}

// ========== CREATE COLLECTION ==========
async function createCollection(collectionId, name, attributes) {
  console.log(`\n📁 Creating collection: ${name} (${collectionId})`);
  
  const result = await api('POST', `/databases/${DATABASE_ID}/collections`, {
    collectionId,
    name,
    permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
    documentSecurity: false,
  });
  if (!result) return;
  console.log('  ✓ Collection created');

  // Create attributes
  for (const attr of attributes) {
    console.log(`  + attribute: ${attr.key} (${attr.type})`);
    
    let path, body;
    switch (attr.type) {
      case 'string':
        path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`;
        body = { key: attr.key, size: attr.size || 255, required: attr.required || false, default: attr.default || null };
        break;
      case 'integer':
        path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`;
        body = { key: attr.key, required: attr.required || false, min: attr.min || 0, max: attr.max || 2147483647, default: attr.default || null };
        break;
      case 'float':
        path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/float`;
        body = { key: attr.key, required: attr.required || false, min: attr.min || 0, max: attr.max || 999999999, default: attr.default || null };
        break;
      case 'boolean':
        path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/boolean`;
        body = { key: attr.key, required: attr.required || false, default: attr.default || false };
        break;
      case 'datetime':
        path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/datetime`;
        body = { key: attr.key, required: attr.required || false, default: attr.default || null };
        break;
      case 'email':
        path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/email`;
        body = { key: attr.key, required: attr.required || false, default: attr.default || null };
        break;
    }
    
    await api('POST', path, body);
    await sleep(500); // Give Appwrite time to process
  }
}

// ========== CREATE ADMIN USER ==========
async function createAdminUser() {
  console.log('\n👤 Creating admin user...');
  
  // Create user account
  const user = await api('POST', '/users', {
    userId: 'admin001',
    email: 'admin@wifibilling.com',
    password: 'admin1234',
    name: 'Admin',
  });
  
  if (user) {
    console.log('  ✓ User created: admin@wifibilling.com / admin1234');
  }
  
  // Wait for collections to be ready
  await sleep(2000);
  
  // Create admin profile document
  console.log('  + Creating admin profile...');
  const profile = await api('POST', `/databases/${DATABASE_ID}/collections/users_profile/documents`, {
    documentId: 'admin_profile_001',
    data: {
      userId: 'admin001',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@wifibilling.com',
      phone: '',
      role: 'admin',
    },
    permissions: [
      'read("any")',
      'update("user:admin001")',
    ],
  });
  if (profile) console.log('  ✓ Admin profile created');
}

// ========== SEED DEMO DATA ==========
async function seedDemoData() {
  console.log('\n🌱 Seeding demo data...');

  // WiFi Plans
  const plans = [
    { documentId: 'plan_basic', data: { name: 'Basic Plan', monthlyRate: 699, speed: '25 Mbps', description: 'Perfect for browsing and social media', isActive: true } },
    { documentId: 'plan_standard', data: { name: 'Standard Plan', monthlyRate: 999, speed: '50 Mbps', description: 'Great for streaming and gaming', isActive: true } },
    { documentId: 'plan_premium', data: { name: 'Premium Plan', monthlyRate: 1499, speed: '100 Mbps', description: 'Ultra-fast for power users', isActive: true } },
  ];

  for (const plan of plans) {
    console.log(`  + Plan: ${plan.data.name}`);
    await api('POST', `/databases/${DATABASE_ID}/collections/wifi_plans/documents`, {
      ...plan,
      permissions: ['read("any")', 'update("users")', 'delete("users")'],
    });
    await sleep(300);
  }

  // Customer profiles
  const customers = [
    { documentId: 'cust_001', data: { userId: 'cust_001', firstName: 'Juan', lastName: 'Dela Cruz', email: 'juan@email.com', phone: '09171234567', role: 'customer' } },
    { documentId: 'cust_002', data: { userId: 'cust_002', firstName: 'Maria', lastName: 'Santos', email: 'maria@email.com', phone: '09181234567', role: 'customer' } },
    { documentId: 'cust_003', data: { userId: 'cust_003', firstName: 'Pedro', lastName: 'Reyes', email: 'pedro@email.com', phone: '09191234567', role: 'customer' } },
    { documentId: 'cust_004', data: { userId: 'cust_004', firstName: 'Ana', lastName: 'Garcia', email: 'ana@email.com', phone: '09201234567', role: 'customer' } },
    { documentId: 'cust_005', data: { userId: 'cust_005', firstName: 'Jose', lastName: 'Rivera', email: 'jose@email.com', phone: '09211234567', role: 'customer' } },
    { documentId: 'cust_006', data: { userId: 'cust_006', firstName: 'Rosa', lastName: 'Mabini', email: 'rosa@email.com', phone: '09221234567', role: 'customer' } },
    { documentId: 'cust_007', data: { userId: 'cust_007', firstName: 'Carlo', lastName: 'Mendoza', email: 'carlo@email.com', phone: '09231234567', role: 'customer' } },
    { documentId: 'cust_008', data: { userId: 'cust_008', firstName: 'Elena', lastName: 'Cruz', email: 'elena@email.com', phone: '09241234567', role: 'customer' } },
  ];

  for (const c of customers) {
    console.log(`  + Customer: ${c.data.firstName} ${c.data.lastName}`);
    await api('POST', `/databases/${DATABASE_ID}/collections/users_profile/documents`, {
      ...c,
      permissions: ['read("any")', 'update("users")', 'delete("users")'],
    });
    await sleep(300);
  }

  // Collector profiles
  const collectors = [
    { documentId: 'coll_001', data: { userId: 'coll_001', firstName: 'Mark', lastName: 'Collector', email: 'collector@wifibilling.com', phone: '09301234567', role: 'collector' } },
    { documentId: 'coll_002', data: { userId: 'coll_002', firstName: 'Jay', lastName: 'Reyes', email: 'jay@wifibilling.com', phone: '09311234567', role: 'collector' } },
  ];

  for (const c of collectors) {
    console.log(`  + Collector: ${c.data.firstName} ${c.data.lastName}`);
    await api('POST', `/databases/${DATABASE_ID}/collections/users_profile/documents`, {
      ...c,
      permissions: ['read("any")', 'update("users")', 'delete("users")'],
    });
    await sleep(300);
  }

  // Subscriptions
  const subs = [
    { documentId: 'sub_001', data: { customerId: 'cust_001', planId: 'plan_standard', collectorId: 'coll_001', status: 'active', startDate: '2025-01-15T00:00:00.000Z' } },
    { documentId: 'sub_002', data: { customerId: 'cust_002', planId: 'plan_premium', collectorId: 'coll_001', status: 'active', startDate: '2025-02-01T00:00:00.000Z' } },
    { documentId: 'sub_003', data: { customerId: 'cust_003', planId: 'plan_basic', collectorId: 'coll_002', status: 'active', startDate: '2025-03-10T00:00:00.000Z' } },
    { documentId: 'sub_004', data: { customerId: 'cust_004', planId: 'plan_standard', collectorId: 'coll_001', status: 'active', startDate: '2025-04-01T00:00:00.000Z' } },
    { documentId: 'sub_005', data: { customerId: 'cust_005', planId: 'plan_premium', collectorId: 'coll_002', status: 'active', startDate: '2025-05-15T00:00:00.000Z' } },
  ];

  for (const s of subs) {
    console.log(`  + Subscription: ${s.data.customerId} → ${s.data.planId}`);
    await api('POST', `/databases/${DATABASE_ID}/collections/subscriptions/documents`, {
      ...s,
      permissions: ['read("any")', 'update("users")', 'delete("users")'],
    });
    await sleep(300);
  }

  // Billings
  const billings = [
    { documentId: 'bill_001', data: { customerId: 'cust_001', customerName: 'Juan Dela Cruz', subscriptionId: 'sub_001', billingMonth: '2026-03', amount: 999, paymentStatus: 'not_yet_paid', dueDate: '2026-03-15T00:00:00.000Z', paidDate: '', collectedBy: '', notes: '' } },
    { documentId: 'bill_002', data: { customerId: 'cust_002', customerName: 'Maria Santos', subscriptionId: 'sub_002', billingMonth: '2026-03', amount: 1499, paymentStatus: 'already_paid', dueDate: '2026-03-15T00:00:00.000Z', paidDate: '2026-03-10T00:00:00.000Z', collectedBy: 'coll_001', notes: '' } },
    { documentId: 'bill_003', data: { customerId: 'cust_003', customerName: 'Pedro Reyes', subscriptionId: 'sub_003', billingMonth: '2026-03', amount: 699, paymentStatus: 'not_yet_paid', dueDate: '2026-03-15T00:00:00.000Z', paidDate: '', collectedBy: '', notes: 'Pending collection' } },
    { documentId: 'bill_004', data: { customerId: 'cust_004', customerName: 'Ana Garcia', subscriptionId: 'sub_004', billingMonth: '2026-03', amount: 999, paymentStatus: 'payment_confirmation', dueDate: '2026-03-30T00:00:00.000Z', paidDate: '', collectedBy: '', notes: 'Waiting for confirmation' } },
    { documentId: 'bill_005', data: { customerId: 'cust_005', customerName: 'Jose Rivera', subscriptionId: 'sub_005', billingMonth: '2026-03', amount: 1499, paymentStatus: 'already_paid', dueDate: '2026-03-15T00:00:00.000Z', paidDate: '2026-03-14T00:00:00.000Z', collectedBy: 'coll_002', notes: '' } },
    { documentId: 'bill_006', data: { customerId: 'cust_006', customerName: 'Rosa Mabini', subscriptionId: '', billingMonth: '2026-03', amount: 699, paymentStatus: 'not_yet_paid', dueDate: '2026-03-15T00:00:00.000Z', paidDate: '', collectedBy: '', notes: '' } },
    { documentId: 'bill_007', data: { customerId: 'cust_007', customerName: 'Carlo Mendoza', subscriptionId: '', billingMonth: '2026-02', amount: 999, paymentStatus: 'payment_confirmation', dueDate: '2026-02-15T00:00:00.000Z', paidDate: '', collectedBy: '', notes: 'Sent proof of payment' } },
    { documentId: 'bill_008', data: { customerId: 'cust_008', customerName: 'Elena Cruz', subscriptionId: '', billingMonth: '2026-03', amount: 999, paymentStatus: 'not_yet_paid', dueDate: '2026-03-10T00:00:00.000Z', paidDate: '', collectedBy: '', notes: '' } },
  ];

  for (const b of billings) {
    console.log(`  + Billing: ${b.data.customerName} — ₱${b.data.amount}`);
    await api('POST', `/databases/${DATABASE_ID}/collections/billings/documents`, {
      ...b,
      permissions: ['read("any")', 'update("users")', 'delete("users")'],
    });
    await sleep(300);
  }

  console.log('\n✅ Demo data seeded!');
}

// ========== MAIN ==========
async function main() {
  console.log('🚀 WiFi Billing — Appwrite Setup');
  console.log('================================\n');

  // 1. Create database
  await createDatabase();

  // 2. Create collections with attributes
  await createCollection('users_profile', 'Users Profile', [
    { key: 'userId', type: 'string', size: 100, required: true },
    { key: 'firstName', type: 'string', size: 100, required: true },
    { key: 'lastName', type: 'string', size: 100, required: true },
    { key: 'email', type: 'string', size: 255, required: false },
    { key: 'phone', type: 'string', size: 50, required: false },
    { key: 'role', type: 'string', size: 20, required: true },
  ]);

  await createCollection('wifi_plans', 'WiFi Plans', [
    { key: 'name', type: 'string', size: 100, required: true },
    { key: 'monthlyRate', type: 'float', required: true },
    { key: 'speed', type: 'string', size: 50, required: false },
    { key: 'description', type: 'string', size: 500, required: false },
    { key: 'isActive', type: 'boolean', required: false, default: true },
  ]);

  await createCollection('subscriptions', 'Subscriptions', [
    { key: 'customerId', type: 'string', size: 100, required: true },
    { key: 'planId', type: 'string', size: 100, required: true },
    { key: 'collectorId', type: 'string', size: 100, required: false },
    { key: 'status', type: 'string', size: 20, required: true },
    { key: 'startDate', type: 'string', size: 50, required: false },
  ]);

  await createCollection('billings', 'Billings', [
    { key: 'customerId', type: 'string', size: 100, required: true },
    { key: 'customerName', type: 'string', size: 200, required: false },
    { key: 'subscriptionId', type: 'string', size: 100, required: false },
    { key: 'billingMonth', type: 'string', size: 10, required: true },
    { key: 'amount', type: 'float', required: true },
    { key: 'paymentStatus', type: 'string', size: 30, required: true },
    { key: 'dueDate', type: 'string', size: 50, required: false },
    { key: 'paidDate', type: 'string', size: 50, required: false },
    { key: 'collectedBy', type: 'string', size: 100, required: false },
    { key: 'notes', type: 'string', size: 1000, required: false },
  ]);

  await createCollection('payment_extensions', 'Payment Extensions', [
    { key: 'billingId', type: 'string', size: 100, required: true },
    { key: 'newDueDate', type: 'string', size: 50, required: true },
    { key: 'reason', type: 'string', size: 500, required: false },
  ]);

  // Wait for all attributes to be processed
  console.log('\n⏳ Waiting for attributes to finalize (15s)...');
  await sleep(15000);

  // 3. Create admin user
  await createAdminUser();

  // 4. Seed demo data
  await seedDemoData();

  console.log('\n🎉 Setup complete!');
  console.log('================================');
  console.log('Login credentials:');
  console.log('  Email:    admin@wifibilling.com');
  console.log('  Password: admin1234');
  console.log('================================\n');
}

main().catch(console.error);
