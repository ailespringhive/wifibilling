const API_KEY = import.meta.env.VITE_APPWRITE_API_KEY;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const API_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT;
const DB = import.meta.env.VITE_APPWRITE_DATABASE_ID;
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
    if (!technicianId) return null;
    
    try {
      const profileRes = await fetch(`${API_ENDPOINT}/databases/${DB}/collections/users_profile/documents/${technicianId}`, {
        headers: {
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY
        }
      });
      if (!profileRes.ok) return false;
      const profile = await profileRes.json();
      const authUserId = profile.userId;

      if (!authUserId) return false;

      const res = await fetch(`${API_ENDPOINT}/databases/${DB}/collections/notifications/documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY
        },
        body: JSON.stringify({
          documentId: 'unique()',
          data: {
            technicianId: technicianId,
            title,
            message,
            type,
            isRead: false
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
      console.error('Failed to dispatch technician notification', e);
      return false;
    }
  }
};
