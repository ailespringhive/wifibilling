import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../models/notification_model.dart';

class NotificationService {
  final Databases _databases = AppwriteService().databases;

  // Get notifications for current collector
  Future<List<CollectorNotification>> getNotifications(String collectorId) async {
    try {
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.orderDesc('createdAt'),
          Query.limit(50),
        ],
      );

      return response.documents
          .map((doc) => CollectorNotification.fromMap(doc.data))
          .toList();
    } catch (e) {
      print('Error fetching notifications: $e');
      return [];
    }
  }

  // Mark notification as read
  Future<bool> markAsRead(String notificationId) async {
    try {
      await _databases.updateDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.mobileNotifications,
        documentId: notificationId,
        data: {'isRead': true},
      );
      return true;
    } catch (e) {
      print('Error marking notification read: $e');
      return false;
    }
  }

  // Get unread count
  Future<int> getUnreadCount(String collectorId) async {
    try {
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.equal('isRead', false),
          Query.limit(1), // We can use total to get count without downloading all documents
        ],
      );
      return response.total;
    } catch (e) {
      print('Error fetching unread count: $e');
      return 0;
    }
  }
}
