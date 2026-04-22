import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:convert';
import 'dart:async';
import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';

class LocalCacheService {
  static final LocalCacheService _instance = LocalCacheService._internal();
  factory LocalCacheService() => _instance;
  LocalCacheService._internal();

  // Box Names
  static const String boxTickets = 'tickets_cache';
  static const String boxPendingTickets = 'pending_tickets_queue';
  static const String boxNotifications = 'notifications_cache';

  late Box<String> ticketsBox;
  late Box<String> pendingQueueBox;
  late Box<String> notificationsBox;

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  bool _isInit = false;
  bool get isInitialized => _isInit;

  Future<void> init() async {
    if (_isInit) return;

    await Hive.initFlutter();

    ticketsBox = await Hive.openBox<String>(boxTickets);
    pendingQueueBox = await Hive.openBox<String>(boxPendingTickets);
    notificationsBox = await Hive.openBox<String>(boxNotifications);

    _isInit = true;

    // Listen for connection restoration and auto-drain the queue
    _connectivitySubscription = _connectivity.onConnectivityChanged
        .listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty && results.first != ConnectivityResult.none) {
        Future.delayed(const Duration(seconds: 3), () {
          processPendingQueue();
        });
      }
    });
  }

  void dispose() {
    _connectivitySubscription?.cancel();
  }

  Future<bool> get isOnline async {
    final results = await _connectivity.checkConnectivity();
    return results.isNotEmpty && results.first != ConnectivityResult.none;
  }

  // ─────────────────────────────────────────────
  // TICKET CACHE
  // ─────────────────────────────────────────────

  Future<void> saveTicketsCache(
      String technicianId, List<Map<String, dynamic>> tickets) async {
    if (!_isInit) return;
    try {
      await ticketsBox.put('tickets_$technicianId', jsonEncode(tickets));
    } catch (e) {
      debugPrint('Failed to save tickets cache: $e');
    }
  }

  List<Map<String, dynamic>> getTicketsCache(String technicianId) {
    if (!_isInit) return [];
    try {
      final jsonStr = ticketsBox.get('tickets_$technicianId');
      if (jsonStr != null) {
        final decoded = jsonDecode(jsonStr) as List;
        return decoded.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      debugPrint('Failed to get tickets cache: $e');
    }
    return [];
  }

  /// Optimistically apply a field patch to the locally-cached ticket so the
  /// UI reflects the change immediately even while offline.
  Future<void> updateTicketInCache(
      String technicianId, String ticketId, Map<String, dynamic> patch) async {
    if (!_isInit) return;
    try {
      final cached = getTicketsCache(technicianId);
      final idx = cached.indexWhere((t) => t[r'$id'] == ticketId);
      if (idx != -1) {
        cached[idx] = {...cached[idx], ...patch};
        await saveTicketsCache(technicianId, cached);
      }
    } catch (e) {
      debugPrint('Failed to patch ticket in cache: $e');
    }
  }

  // ─────────────────────────────────────────────
  // NOTIFICATION CACHE
  // ─────────────────────────────────────────────

  Future<void> saveNotificationsCache(
      String technicianId, List<Map<String, dynamic>> notifications) async {
    if (!_isInit) return;
    try {
      await notificationsBox.put(
          'notifications_$technicianId', jsonEncode(notifications));
    } catch (e) {
      debugPrint('Failed to save notifications cache: $e');
    }
  }

  List<Map<String, dynamic>> getNotificationsCache(String technicianId) {
    if (!_isInit) return [];
    try {
      final jsonStr = notificationsBox.get('notifications_$technicianId');
      if (jsonStr != null) {
        final decoded = jsonDecode(jsonStr) as List;
        return decoded.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      debugPrint('Failed to get notifications cache: $e');
    }
    return [];
  }

  /// Patch a single notification (e.g. flip isRead) in the cache.
  Future<void> updateNotificationInCache(
      String technicianId, String notifId, Map<String, dynamic> patch) async {
    if (!_isInit) return;
    try {
      final cached = getNotificationsCache(technicianId);
      final idx = cached.indexWhere((n) => n[r'$id'] == notifId);
      if (idx != -1) {
        cached[idx] = {...cached[idx], ...patch};
        await saveNotificationsCache(technicianId, cached);
      }
    } catch (e) {
      debugPrint('Failed to patch notification in cache: $e');
    }
  }

  // ─────────────────────────────────────────────
  // OFFLINE WRITE QUEUE
  // ─────────────────────────────────────────────

  Future<void> _enqueue(Map<String, dynamic> item) async {
    if (!_isInit) return;
    try {
      final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
      item['timestamp'] ??= DateTime.now().toIso8601String();
      await pendingQueueBox.put(tempId, jsonEncode(item));
    } catch (e) {
      debugPrint('Failed to enqueue: $e');
    }
  }

  /// Queue a new ticket creation.
  Future<void> queueTicketCreation(Map<String, dynamic> data) async =>
      _enqueue({'action': 'create_ticket', 'data': data});

  /// Queue a ticket field update (status, priority, notes, etc.).
  Future<void> queueTicketUpdate(
      String ticketId, Map<String, dynamic> data) async =>
      _enqueue({'action': 'update_ticket', 'ticketId': ticketId, 'data': data});

  List<Map<String, dynamic>> getPendingQueue() {
    if (!_isInit) return [];
    final queue = <Map<String, dynamic>>[];
    try {
      for (final key in pendingQueueBox.keys) {
        final val = pendingQueueBox.get(key);
        if (val != null) {
          final item = jsonDecode(val) as Map<String, dynamic>;
          item['queueKey'] = key;
          queue.add(item);
        }
      }
    } catch (e) {
      debugPrint('Error reading pending queue: $e');
    }
    return queue;
  }

  Future<void> removeFromQueue(String queueKey) async {
    if (!_isInit) return;
    await pendingQueueBox.delete(queueKey);
  }

  /// Drain the queue to Appwrite when back online.
  Future<void> processPendingQueue() async {
    if (!(await isOnline)) return;

    final queue = getPendingQueue();
    if (queue.isEmpty) return;

    debugPrint('Processing ${queue.length} items in technician offline queue...');
    final db = AppwriteService().tablesDB;

    for (final item in queue) {
      try {
        switch (item['action']) {
          case 'create_ticket':
            final data = item['data'] as Map<String, dynamic>;
            await db.createRow(
              databaseId: appwriteDatabaseId,
              tableId: 'repair_tickets',
              rowId: ID.unique(),
              data: data,
            );
            break;

          case 'update_ticket':
            final ticketId = item['ticketId'] as String;
            final data = item['data'] as Map<String, dynamic>;
            // Skip temp IDs that were never actually persisted
            if (ticketId.startsWith('temp_')) break;
            await db.updateRow(
              databaseId: appwriteDatabaseId,
              tableId: 'repair_tickets',
              rowId: ticketId,
              data: data,
            );
            break;
        }

        await removeFromQueue(item['queueKey']);
        debugPrint(
            'Synced offline item [${item['action']}] from ${item['timestamp']}');
      } catch (e) {
        debugPrint('Failed to sync queue item [${item['action']}]: $e');
      }
    }
  }
}
