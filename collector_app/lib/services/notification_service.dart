import 'package:appwrite/appwrite.dart';
import 'package:flutter/foundation.dart';
import '../config/appwrite_config.dart';
import '../models/notification_model.dart';

class NotificationService {
  final TablesDB _db = AppwriteService().tablesDB;

  // Get notifications for current collector
  Future<List<CollectorNotification>> getNotifications(String collectorId) async {
    if (collectorId.isEmpty) return [];
    try {
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.orderDesc('createdAt'),
          Query.limit(50),
        ],
      );

      return response.rows
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            map[r'$id'] = doc.$id;
            map[r'$createdAt'] = doc.$createdAt;
            return CollectorNotification.fromMap(map);
          })
          .where((n) => n.type != 'repair')
          .toList();
    } catch (e) {
      final err = e.toString();
      if (!err.contains('Software caused connection abort') && 
          !err.contains('Failed host lookup') &&
          !err.contains('Connection refused')) {
        debugPrint('Error fetching notifications: $e');
      }
      return [];
    }
  }

  // Mark notification as read
  Future<bool> markAsRead(String notificationId) async {
    try {
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.mobileNotifications,
        rowId: notificationId,
        data: {'isRead': true},
      );
      return true;
    } catch (e) {
      debugPrint('Error marking notification read: $e');
      return false;
    }
  }

  // Get unread count
  Future<int> getUnreadCount(String collectorId) async {
    if (collectorId.isEmpty) return 0;
    try {
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.equal('isRead', false),
          Query.limit(100), 
        ],
      );
      
      final unreadDocs = response.rows
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            map[r'$id'] = doc.$id;
            map[r'$createdAt'] = doc.$createdAt;
            return CollectorNotification.fromMap(map);
          })
          .where((n) => n.type != 'repair')
          .toList();
          
      return unreadDocs.length;
    } catch (e) {
      final err = e.toString();
      if (!err.contains('Software caused connection abort') && 
          !err.contains('Failed host lookup') &&
          !err.contains('Connection refused')) {
        debugPrint('Error fetching unread count: $e');
      }
      return 0;
    }
  }

  // Mark all as read
  Future<bool> markAllAsRead(String collectorId) async {
    try {
      final notifications = await getNotifications(collectorId);
      for (var n in notifications) {
        if (!n.isRead) await markAsRead(n.id);
      }
      return true;
    } catch (_) {
      return false;
    }
  }

  // Delete specific notifications
  Future<bool> deleteNotifications(List<String> ids) async {
    bool allSuccess = true;
    for (var id in ids) {
      try {
        await _db.deleteRow(
          databaseId: appwriteDatabaseId,
          tableId: AppCollections.mobileNotifications,
          rowId: id,
        );
      } catch (e) {
        allSuccess = false;
        debugPrint('Error deleting notification: $e');
      }
    }
    return allSuccess;
  }

  // Clear all notifications
  Future<bool> clearAllNotifications(String collectorId) async {
    try {
      final notifications = await getNotifications(collectorId);
      return await deleteNotifications(notifications.map((n) => n.id).toList());
    } catch (_) {
      return false;
    }
  }
}
