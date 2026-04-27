import { databases, DATABASE_ID, COLLECTIONS, ID, Query, Permission, Role, apiBypass } from '../config/appwrite.js';

export const CustomerService = {
  /**
   * Get all customers
   */
  async getAll(limit = 50, offset = 0, search = '') {
    // Attempt 1: Client SDK (most reliable when permissions allow)
    try {
      const queries = [Query.equal('role', 'customer'), Query.limit(limit), Query.offset(offset)];
      if (search) queries.push(Query.search('firstName', search));
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS_PROFILE, queries);
    } catch (e1) {
      console.warn('Customer getAll (SDK) failed:', e1.message);
    }

    // Attempt 2: API bypass (handles query format conversion + raw fallback internally)
    try {
      const queryStrings = [`equal("role", ["customer"])`, `limit(${limit})`, `offset(${offset})`];
      if (search) queryStrings.push(`search("firstName", "${search}")`);
      const response = await apiBypass.listDocuments(COLLECTIONS.USERS_PROFILE, queryStrings);
      // If raw fallback was used, it returns ALL docs — filter client-side
      if (response.documents) {
        let docs = response.documents.filter(d => d.role === 'customer');
        if (search) {
          const q = search.toLowerCase();
          docs = docs.filter(d => `${d.firstName} ${d.lastName}`.toLowerCase().includes(q));
        }
        docs.sort((a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || ''));
        return { documents: docs.slice(offset, offset + limit), total: docs.length };
      }
      return response;
    } catch (e2) {
      console.warn('Customer getAll (bypass) failed:', e2.message);
      throw e2;
    }
  },

  /**
   * Get single customer by document ID
   */
  async getById(documentId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        documentId
      );
    } catch (error) {
      console.warn('Client SDK getDocument failed, using API bypass:', error.message);
      return await apiBypass.getDocument(COLLECTIONS.USERS_PROFILE, documentId);
    }
  },

  /**
   * Add a new customer profile
   */
  async create(data) {
    // Only send fields known to the Appwrite users_profile schema
    const knownFields = [
      'userId', 'firstName', 'middleName', 'lastName', 'phone', 'email',
      'planId', 'wifiPort', 'wifiType', 'napbox', 'profileImage',
      'address', 'barangay', 'city', 'province',
      'latitude', 'longitude', 'role', 'status', 'facebookUrl',
      'pppoeUser', 'pppoePassword', 'wifiName', 'wifiPassword', 'billingStartDate'
    ];
    let cleanData = { role: 'customer' };
    for (const key of knownFields) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        cleanData[key] = data[key];
      }
    }
    // Always include these even if empty
    cleanData.userId = data.userId || '';
    cleanData.firstName = data.firstName || '';
    cleanData.lastName = data.lastName || '';
    
    try {
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        ID.unique(),
        cleanData
      );
    } catch (error) {
      if (error.message && error.message.includes('Unknown attribute')) {
        const unknownField = error.message.match(/"(\w+)"/)?.[1];
        if (unknownField && data[unknownField] !== undefined) {
          console.warn(`Removing unknown field "${unknownField}" and retrying...`);
          delete data[unknownField];
          return await this.create(data);
        }
      }
      
      console.warn('Error via Client SDK, attempting API bypass...', error.message);
      const { apiBypass } = await import('../config/appwrite.js');
      return await apiBypass.createDocument(COLLECTIONS.USERS_PROFILE, ID.unique(), cleanData);
    }
  },

  /**
   * Update customer profile
   */
  async update(documentId, data) {
    try {
      // Only send fields known to the Appwrite users_profile schema
      const knownFields = [
        'firstName', 'middleName', 'lastName', 'phone', 'email',
        'planId', 'wifiPort', 'wifiType', 'napbox', 'profileImage',
        'address', 'barangay', 'city', 'province',
        'latitude', 'longitude', 'status', 'facebookUrl',
        'pppoeUser', 'pppoePassword', 'wifiName', 'wifiPassword', 'billingStartDate'
      ];
      const cleanData = {};
      for (const key of knownFields) {
        if (data[key] !== undefined) {
          cleanData[key] = data[key];
        }
      }
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        documentId,
        cleanData
      );
    } catch (error) {
      // If a field is unknown, retry without it
      if (error.message && error.message.includes('Unknown attribute')) {
        const unknownField = error.message.match(/"(\w+)"/)?.[1];
        if (unknownField && cleanData && cleanData[unknownField] !== undefined) {
          console.warn(`Removing unknown field "${unknownField}" and retrying...`);
          delete data[unknownField];
          return await this.update(documentId, data);
        }
      }
      console.warn('Client SDK customer update failed, using API bypass:', error.message);
      return await apiBypass.updateDocument(COLLECTIONS.USERS_PROFILE, documentId, cleanData);
    }
  },

  /**
   * Delete customer
   */
  async delete(documentId) {
    try {
      return await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        documentId
      );
    } catch (error) {
      // Fallback to API bypass for permission issues
      console.warn('Client SDK customer delete failed, using API bypass:', error.message);
      return await apiBypass.deleteDocument(COLLECTIONS.USERS_PROFILE, documentId);
    }
  },

  /**
   * Get customer count
   */
  async getCount() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        [Query.equal('role', 'customer'), Query.limit(1)]
      );
      return response.total;
    } catch (error) {
      return 0;
    }
  }
};
