import { databases, DATABASE_ID, COLLECTIONS, ID, Query, Permission, Role, apiBypass } from '../config/appwrite.js';

export const CustomerService = {
  /**
   * Get all customers
   */
  async getAll(limit = 50, offset = 0, search = '') {
    const buildQueries = (withOrder = true) => {
      const q = [Query.equal('role', 'customer'), Query.limit(limit), Query.offset(offset)];
      if (withOrder) q.push(Query.orderDesc('$createdAt'));
      if (search) q.push(Query.search('firstName', search));
      return q;
    };
    const buildQueryStrings = (withOrder = true) => {
      const q = [`equal("role", ["customer"])`, `limit(${limit})`, `offset(${offset})`];
      if (withOrder) q.push(`orderDesc("$createdAt")`);
      if (search) q.push(`search("firstName", "${search}")`);
      return q;
    };

    // Attempt 1: Client SDK with ordering
    try {
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS_PROFILE, buildQueries(true));
    } catch (e1) {
      console.warn('Customer getAll (SDK+order) failed:', e1.message);
    }

    // Attempt 2: Client SDK without ordering (missing index fallback)
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.USERS_PROFILE, buildQueries(false));
      response.documents.sort((a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || ''));
      return response;
    } catch (e2) {
      console.warn('Customer getAll (SDK) failed:', e2.message);
    }

    // Attempt 3: API bypass with ordering
    try {
      return await apiBypass.listDocuments(COLLECTIONS.USERS_PROFILE, buildQueryStrings(true));
    } catch (e3) {
      console.warn('Customer getAll (bypass+order) failed:', e3.message);
    }

    // Attempt 4: API bypass without ordering
    try {
      const response = await apiBypass.listDocuments(COLLECTIONS.USERS_PROFILE, buildQueryStrings(false));
      if (response.documents) response.documents.sort((a, b) => (b.$createdAt || '').localeCompare(a.$createdAt || ''));
      return response;
    } catch (e4) {
      console.warn('Customer getAll (bypass) failed:', e4.message);
      throw e4;
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
