import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../config/appwrite.js';

export const CollectorService = {
  /**
   * Get all collectors
   */
  async getAll(limit = 50, offset = 0) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        [
          Query.equal('role', 'collector'),
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc('$createdAt'),
        ]
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create collector profile
   */
  async create(data) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        ID.unique(),
        {
          ...data,
          role: 'collector',
          createdAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update collector
   */
  async update(documentId, data) {
    try {
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        documentId,
        data
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete collector
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
   * Get assigned customers for a collector
   */
  async getAssignedCustomers(collectorId) {
    try {
      const subs = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.equal('collectorId', collectorId), Query.limit(100)]
      );
      return subs;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get count
   */
  async getCount() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        [Query.equal('role', 'collector'), Query.limit(1)]
      );
      return response.total;
    } catch (error) {
      return 0;
    }
  }
};
