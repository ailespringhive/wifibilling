import { databases, DATABASE_ID, COLLECTIONS, ID, Query, apiBypass, Permission, Role } from '../config/appwrite.js';
import { MobileNotificationService } from './notification.service.js';

export const BillingService = {
  /**
   * Get all billing records with optional status filter
   */
  async getAll(status = null, limit = 50, offset = 0) {
    const queryStrings = [
      `limit(${limit})`,
      `offset(${offset})`,
      `orderDesc("$createdAt")`,
    ];
    if (status) {
      queryStrings.push(`equal("paymentStatus", ["${status}"])`);
    }
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
      
      // Auto-evaluate and background update overdue bills
      if (response.documents) {
        response.documents = this._autoCheckOverdue(response.documents);
      }
      
      return response;
    } catch (error) {
      console.warn('Client SDK billing list failed, using API bypass:', error.message);
      const response = await apiBypass.listDocuments(COLLECTIONS.BILLINGS, queryStrings);
      if (response.documents) {
        response.documents = this._autoCheckOverdue(response.documents);
      }
      return response;
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
      let filtered = res.documents.filter(b => b.customerId === customerId);
      filtered = this._autoCheckOverdue(filtered);
      filtered.sort((a, b) => (b.billingMonth || '').localeCompare(a.billingMonth || ''));
      return { documents: filtered, total: filtered.length };
    } catch (error) {
      console.warn('Client SDK billing getByCustomer failed, using API bypass:', error.message);
      const res = await apiBypass.listDocuments(COLLECTIONS.BILLINGS, [Query.limit(100)]);
      let filtered = (res.documents || []).filter(b => b.customerId === customerId);
      filtered = this._autoCheckOverdue(filtered);
      filtered.sort((a, b) => (b.billingMonth || '').localeCompare(a.billingMonth || ''));
      return { documents: filtered, total: filtered.length };
    }
  },

  /**
   * Create a billing record
   */
  async create(data) {
    // Only send known billing fields
    const knownFields = [
      'customerId', 'customerName', 'subscriptionId', 'billingMonth',
      'amount', 'dueDate', 'paymentStatus', 'paidDate', 'collectedBy',
      'notes', 'amountPaid', 'createdAt'
    ];
    const cleanData = { createdAt: new Date().toISOString() };
    for (const key of knownFields) {
      if (data[key] !== undefined) {
        cleanData[key] = data[key];
      }
    }

    try {
      const newDoc = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        ID.unique(),
        cleanData,
        [
          Permission.read(Role.any()),
          Permission.update(Role.users()),
          Permission.delete(Role.users()),
        ]
      );

      // Notify collector if this is a new bill
      if (cleanData.customerId && cleanData.paymentStatus !== 'already_paid') {
          // Fire and forget notification to avoid blocking UI
          this._notifyCollectorOnNewBill(cleanData.customerId, cleanData.amount, cleanData.billingMonth, cleanData.customerName);
      }

      return newDoc;
    } catch (error) {
      // If unknown attribute, retry without that field
      if (error.message && error.message.includes('Unknown attribute')) {
        const unknownField = error.message.match(/"(\w+)"/)?.[1];
        if (unknownField && data[unknownField] !== undefined) {
          console.warn(`Removing unknown billing field "${unknownField}" and retrying...`);
          delete data[unknownField];
          return await this.create(data);
        }
      }
      
      console.warn('Error via Client SDK, attempting API bypass...', error.message);
      const res = await apiBypass.createDocument(COLLECTIONS.BILLINGS, ID.unique(), cleanData);
      
      // Notify collector if this is a new bill
      if (cleanData.customerId && cleanData.paymentStatus !== 'already_paid') {
          this._notifyCollectorOnNewBill(cleanData.customerId, cleanData.amount, cleanData.billingMonth, cleanData.customerName);
      }
      
      return res;
    }
  },

  /**
   * Internal Helper: Notification for new bills
   */
  async _notifyCollectorOnNewBill(customerId, amount, billingMonth, customerName = 'A customer') {
    try {
        const subRes = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.SUBSCRIPTIONS,
            [Query.equal('customerId', customerId), Query.limit(1)]
        );
        const collectorId = subRes.documents.length > 0 ? subRes.documents[0].collectorId : null;
        if (collectorId) {
            let monthName = billingMonth || 'the month';
            try {
                if (billingMonth && billingMonth.includes('-')) {
                    const [y, m] = billingMonth.split('-');
                    monthName = new Date(y, parseInt(m)-1).toLocaleString('default', { month: 'long', year: 'numeric' });
                }
            } catch(_) {}

            await MobileNotificationService.send(
                collectorId,
                `New Bill: ${customerName}`,
                `A new bill of ₱${(amount || 0).toLocaleString()} has been generated for ${monthName}.`,
                'bill_generated'
            );
        }
    } catch (e) {
        console.warn('[BillingService] Notification failed:', e);
    }
  },

  /**
   * Update billing status (mark as paid, extend, etc.)
   */
  async updateStatus(documentId, status, additionalData = {}) {
    const data = { paymentStatus: status, ...additionalData };
    if (status === 'paid') {
      data.paidDate = new Date().toISOString();
    }
    try {
      return await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        documentId,
        data
      );
    } catch (error) {
      // Fallback to API bypass for permission issues
      console.warn('Client SDK updateStatus failed, using API bypass:', error.message);
      return await apiBypass.updateDocument(COLLECTIONS.BILLINGS, documentId, data);
    }
  },

  /**
   * Helper: Find collector and send payment notification
   */
  async notifyCollectorPayment(customerId, amountPaid, customerName = 'A customer') {
    try {
      // 1. Find subscription for collectorId
      const subRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.equal('customerId', customerId), Query.limit(1)]
      );
      
      let collectorId = subRes.documents.length > 0 ? subRes.documents[0].collectorId : null;
      
      if (!collectorId) {
        // Try bypass if empty
        const bypassSub = await apiBypass.listDocuments(COLLECTIONS.SUBSCRIPTIONS, [Query.equal('customerId', customerId)]);
        if (bypassSub.documents && bypassSub.documents.length > 0) {
          collectorId = bypassSub.documents[0].collectorId;
        }
      }

      if (collectorId) {
        await MobileNotificationService.send(
          collectorId,
          `Payment: ${customerName}`,
          `${customerName} has paid ₱${amountPaid.toLocaleString()}.`,
          'payment_received'
        );
      }
    } catch (err) {
      console.warn('[BillingService] Failed to send payment notification:', err);
    }
  },

  /**
   * Get billing counts by status
   */
  async getStatusCounts() {
    try {
      const statuses = ['paid', 'unpaid', 'not_yet_paid', 'overdue', 'extended', 'no_pay_needed'];
      const counts = {};
      for (const status of statuses) {
        let queryStatus = status === 'paid' ? ['paid', 'already_paid', 'archived_paid'] : [status];
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BILLINGS,
          [Query.equal('paymentStatus', queryStatus), Query.limit(1)]
        );
        counts[status] = response.total;
      }
      return counts;
    } catch (error) {
      return { paid: 0, unpaid: 0, not_yet_paid: 0, overdue: 0, extended: 0, no_pay_needed: 0 };
    }
  },

  /**
   * Get dynamic 12-month revenue statistics for a given year
   * Returns: { projected: [12], collected: [12] }
   */
  async getMonthlyRevenueStats(year) {
    try {
      const projected = new Array(12).fill(0);
      const collected = new Array(12).fill(0);
      const yearStr = String(year);

      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BILLINGS,
          [
            Query.startsWith('billingMonth', yearStr),
            Query.limit(100),
            Query.offset(offset)
          ]
        );
        
        for (const doc of response.documents) {
          if (!doc.billingMonth) continue;
          
          // E.g. "2026-04" -> Month index 3 (April)
          const parts = doc.billingMonth.split('-');
          if (parts.length < 2) continue;
          
          let monthIndex = parseInt(parts[1], 10) - 1;
          if (monthIndex < 0 || monthIndex > 11) continue;

          // 1. Add strictly to Projected Revenue (expected billing total)
          const expectedAmt = parseFloat(doc.amount || 0);
          projected[monthIndex] += expectedAmt;

          // 2. Add to Collected Revenue IF paid
          if (['paid', 'already_paid', 'archived_paid'].includes(doc.paymentStatus)) {
             const finalPaid = (doc.amountPaid !== null && doc.amountPaid > 0) ? doc.amountPaid : expectedAmt;
             collected[monthIndex] += parseFloat(finalPaid || 0);
          }
        }

        if (response.documents.length < 100) {
          hasMore = false;
        } else {
          offset += 100;
        }
      }

      return { projected, collected };
    } catch (error) {
      console.warn('Error fetching monthly revenue:', error);
      return { projected: new Array(12).fill(0), collected: new Array(12).fill(0) };
    }
  },

  /**
   * Calculate total monetary amount collected from PAID bills
   */
  async getTotalCollectedAmount() {
    try {
      let offset = 0;
      let totalAmount = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BILLINGS,
          [
            Query.equal('paymentStatus', ['paid', 'already_paid', 'archived_paid']),
            Query.limit(100),
            Query.offset(offset)
          ]
        );
        
        for (const doc of response.documents) {
          const finalAmount = (doc.amountPaid !== null && doc.amountPaid > 0) ? doc.amountPaid : (doc.amount || 0);
          totalAmount += finalAmount;
        }

        if (response.documents.length < 100) {
          hasMore = false;
        } else {
          offset += 100;
        }
      }
      
      return totalAmount;
    } catch (error) {
      return 0;
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
      const subsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.limit(200)]
      );
      const activeSubs = subsResponse.documents.filter(s => s.status === 'active');

      // Get existing billings to avoid duplicates
      const billingsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BILLINGS,
        [Query.limit(200)]
      );

      // Get all REAL customer profiles (must have role=customer and a valid name)
      const customersResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        [Query.equal('role', 'customer'), Query.limit(200)]
      );
      const customerMap = {};
      (customersResponse.documents || []).forEach(c => {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
        if (name) {
          customerMap[c.userId] = name;
        }
      });

      const results = [];
      for (const sub of activeSubs) {
        // SKIP subscriptions that don't have a matching customer profile
        if (!customerMap[sub.customerId]) {
          console.warn('Skipping orphaned subscription — no customer profile found for:', sub.customerId);
          continue;
        }

        // Get plan rate
        let planRate = 0;
        try {
          const plan = await databases.getDocument(DATABASE_ID, COLLECTIONS.WIFI_PLANS, sub.planId);
          planRate = plan.monthlyRate || 0;
        } catch (e) {
          console.warn("Could not find plan for sub", sub);
        }

        // Check if billing already exists for this customer+month
        const hasThisMonth = billingsResponse.documents.some(
          b => b.customerId === sub.customerId && b.billingMonth === billingMonth
        );

        if (!hasThisMonth) {
          const customerName = customerMap[sub.customerId];
          
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + 1);
          
          const billing = await this.create({
            customerId: sub.customerId,
            customerName: customerName,
            subscriptionId: sub.$id,
            billingMonth: billingMonth,
            amount: planRate,
            dueDate: dueDate.toISOString(),
            paymentStatus: 'not_yet_paid',
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
      // Fallback to API bypass for permission issues
      console.warn('Client SDK delete failed, using API bypass:', error.message);
      return await apiBypass.deleteDocument(COLLECTIONS.BILLINGS, documentId);
    }
  },

  /**
   * Auto-generate monthly bills for all active subscriptions.
   * 
   * Logic:
   * 1. For each active subscription, find the customer's latest billed month.
   * 2. If we're currently in or past that month, generate the next month's bill.
   * 3. Catches up all missing months (e.g. if dashboard wasn't opened for 3 months).
   * 4. Advance payment aware: if a customer already has bills for future months
   *    (paid in advance), skip those months.
   * 5. Idempotent — safe to call multiple times.
   * 
   * @returns {Object} { generated: number, skipped: number, errors: number }
   */
  async autoGenerateBills() {
    const result = { generated: 0, skipped: 0, errors: 0 };

    try {
      // 1. Get all active subscriptions
      const subsResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.SUBSCRIPTIONS,
        [Query.limit(200)]
      );
      const activeSubs = (subsResponse.documents || []).filter(s => s.status === 'active');

      if (activeSubs.length === 0) {
        console.log('[AutoBilling] No active subscriptions found.');
        return result;
      }

      // 2. Get all customer profiles (to get names & validate real customers)
      const customersResponse = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        [Query.equal('role', 'customer'), Query.limit(200)]
      );
      const customerMap = {};
      const customerDocs = {};
      (customersResponse.documents || []).forEach(c => {
        const name = `${c.firstName || ''} ${c.lastName || ''}`.trim();
        if (name) {
          customerMap[c.userId] = name;
        }
        customerDocs[c.userId] = c;
      });

      // 3. Get ALL existing billing records (to check for duplicates & find latest months)
      let allExistingBills = [];
      let offset = 0;
      let hasMore = true;
      while (hasMore) {
        const billsRes = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.BILLINGS,
          [Query.limit(100), Query.offset(offset)]
        );
        allExistingBills = allExistingBills.concat(billsRes.documents || []);
        hasMore = billsRes.documents.length === 100;
        offset += 100;
      }

      // 4. Build a map: customerId -> sorted list of billingMonths (YYYY-MM only)
      const customerBillMonths = {};
      allExistingBills.forEach(b => {
        if (!b.customerId) return;
        if (!customerBillMonths[b.customerId]) {
          customerBillMonths[b.customerId] = [];
        }
        if (b.billingMonth) {
          const yyyymm = b.billingMonth.substring(0, 7);
          if (!customerBillMonths[b.customerId].includes(yyyymm)) {
            customerBillMonths[b.customerId].push(yyyymm);
          }
        }
      });

      // 5. Get all plans (to look up monthlyRate)
      const plansRes = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.WIFI_PLANS,
        [Query.limit(100)]
      );
      const planMap = {};
      (plansRes.documents || []).forEach(p => {
        planMap[p.$id] = p;
      });

      // 6. Current month as YYYY-MM
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // 7. For each active subscription, generate missing bills
      for (const sub of activeSubs) {
        // Skip subscriptions without a matching customer profile (deleted customers)
        if (!customerMap[sub.customerId]) {
          result.skipped++;
          // Clean up orphaned subscription in background
          try {
            await databases.deleteDocument(DATABASE_ID, COLLECTIONS.SUBSCRIPTIONS, sub.$id);
            console.log(`[AutoBilling] Cleaned up orphaned subscription for deleted customer: ${sub.customerId}`);
          } catch (cleanupErr) {
            try {
              await apiBypass.deleteDocument(COLLECTIONS.SUBSCRIPTIONS, sub.$id);
              console.log(`[AutoBilling] Cleaned up orphaned subscription (bypass) for: ${sub.customerId}`);
            } catch (_) {}
          }
          continue;
        }

        const plan = planMap[sub.planId];
        const planRate = plan ? (plan.monthlyRate || 0) : 0;
        const customerName = customerMap[sub.customerId];

        // Get existing billed months for this customer, sorted ascending
        const billedMonths = (customerBillMonths[sub.customerId] || []).sort();

        // Determine the starting month for bill generation
        let startMonth;
        if (billedMonths.length === 0) {
          // No bills at all — start from subscription start date or current month
          if (sub.startDate) {
            const startDate = new Date(sub.startDate);
            startMonth = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
          } else {
            startMonth = currentMonth;
          }
        } else {
          // Has existing bills — start from the month AFTER the latest billed month
          const latestMonth = billedMonths[billedMonths.length - 1];
          startMonth = this._nextMonth(latestMonth);
        }

        // Generate bills from startMonth up to currentMonth (catch-up)
        let monthToGenerate = startMonth;
        while (monthToGenerate <= currentMonth) {
          // Check if bill already exists for this month (idempotent guard)
          // Also match YYYY-MM-DD formatted months from legacy customer creation
          const alreadyBilled = allExistingBills.some(b =>
            b.customerId === sub.customerId &&
            b.billingMonth && b.billingMonth.substring(0, 7) === monthToGenerate
          );
          if (billedMonths.includes(monthToGenerate) || alreadyBilled) {
            monthToGenerate = this._nextMonth(monthToGenerate);
            continue;
          }

          // Calculate due date: same day next month (1 month from billing period start)
          const [year, month] = monthToGenerate.split('-').map(Number);
          const custDoc = customerDocs[sub.customerId];
          let startDay = 1;
          if (sub.startDate) {
            // Safely parse "YYYY-MM-DD" strictly isolated from Timezone modifiers
            const parts = sub.startDate.split('-');
            if (parts.length >= 3) {
              startDay = parseInt(parts[2].substring(0, 2), 10);
            } else {
              startDay = new Date(sub.startDate).getDate();
            }
          } else if (custDoc && custDoc.billingStartDate) {
            const parts = custDoc.billingStartDate.split('-');
            if (parts.length >= 3) {
              startDay = parseInt(parts[2].substring(0, 2), 10);
            } else {
              startDay = new Date(custDoc.billingStartDate).getDate();
            }
          } else if (custDoc && custDoc.$createdAt) {
            // legacy fallback
            startDay = new Date(custDoc.$createdAt).getDate();
          } else {
            // SMARTER LAST RESORT: Try to find any existing bill for this customer and steal the day
            const existingBills = allExistingBills.filter(eb => eb.customerId === sub.customerId && eb.dueDate);
            if (existingBills.length > 0) {
              // Get the day from the latest bill
              existingBills.sort((a,b) => (b.billingMonth || '').localeCompare(a.billingMonth || ''));
              const latestBillDay = new Date(existingBills[0].dueDate).getDate();
              if (latestBillDay) startDay = latestBillDay;
              else startDay = new Date().getDate();
            } else {
              startDay = new Date().getDate();
            }
          }
          const dueDate = new Date(year, month, startDay); // month is already 1-indexed, so this = next month

          try {
            await this.create({
              customerId: sub.customerId,
              customerName: customerName,
              subscriptionId: sub.$id,
              billingMonth: monthToGenerate,
              amount: planRate,
              dueDate: dueDate.toISOString(),
              paymentStatus: 'not_yet_paid',
              paidDate: null,
              collectedBy: null,
              notes: 'Auto-generated',
            });
            result.generated++;
            console.log(`[AutoBilling] Generated bill for ${customerName} — ${monthToGenerate} — ₱${planRate}`);
          } catch (err) {
            console.error(`[AutoBilling] Error generating bill for ${customerName} — ${monthToGenerate}:`, err);
            result.errors++;
          }

          monthToGenerate = this._nextMonth(monthToGenerate);
        }
      }

      console.log(`[AutoBilling] Done. Generated: ${result.generated}, Skipped: ${result.skipped}, Errors: ${result.errors}`);
      return result;
    } catch (error) {
      console.error('[AutoBilling] Fatal error:', error);
      return result;
    }
  },

  /**
   * Helper: given a "YYYY-MM" string, return the next month "YYYY-MM"
   */
  _nextMonth(yearMonth) {
    const [y, m] = yearMonth.split('-').map(Number);
    const next = new Date(y, m, 1); // month is 0-indexed, so m (already 1-indexed) = next month
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
  },

  /**
   * Helper to lazy-evaluate and auto-update overdue bills
   */
  _autoCheckOverdue(documents) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return documents.map(doc => {
      if (doc.paymentStatus === 'not_yet_paid' && doc.dueDate) {
        const dueDate = new Date(doc.dueDate);
        dueDate.setHours(0, 0, 0, 0); // compare dates safely
        
        if (dueDate < today) {
          // It's overdue! Mutate local state so UI updates instantly
          doc.paymentStatus = 'overdue';
          // Fire-and-forget background update to Appwrite
          databases.updateDocument(DATABASE_ID, COLLECTIONS.BILLINGS, doc.$id || doc.id, {
            paymentStatus: 'overdue'
          }).catch(err => console.warn('Failed to auto-update overdue status', err));
        }
      }
      return doc;
    });
  }
};
