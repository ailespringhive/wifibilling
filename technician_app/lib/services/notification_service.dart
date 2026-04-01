import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../models/notification_model.dart';

class NotificationService {
  final Databases _databases = AppwriteService().databases;

  // Get notifications for current collector (paginated)
  Future<List<TechnicianNotification>> getNotifications(String collectorId, {int limit = 10, int offset = 0}) async {
    try {
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('technicianId', collectorId),
          Query.orderDesc('\$createdAt'),
          Query.limit(limit),
          Query.offset(offset),
        ],
      );

      return response.documents
          .map((doc) => TechnicianNotification.fromMap(doc.data))
          .toList();
    } catch (e) {
      print('Error fetching notifications: $e');
      return [];
    }
  }

  // Mark all unread notifications inside the active page as read 
  // (We handle mass update individually because appwrite doesn't have an updateAll api)
  Future<void> markAllAsRead(String collectorId) async {
    final unread = await _databases.listDocuments(
      databaseId: appwriteDatabaseId,
      collectionId: AppCollections.mobileNotifications,
      queries: [
        Query.equal('technicianId', collectorId),
        Query.equal('isRead', false),
        Query.limit(100),
      ],
    );
    for (var doc in unread.documents) {
      await markAsRead(doc.$id);
    }
  }

  // Mass delete all notifications
  Future<void> clearAll(String collectorId) async {
    final all = await _databases.listDocuments(
      databaseId: appwriteDatabaseId,
      collectionId: AppCollections.mobileNotifications,
      queries: [
        Query.equal('technicianId', collectorId),
        Query.limit(100), // Get up to 100 to mass delete
      ],
    );
    for (var doc in all.documents) {
      try {
        await _databases.deleteDocument(
          databaseId: appwriteDatabaseId,
          collectionId: AppCollections.mobileNotifications,
          documentId: doc.$id,
        );
      } catch (_) {}
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
          Query.equal('technicianId', collectorId),
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
