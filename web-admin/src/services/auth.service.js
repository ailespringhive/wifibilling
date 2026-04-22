import { account, databases, DATABASE_ID, COLLECTIONS, ID, Query, ENDPOINT, PROJECT_ID, API_KEY } from '../config/appwrite.js';
import { apiBypass } from '../config/appwrite.js';

export const AuthService = {
  /**
   * Login with email & password — returns user + profile with role
   * Falls back to Server API key login if Client SDK fails (CORS on live deployment)
   */
  async login(email, password) {
    // --- Attempt 1: Client SDK (works on localhost where platform is registered) ---
    try {
      try { await account.deleteSession('current'); } catch (_) {}
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      const profile = await this.getUserProfile(user.$id);

      if (!profile) {
        await account.deleteSession('current');
        throw new Error('No profile found for this account.');
      }

      return { user, profile, session };
    } catch (clientError) {
      // If it's a real auth error (wrong password), don't fallback
      if (clientError?.code === 401 || clientError?.type === 'user_invalid_credentials') {
        throw new Error('Invalid email or password.');
      }

      console.warn('[Auth] Client SDK login failed (likely CORS), trying Server API bypass...', clientError.message);
    }

    // --- Attempt 2: Server API Key bypass (works on ANY domain, no CORS needed) ---
    try {
      // Step 1: Create session via Server API
      const sessionRes = await fetch(`${ENDPOINT}/account/sessions/email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!sessionRes.ok) {
        const err = await sessionRes.json().catch(() => ({}));
        if (err.code === 401 || err.type === 'user_invalid_credentials') {
          throw new Error('Invalid email or password.');
        }
        throw new Error(err.message || 'Server login failed');
      }

      const session = await sessionRes.json();
      const userId = session.userId;

      // Step 2: Get user details via Server API
      const userRes = await fetch(`${ENDPOINT}/users/${userId}`, {
        headers: {
          'X-Appwrite-Project': PROJECT_ID,
          'X-Appwrite-Key': API_KEY,
        },
      });
      const user = userRes.ok ? await userRes.json() : { $id: userId, name: email, email };

      // Step 3: Get profile from database via API bypass
      const profile = await this._getProfileBypass(userId);

      if (!profile) {
        throw new Error('No profile found for this account.');
      }

      // Mark as server-authenticated so the app knows to use apiBypass for everything
      return { user, profile, session, serverAuth: true };
    } catch (serverError) {
      throw serverError;
    }
  },

  /**
   * Get user profile via API bypass (no CORS issues)
   */
  async _getProfileBypass(userId) {
    try {
      const res = await apiBypass.listDocuments(COLLECTIONS.USERS_PROFILE, [
        `{"method":"equal","attribute":"userId","values":["${userId}"]}`
      ]);
      return (res.documents && res.documents.length > 0) ? res.documents[0] : null;
    } catch (e) {
      console.error('Profile bypass fetch failed:', e);
      return null;
    }
  },

  /**
   * Get current logged in user
   */
  async getCurrentUser() {
    try {
      const user = await account.get();
      const profile = await this.getUserProfile(user.$id);
      return { user, profile };
    } catch (error) {
      return null;
    }
  },

  /**
   * Get user profile from database
   */
  async getUserProfile(userId) {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.USERS_PROFILE,
        [Query.equal('userId', userId)]
      );
      return response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
      // Fallback to API bypass
      return await this._getProfileBypass(userId);
    }
  },

  /**
   * Logout current session
   */
  async logout() {
    try {
      await account.deleteSession('current');
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  /**
   * Create a new user account (admin creates collectors/customers)
   */
  async createUser(email, password, name) {
    try {
      const user = await account.create(ID.unique(), email, password, name);
      return user;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Update current user's password
   */
  async updatePassword(newPassword, currentPassword) {
    try {
      return await account.updatePassword(newPassword, currentPassword);
    } catch (error) {
      throw error;
    }
  },
  
  /**
   * Update profile data in database
   */
  async updateUserProfile(profileId, data) {
    try {
      // Use bypass to avoid CORS on live server
      return await apiBypass.updateDocument(COLLECTIONS.USERS_PROFILE, profileId, data);
    } catch (error) {
      console.error('Failed to update profile in DB:', error);
      throw error;
    }
  }
};
