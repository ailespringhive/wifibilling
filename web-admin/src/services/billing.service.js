import { databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../config/appwrite.js';

export const BillingService = {
  /**
   * Get all billing records with optional status filter
   */
  async getAll(status = null, limit = 50, offset = 0) {
    try {
      const queries = [
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc('$createdAt'),
      ];
      if (status) {
        queries.push(Query.equal('paymentStatus', status));
      }
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        queries
      );
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get billing records for a specific customer
   */
  async getByCustomer(customerId) {
    try {
      return await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        [
          Query.equal('customerId', customerId),
          Query.orderDesc('billingMonth'),
        ]
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Create a billing record
   */
  async create(data) {
    try {
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        ID.unique(),
        {
          ...data,
          createdAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update billing status (mark as paid, extend, etc.)
   */
  async updateStatus(documentId, status, additionalData = {}) {
    try {
      const data = { paymentStatus: status, ...additionalData };
      if (status === 'paid') {
        data.paidDate = new Date().toISOString();
      }
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        documentId,
        data
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Get billing counts by status
   */
  async getStatusCounts() {
    try {
      const statuses = ['paid', 'unpaid', 'overdue', 'extended', 'no_pay_needed'];
      const counts = {};
      for (const status of statuses) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BILLINGS,
          [Query.equal('paymentStatus', status), Query.limit(1)]
        );
        counts[status] = response.total;
      }
      return counts;
    } catch (error) {
      return { paid: 0, unpaid: 0, overdue: 0, extended: 0, no_pay_needed: 0 };
    }
  },

  /**
   * Create payment extension
   */
  async createExtension(data) {
    try {
      // Update billing status to extended
      await this.updateStatus(data.billingId, 'extended');
      // Create extension record
      return await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.PAYMENT_EXTENSIONS,
        ID.unique(),
        {
          ...data,
          createdAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   * Generate billing for all active subscriptions
   */
  async generateMonthlyBilling(billingMonth) {
    try {
      // Get all active subscriptions
      const subs = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.equal('status', 'active'), Query.limit(100)]
      );

      const results = [];
      for (const sub of subs.documents) {
        // Get the plan to know the amount
        const plan = await databases.getDocument(
          DATABASE_ID,
          COLLECTIONS.WIFI_PLANS,
          sub.planId
        );

        // Check if billing already exists for this month
        const existing = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BILLINGS,
          [
            Query.equal('customerId', sub.customerId),
            Query.equal('billingMonth', billingMonth),
            Query.limit(1),
          ]
        );

        if (existing.total === 0) {
          const billing = await this.create({
            customerId: sub.customerId,
            subscriptionId: sub.$id,
            billingMonth: billingMonth,
            amount: plan.monthlyRate,
            dueDate: new Date(billingMonth + '-15').toISOString(),
            paymentStatus: 'unpaid',
            paidDate: null,
            collectedBy: null,
            notes: '',
          });
          results.push(billing);
        }
      }
      return results;
    } catch (error) {
      throw error;
    }
  }
};
