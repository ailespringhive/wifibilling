import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../config/appwrite.js';

export const CustomerService = {
  /**
   * Get all customers
   */
  async getAll(limit = 50, offset = 0, search = '') {
    try {
      const queries = [
        Query.equal('role', 'customer'),
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc('$createdAt'),
      ];
      if (search) {
        queries.push(Query.search('firstName', search));
      }
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        queries
      );
      return response;
    } catch (error) {
      throw error;
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
      throw error;
    }
  },

  /**
   * Add a new customer profile
   */
  async create(data) {
    try {
      // Only send fields known to the Appwrite users_profile schema
      const knownFields = [
        'userId', 'firstName', 'middleName', 'lastName', 'phone', 'email',
        'planId', 'wifiPort', 'wifiType', 'nutbox', 'profileImage',
        'address', 'barangay', 'city', 'province',
        'latitude', 'longitude', 'role'
      ];
      const cleanData = { role: 'customer' };
      for (const key of knownFields) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          cleanData[key] = data[key];
        }
      }
      // Always include these even if empty
      cleanData.userId = data.userId || '';
      cleanData.firstName = data.firstName || '';
      cleanData.lastName = data.lastName || '';

      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        ID.unique(),
        cleanData
      );
    } catch (error) {
      // If a field is unknown to Appwrite (e.g. nutbox not yet created), retry without it
      if (error.message && error.message.includes('Unknown attribute')) {
        const unknownField = error.message.match(/"(\w+)"/)?.[1];
        if (unknownField && data[unknownField] !== undefined) {
          console.warn(`Removing unknown field "${unknownField}" and retrying...`);
          delete data[unknownField];
          return await this.create(data);
        }
      }
      throw error;
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
        'planId', 'wifiPort', 'wifiType', 'nutbox', 'profileImage',
        'address', 'barangay', 'city', 'province',
        'latitude', 'longitude'
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
      throw error;
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
      throw error;
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
