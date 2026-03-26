import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../config/appwrite.js';

export const PlanService = {
  /**
   * Get all WiFi plans
   */
  async getAll() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        [Query.orderAsc('monthlyRate'), Query.limit(100)]
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get single plan
   */
  async getById(documentId) {
    try {
      return await databases.getDocument(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        documentId
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create plan
   */
  async create(data) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        ID.unique(),
        data
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update plan
   */
  async update(documentId, data) {
    try {
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        documentId,
        data
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Delete plan
   */
  async delete(documentId) {
    try {
      return await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        documentId
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Toggle plan active status
   */
  async toggleActive(documentId, isActive) {
    try {
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        documentId,
        { isActive }
      );
    } catch (error) {
      throw error;
    }
  }
};
