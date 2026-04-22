import { databases, DATABASE_ID, COLLECTIONS, ID, Query, Permission, Role, apiBypass } from '../config/appwrite.js';

export const SubscriptionService = {
  /**
   * Get all subscriptions
   */
  async getAll(status = null, limit = 50) {
    try {
      const queries = [Query.limit(limit), Query.orderDesc('$createdAt')];
      if (status) queries.push(Query.equal('status', status));
      return await databases.listDocuments(DATABASE_ID, COLLECTIONS.SUBSCRIPTIONS, queries);
    } catch (error) {
      console.warn('Client SDK subscription list failed, using API bypass:', error.message);
      const queries = [Query.limit(limit), Query.orderDesc('$createdAt')];
      if (status) queries.push(Query.equal('status', status));
      return await apiBypass.listDocuments(COLLECTIONS.SUBSCRIPTIONS, queries);
    }

  },

  /**
   * Get subscription by customer
   */
  async getByCustomer(customerId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.equal('customerId', customerId), Query.limit(1)]
      );
      return response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
      console.warn('Client SDK subscription getByCustomer failed, using API bypass:', error.message);
      const response = await apiBypass.listDocuments(COLLECTIONS.SUBSCRIPTIONS, [
        Query.equal("customerId", customerId),
        Query.limit(1)
      ]);
      return response.documents && response.documents.length > 0 ? response.documents[0] : null;
    }
  },

  /**
   * Create subscription
   */
  async create(data) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        ID.unique(),
        {
          startDate: new Date().toISOString(),
          status: 'active',
          ...data,
        }
      );
    } catch (error) {
      console.warn('Client SDK subscription create failed, using API bypass:', error.message);
      return await apiBypass.createDocument(COLLECTIONS.SUBSCRIPTIONS, ID.unique(), {
        startDate: new Date().toISOString(),
        status: 'active',
        ...data,
      });
    }
  },

  /**
   * Update subscription
   */
  async update(documentId, data) {
    try {
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.SUBSCRIPTIONS, documentId, data);
    } catch (error) {
      console.warn('Client SDK subscription update failed, using API bypass:', error.message);
      return await apiBypass.updateDocument(COLLECTIONS.SUBSCRIPTIONS, documentId, data);
    }
  },

  /**
   * Get active subscription count
   */
  async getActiveCount() {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.equal('status', 'active'), Query.limit(1)]
      );
      return response.total;
    } catch (error) {
      return 0;
    }
  },

  /**
   * Delete subscription
   */
  async delete(documentId) {
    try {
      return await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        documentId
      );
    } catch (error) {
      console.warn('Client SDK subscription delete failed, using API bypass:', error.message);
      return await apiBypass.deleteDocument(COLLECTIONS.SUBSCRIPTIONS, documentId);
    }
  }
};
