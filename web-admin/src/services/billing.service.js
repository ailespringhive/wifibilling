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
      const res = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        [
          Query.limit(100)
        ]
      );
      // Filter locally to avoid index errors
      const filtered = res.documents.filter(b => b.customerId === customerId);
      filtered.sort((a, b) => (b.billingMonth || '').localeCompare(a.billingMonth || ''));
      return { documents: filtered, total: filtered.length };
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
      // Get all subscriptions locally and filter to avoid missing index errors
      const subsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.limit(100)]
      );
      const activeSubs = subsResponse.documents.filter(s => s.status === 'active');

      const billingsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        [Query.limit(100)]
      );

      const results = [];
      for (const sub of activeSubs) {
        // Fallback or skip if plan missing
        let planRate = 0;
        try {
          const plan = await databases.getDocument(DATABASE_ID, COLLECTIONS.WIFI_PLANS, sub.planId);
          planRate = plan.monthlyRate || 0;
        } catch (e) {
          console.warn("Could not find plan for sub", sub);
        }

        const hasThisMonth = billingsResponse.documents.some(b => b.customerId === sub.customerId && b.billingMonth === billingMonth);

        if (!hasThisMonth) {
          const billing = await this.create({
            customerId: sub.customerId,
            subscriptionId: sub.$id,
            billingMonth: billingMonth,
            amount: planRate,
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
  },

  /**
   * Delete a billing record
   */
  async delete(documentId) {
    try {
      return await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        documentId
      );
    } catch (error) {
      throw error;
    }
  }
};
