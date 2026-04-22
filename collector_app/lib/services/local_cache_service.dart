import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:convert';
import 'dart:async';
import '../config/appwrite_config.dart';

class LocalCacheService {
  static final LocalCacheService _instance = LocalCacheService._internal();
  factory LocalCacheService() => _instance;
  LocalCacheService._internal();

  // Box Names
  static const String boxBillings = 'billings_cache';
  static const String boxPendingPayments = 'pending_payments_queue';
  static const String boxSettings = 'settings_cache';

  late Box<String> billingsBox;
  late Box<String> pendingQueueBox;
  late Box<String> settingsBox;

  final Connectivity _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _connectivitySubscription;

  bool _isInit = false;
  bool get isInitialized => _isInit;

  Future<void> init() async {
    if (_isInit) return;
    
    await Hive.initFlutter();
    
    billingsBox = await Hive.openBox<String>(boxBillings);
    pendingQueueBox = await Hive.openBox<String>(boxPendingPayments);
    settingsBox = await Hive.openBox<String>(boxSettings);
    
    _isInit = true;

    // Listen for connection restoration
    _connectivitySubscription = _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty && results.first != ConnectivityResult.none) {
        // Debounce or slightly delay sync to let network truly settle
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

  // --- Read Cache Operations ---

  /// Save raw JSON billings to local cache
  Future<void> saveBillingsCache(String collectorId, List<Map<String, dynamic>> billings) async {
    if (!_isInit) return;
    try {
      final jsonStr = jsonEncode(billings);
      await billingsBox.put('billings_$collectorId', jsonStr);
    } catch (e) {
      debugPrint('Failed to save billings cache: $e');
    }
  }

  /// Get locally cached billings
  List<Map<String, dynamic>> getBillingsCache(String collectorId) {
    if (!_isInit) return [];
    try {
      final jsonStr = billingsBox.get('billings_$collectorId');
      if (jsonStr != null) {
        final decoded = jsonDecode(jsonStr) as List;
        return decoded.cast<Map<String, dynamic>>();
      }
    } catch (e) {
      debugPrint('Failed to get billings cache: $e');
    }
    return [];
  }

  /// Update a single billing locally so the UI updates while offline
  Future<void> updateBillingInCache(String collectorId, String billingId, Map<String, dynamic> localData) async {
    if (!_isInit) return;
    try {
      final jsonStr = billingsBox.get('billings_$collectorId');
      if (jsonStr != null) {
        final decoded = jsonDecode(jsonStr) as List;
        final billings = decoded.cast<Map<String, dynamic>>();
        
        final idx = billings.indexWhere((b) => b[r'$id'] == billingId);
        if (idx != -1) {
          billings[idx] = {...billings[idx], ...localData};
          await billingsBox.put('billings_$collectorId', jsonEncode(billings));
        }
      }
    } catch (e) {
      debugPrint('Failed to update single billing cache: $e');
    }
  }

  // --- Settings Cache Operations ---
  
  Future<void> saveSetting(String key, String value) async {
    if (!_isInit) return;
    await settingsBox.put(key, value);
  }

  String? getSetting(String key) {
    if (!_isInit) return null;
    return settingsBox.get(key);
  }


  // --- Offline Write Queue Operations ---

  /// Queue a payment update
  Future<void> queuePaymentUpdate(String billingId, Map<String, dynamic> data) async {
    if (!_isInit) return;
    try {
      final timestamp = DateTime.now().toIso8601String();
      final queueItem = {
        'action': 'update_payment',
        'timestamp': timestamp,
        'billingId': billingId,
        'data': data,
      };
      final tempId = 'temp_${DateTime.now().millisecondsSinceEpoch}';
      await pendingQueueBox.put(tempId, jsonEncode(queueItem));
    } catch (e) {
      debugPrint('Failed to queue payment: $e');
    }
  }

  /// Get pending queue
  List<Map<String, dynamic>> getPendingQueue() {
    if (!_isInit) return [];
    List<Map<String, dynamic>> queue = [];
    try {
      for (var key in pendingQueueBox.keys) {
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

  /// Remove item from queue
  Future<void> removeFromQueue(String queueKey) async {
    if (!_isInit) return;
    await pendingQueueBox.delete(queueKey);
  }

  /// Process the pending queue pushing creates/updates to Appwrite
  Future<void> processPendingQueue() async {
    if (!(await isOnline)) return;
    
    final queue = getPendingQueue();
    if (queue.isEmpty) return;
    
    debugPrint('Processing ${queue.length} items in collector offline queue...');
    final db = AppwriteService().tablesDB;
    
    for (var item in queue) {
      if (item['action'] == 'update_payment') {
        try {
          final billingId = item['billingId'] as String;
          final data = item['data'] as Map<String, dynamic>;
          
          // ignore: deprecated_member_use
          await db.updateRow(
            databaseId: appwriteDatabaseId,
            tableId: AppCollections.billings,
            rowId: billingId,
            data: data,
          );
          await removeFromQueue(item['queueKey']);
          debugPrint('Successfully synced offline payment at ${item['timestamp']}');
        } catch (e) {
          debugPrint('Failed to sync payment: $e');
        }
      }
    }
  }
}
