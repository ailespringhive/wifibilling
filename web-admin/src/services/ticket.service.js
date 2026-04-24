import { databases, COLLECTIONS, Query, apiBypass, DATABASE_ID } from '../config/appwrite.js';
import { MobileNotificationService } from './notification.service.js';
class TicketService {
  /**
   * Fetch all tickets with optional status filter and pagination
   */
  async getTickets(statusFilter = '', limit = 10, offset = 0) {
    try {
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ];
      
      if (statusFilter) {
        queries.push(Query.equal('status', statusFilter));
      }

      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REPAIR_TICKETS,
        queries
      );
      
      return response;
    } catch (error) {
      console.warn('Client API failed, trying bypass:', error.message);
      const queries = [
        Query.orderDesc('$createdAt'),
        Query.limit(limit),
        Query.offset(offset)
      ];
      if (statusFilter) {
        queries.push(Query.equal('status', statusFilter));
      }
      const response = await apiBypass.listDocuments(COLLECTIONS.REPAIR_TICKETS, queries);
      return response;
    }
  }

  /**
   * Fetch tickets for a specific customer
   */
  async getCustomerTickets(customerId) {
    try {
      const queries = [
        Query.equal('customerId', customerId),
        Query.orderDesc('$createdAt')
      ];
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.REPAIR_TICKETS,
        queries
      );
      return response.documents;
    } catch (error) {
      console.warn('Client API failed, trying bypass:', error.message);
      const queries = [
        Query.equal('customerId', customerId),
        Query.orderDesc('$createdAt')
      ];
      try {
          const response = await apiBypass.listDocuments(COLLECTIONS.REPAIR_TICKETS, queries);
          return response.documents || [];
      } catch(e) {
          return [];
      }
    }
  }

  /**
   * Fetch a single ticket by ID
   */
  async getTicket(ticketId) {
    try {
      return await databases.getDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        COLLECTIONS.REPAIR_TICKETS,
        ticketId
      );
    } catch (error) {
      return await apiBypass.getDocument(COLLECTIONS.REPAIR_TICKETS, ticketId);
    }
  }

  async _notifyTechnicians(ticketData) {
    const title = 'New Repair Ticket';
    const message = `${ticketData.customerName} reported an issue: ${ticketData.issueDescription || ticketData.issue}`;
    try {
      if (ticketData.technicianId) {
        MobileNotificationService.sendToTechnician(ticketData.technicianId, title, message).catch(() => {});
        this.dispatchFcmAlert(ticketData.technicianId, title, message).catch(() => {});
      } else {
        // Broadcast to all technicians using CollectorService to handle API bypasses safely
        const { CollectorService } = await import('./collector.service.js');
        const response = await CollectorService.getAll(100, 0);
        const technicians = (response.documents || []).filter(c => c.role === 'technician');
        
        for (const tech of technicians) {
          MobileNotificationService.sendToTechnician(tech.$id, title, message).catch(() => {});
          this.dispatchFcmAlert(tech.$id, title, message).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Failed to dispatch notifications', e);
    }
  }

  /**
   * Create a new ticket (used by Admins)
   */
  async createTicket(ticketData) {
    // Ticket priority defaults to 'medium', status to 'pending' if not provided
    const payload = {
      customerId: ticketData.customerId,
      customerName: ticketData.customerName,
      customerAddress: ticketData.address || ticketData.customerAddress || '',
      issue: ticketData.issueDescription || ticketData.issue || '',
      issueDescription: ticketData.issueDescription || ticketData.issue || '',
      priority: ticketData.priority || 'medium',
      status: 'pending',
      technicianId: ticketData.technicianId || '',
      technicianName: ticketData.technicianName || '',
      notes: ticketData.notes || '',
    };

    // Only include imageUrls if provided
    if (ticketData.imageUrls && ticketData.imageUrls.length > 0) {
      payload.imageUrls = ticketData.imageUrls;
    }

    let res;
    try {
      res = await databases.createDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        COLLECTIONS.REPAIR_TICKETS,
        'unique()',
        payload
      );
    } catch (error) {
      res = await apiBypass.createDocument(COLLECTIONS.REPAIR_TICKETS, 'unique()', payload);
    }

    if (res && res.$id) {
       this._notifyTechnicians(ticketData).catch(() => {});
    }

    return res;
  }

  /**
   * Update a ticket's status, priority, or assigned technician
   */
  async updateTicket(ticketId, updates) {
    try {
      return await databases.updateDocument(
        import.meta.env.VITE_APPWRITE_DATABASE_ID,
        COLLECTIONS.REPAIR_TICKETS,
        ticketId,
        updates
      );
    } catch (error) {
      return await apiBypass.updateDocument(COLLECTIONS.REPAIR_TICKETS, ticketId, updates);
    }
  }

  /**
   * Helper to send an FCM Push Notification directly from JS.
   * Requires VITE_FCM_SERVER_KEY to be set in .env.
   */
  async dispatchFcmAlert(userId, title, bodyStr) {
    try {
      const serverKey = import.meta.env.VITE_FCM_SERVER_KEY;
      if (!serverKey) return; // Silent abort if not configured
      
      // Look up target user's FCM Token from their Appwrite Preferences
      const userRes = await databases.getDocument(
         DATABASE_ID,
         COLLECTIONS.USERS_PROFILE,
         userId
      );
      const fcmToken = userRes.fcmToken; // Or wherever it's stored
      if (!fcmToken) return;

      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `key=${serverKey}`
        },
        body: JSON.stringify({
          to: fcmToken,
          notification: { title: title, body: bodyStr },
          priority: 'high'
        })
      });
    } catch (e) {
      console.warn('FCM dispatch failed:', e);
    }
  }

  /**
   * Delete a ticket
   */
  async deleteTicket(ticketId) {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        COLLECTIONS.REPAIR_TICKETS,
        ticketId
      );
    } catch (error) {
      await apiBypass.deleteDocument(COLLECTIONS.REPAIR_TICKETS, ticketId);
    }
  }
}

export const ticketService = new TicketService();
