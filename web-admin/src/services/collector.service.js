import { databases, COLLECTIONS, DATABASE_ID, ID, Query, Permission, Role, apiBypass } from '../config/appwrite.js';

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
          Query.equal('role', ['collector', 'technician']),
          Query.limit(limit),
          Query.offset(offset),
          Query.orderDesc('$createdAt'),
        ]
      );
      return response;
    } catch (error) {
      console.warn('Client SDK collector list failed, using API bypass:', error.message);
      return await apiBypass.listDocuments(COLLECTIONS.USERS_PROFILE, [
        'equal("role", ["collector", "technician"])',
        `limit(${limit})`,
        `offset(${offset})`,
        'orderDesc("$createdAt")',
      ]);
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
          role: data.role || 'collector',
        }
      );
    } catch (error) {
      console.warn('Client SDK collector create failed, using API bypass:', error.message);
      return await apiBypass.createDocument(COLLECTIONS.USERS_PROFILE, ID.unique(), {
        ...data,
        role: data.role || 'collector',
      });
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
      console.warn('Client SDK collector update failed, using API bypass:', error.message);
      return await apiBypass.updateDocument(COLLECTIONS.USERS_PROFILE, documentId, data);
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
      console.warn('Client SDK collector delete failed, using API bypass:', error.message);
      return await apiBypass.deleteDocument(COLLECTIONS.USERS_PROFILE, documentId);
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
      console.warn('Client SDK collector assignments failed, using API bypass:', error.message);
      return await apiBypass.listDocuments(COLLECTIONS.SUBSCRIPTIONS, [
        Query.equal("collectorId", collectorId),
        Query.limit(100)
      ]);
    }
  },

  /**
   * Get collector count
   */
  async getCollectorCount() {
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
  },

  /**
   * Get technician count
   */
  async getTechnicianCount() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        [Query.equal('role', 'technician'), Query.limit(1)]
      );
      return response.total;
    } catch (error) {
      return 0;
    }
  }
};
