import { account, databases, DATABASE_ID, COLLECTIONS, ID, Query } from '../config/appwrite.js';

export const AuthService = {
  /**
   * Login with email & password
   */
  async login(email, password) {
    try {
      const session = await account.createEmailPasswordSession(email, password);
      const user = await account.get();
      // Fetch user profile to check role
      const profile = await this.getUserProfile(user.$id);
      if (profile && profile.role !== 'admin') {
        await account.deleteSession('current');
        throw new Error('Access denied. Only admins can access this dashboard.');
      }
      return { user, profile, session };
    } catch (error) {
      throw error;
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
      console.error('Error fetching user profile:', error);
      return null;
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
      // Note: In production, use Appwrite server SDK or Cloud Functions for this
      const user = await account.create(ID.unique(), email, password, name);
      return user;
    } catch (error) {
      throw error;
    }
  }
};
