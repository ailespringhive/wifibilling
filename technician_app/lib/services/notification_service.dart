import 'package:appwrite/appwrite.dart';
import 'package:flutter/foundation.dart';
import '../config/appwrite_config.dart';
import '../models/notification_model.dart';
import 'local_cache_service.dart';

class NotificationService {
  final TablesDB _db = AppwriteService().tablesDB;

  // ─────────────────────────────────────────────
  // FETCH (cache-first, network-refresh)
  // ─────────────────────────────────────────────

  Future<List<TechnicianNotification>> getNotifications(
    String technicianId, {
    int limit = 100,
    int offset = 0,
  }) async {
    final cache = LocalCacheService();
    final online = await cache.isOnline;

    // Always return cached list first so the screen is never empty offline
    if (!online) {
      debugPrint('Offline: loading notifications from cache.');
      return _fromCache(cache, technicianId);
    }

    try {
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('technicianId', technicianId),
          Query.orderDesc(r'$createdAt'),
          Query.limit(limit),
          Query.offset(offset),
        ],
      );

      final rawList = response.rows.map((doc) {
        final map = Map<String, dynamic>.from(doc.data as Map);
        map[r'$id'] = doc.$id;
        map[r'$createdAt'] = doc.$createdAt;
        return map;
      }).toList();

      // Persist fresh copy to cache
      await cache.saveNotificationsCache(technicianId, rawList);

      return rawList
          .map(TechnicianNotification.fromMap)
          .where((n) => n.type == 'repair' || n.type == 'assignment')
          .toList();
    } catch (e) {
      final err = e.toString();
      if (!err.contains('Software caused connection abort') && 
          !err.contains('Failed host lookup') &&
          !err.contains('Connection refused')) {
        debugPrint('Error fetching notifications: $e — falling back to cache.');
      }
      return _fromCache(cache, technicianId);
    }
  }

  List<TechnicianNotification> _fromCache(
      LocalCacheService cache, String technicianId) {
    return cache
        .getNotificationsCache(technicianId)
        .map(TechnicianNotification.fromMap)
        .where((n) => n.type == 'repair' || n.type == 'assignment')
        .toList();
  }

  // ─────────────────────────────────────────────
  // MARK READ
  // ─────────────────────────────────────────────

  Future<bool> markAsRead(String notificationId,
      {String technicianId = ''}) async {
    // Optimistically patch cache so re-render is instant
    final cache = LocalCacheService();
    if (technicianId.isNotEmpty) {
      await cache.updateNotificationInCache(
          technicianId, notificationId, {'isRead': true});
    }

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
      // Cache patch already done, so UI stays correct; will resync on next load
      return false;
    }
  }

  Future<void> markAllAsRead(String technicianId) async {
    final cache = LocalCacheService();
    final online = await cache.isOnline;

    // Patch all unread entries in cache regardless of connectivity
    final cached = cache.getNotificationsCache(technicianId);
    for (final n in cached) {
      if (n['isRead'] == false) {
        n['isRead'] = true;
      }
    }
    await cache.saveNotificationsCache(technicianId, cached);

    if (!online) {
      debugPrint('Offline: markAllAsRead applied only to cache.');
      return;
    }

    try {
      final unread = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('technicianId', technicianId),
          Query.limit(100),
        ],
      );

      final unreadDocs =
          unread.rows.where((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            return map['isRead'] == false;
          }).toList();
      for (final doc in unreadDocs) {
        await markAsRead(doc.$id);
      }
    } catch (e) {
      debugPrint('Error in markAllAsRead: $e');
    }
  }

  // ─────────────────────────────────────────────
  // DELETE
  // ─────────────────────────────────────────────

  Future<void> clearAll(String technicianId) async {
    // Clear cache immediately
    final cache = LocalCacheService();
    await cache.saveNotificationsCache(technicianId, []);

    try {
      final all = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('technicianId', technicianId),
          Query.limit(100),
        ],
      );
      for (final doc in all.rows) {
        try {
          await _db.deleteRow(
            databaseId: appwriteDatabaseId,
            tableId: AppCollections.mobileNotifications,
            rowId: doc.$id,
          );
        } catch (_) {}
      }
    } catch (e) {
      debugPrint('Error clearing notifications: $e');
    }
  }

  Future<void> deleteNotifications(List<String> ids,
      {String technicianId = ''}) async {
    // Remove from cache first
    if (technicianId.isNotEmpty) {
      final cache = LocalCacheService();
      final cached = cache
          .getNotificationsCache(technicianId)
          .where((n) => !ids.contains(n[r'$id']))
          .toList();
      await cache.saveNotificationsCache(technicianId, cached);
    }

    for (final id in ids) {
      try {
        await _db.deleteRow(
          databaseId: appwriteDatabaseId,
          tableId: AppCollections.mobileNotifications,
          rowId: id,
        );
      } catch (_) {}
    }
  }

  // ─────────────────────────────────────────────
  // UNREAD COUNT (cache-first)
  // ─────────────────────────────────────────────

  Future<int> getUnreadCount(String technicianId) async {
    final cache = LocalCacheService();
    final online = await cache.isOnline;

    if (!online) {
      return cache
          .getNotificationsCache(technicianId)
          .map(TechnicianNotification.fromMap)
          .where((n) =>
              !n.isRead && (n.type == 'repair' || n.type == 'assignment'))
          .length;
    }

    try {
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.mobileNotifications,
        queries: [
          Query.equal('technicianId', technicianId),
          Query.limit(100),
        ],
      );

      final rawList = response.rows.map((doc) {
        final map = Map<String, dynamic>.from(doc.data as Map);
        map[r'$id'] = doc.$id;
        map[r'$createdAt'] = doc.$createdAt;
        return map;
      }).toList();

      // Keep cache fresh while we're here
      await cache.saveNotificationsCache(technicianId, rawList);

      return rawList
          .map(TechnicianNotification.fromMap)
          .where((n) =>
              !n.isRead && (n.type == 'repair' || n.type == 'assignment'))
          .length;
    } catch (e) {
      final err = e.toString();
      if (!err.contains('Software caused connection abort') && 
          !err.contains('Failed host lookup') &&
          !err.contains('Connection refused')) {
        debugPrint('Error fetching unread count: $e');
      }
      
      return cache
          .getNotificationsCache(technicianId)
          .map(TechnicianNotification.fromMap)
          .where((n) =>
              !n.isRead && (n.type == 'repair' || n.type == 'assignment'))
          .length;
    }
  }
}
