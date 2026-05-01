import { API_KEY, PROJECT_ID, ENDPOINT as API_ENDPOINT, DATABASE_ID as DB } from '../config/appwrite.js';
const COLL_NOTIFS = 'mobile_notifications';

export const MobileNotificationService = {
  /**
   * Send a notification to a specific mobile collector
   * Uses Server API to assign exact read/update permissions to the collector.
   */
  async send(collectorId, title, message, type = 'update') {
    if (!collectorId) return null;
    
    try {
      const profileRes = await fetch(`${API_ENDPOINT}/databases/${DB}/collections/users_profile/documents/${collectorId}`, {
        headers: {
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY
        }
      });
      if (!profileRes.ok) return false;
      const profile = await profileRes.json();
      const authUserId = profile.userId;

      if (!authUserId) return false;

      const res = await fetch(`${API_ENDPOINT}/databases/${DB}/collections/${COLL_NOTIFS}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY
        },
        body: JSON.stringify({
          documentId: 'unique()',
          data: {
            collectorId,
            technicianId: '',
            title,
            message,
            type,
            isRead: false,
            createdAt: new Date().toISOString()
          },
          permissions: [
            `read("user:${authUserId}")`,
            `update("user:${authUserId}")`,
            `delete("user:${authUserId}")`
          ]
        })
      });
      return res.ok;
    } catch (e) {
      console.error('Failed to dispatch notification to mobile', e);
      return false;
    }
  },

  /**
   * Send a notification to a specific mobile technician
   */
  async sendToTechnician(technicianId, title, message, type = 'repair') {
    if (!technicianId) {
      console.warn('[NotificationService] No technicianId provided');
      return false;
    }
    
    try {
      // 1. Get the technician's auth userId from their profile for permissions
      console.log(`[NotificationService] Looking up profile for technician: ${technicianId}`);
      const profileRes = await fetch(`${API_ENDPOINT}/databases/${DB}/collections/users_profile/documents/${technicianId}`, {
        headers: {
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY
        }
      });

      if (!profileRes.ok) {
        const errText = await profileRes.text();
        console.error(`[NotificationService] Profile lookup failed for ${technicianId}:`, errText);
        return false;
      }

      const profile = await profileRes.json();
      const authUserId = profile.userId;
      console.log(`[NotificationService] Found auth userId: ${authUserId} for tech ${technicianId}`);

      if (!authUserId) {
        console.error(`[NotificationService] Technician profile ${technicianId} has no userId field`);
        return false;
      }

      // 2. Create the notification document
      const res = await fetch(`${API_ENDPOINT}/databases/${DB}/collections/${COLL_NOTIFS}/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY
        },
        body: JSON.stringify({
          documentId: 'unique()',
          data: {
            collectorId: technicianId, // Satisfy Appwrite schema requirement
            technicianId: technicianId, // Satisfy newer flutter query structure
            title,
            message,
            type,
            isRead: false,
            createdAt: new Date().toISOString()
          },
          permissions: [
            `read("user:${authUserId}")`,
            `update("user:${authUserId}")`,
            `delete("user:${authUserId}")`
          ]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[NotificationService] Document creation failed:`, errText);
        return false;
      }

      console.log(`[NotificationService] Notification successfully sent to tech ${technicianId}`);
      return true;
    } catch (e) {
      console.error('[NotificationService] Unexpected error dispatching technician notification:', e);
      return false;
    }
  }
};
