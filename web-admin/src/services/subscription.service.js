import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../config/appwrite.js';

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
      throw error;
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
      throw error;
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
          ...data,
          startDate: new Date().toISOString(),
          status: 'active',
        }
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update subscription
   */
  async update(documentId, data) {
    try {
      return await databases.updateDocument(DATABASE_ID, COLLECTIONS.SUBSCRIPTIONS, documentId, data);
    } catch (error) {
      throw error;
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
  }
};
