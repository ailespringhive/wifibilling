import { databases, DATABASE_ID, COLLECTIONS, ID, Query, apiBypass } from '../config/appwrite.js';

export const PlanService = {
  /**
   * Get all WiFi plans
   */
  async getAll() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        [Query.limit(100)]
      );
      if (response.documents) {
        response.documents.sort((a, b) => (a.monthlyRate || 0) - (b.monthlyRate || 0));
      }
      return response;
    } catch (error) {
      console.warn('Client SDK plan list failed, using API bypass:', error.message);
      const response = await apiBypass.listDocuments(COLLECTIONS.WIFI_PLANS, ['{"method":"limit","values":[100]}']);
      if (response.documents) {
        response.documents.sort((a, b) => (a.monthlyRate || 0) - (b.monthlyRate || 0));
      }
      return response;
    }
  },

  /**
   * Get total count of WiFi plans
   */
  async getCount() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        [Query.limit(1)]
      );
      return response.total;
    } catch (error) {
      return 0;
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
      console.warn('Client SDK plan getById failed, using API bypass:', error.message);
      return await apiBypass.getDocument(COLLECTIONS.WIFI_PLANS, documentId);
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
      console.warn('Client SDK plan create failed, using API bypass:', error.message);
      return await apiBypass.createDocument(COLLECTIONS.WIFI_PLANS, ID.unique(), data);
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
      console.warn('Client SDK plan update failed, using API bypass:', error.message);
      return await apiBypass.updateDocument(COLLECTIONS.WIFI_PLANS, documentId, data);
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
      console.warn('Client SDK plan delete failed, using API bypass:', error.message);
      return await apiBypass.deleteDocument(COLLECTIONS.WIFI_PLANS, documentId);
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
      console.warn('Client SDK plan toggleActive failed, using API bypass:', error.message);
      return await apiBypass.updateDocument(COLLECTIONS.WIFI_PLANS, documentId, { isActive });
    }
  }
};
