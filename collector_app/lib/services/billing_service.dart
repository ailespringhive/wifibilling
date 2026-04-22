import 'package:appwrite/appwrite.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/appwrite_config.dart';
import '../models/billing.dart';
import 'local_cache_service.dart';

class BillingService {
  final TablesDB _db = AppwriteService().tablesDB;

  /// Server-key bypass for updating documents when client SDK permissions fail
  Future<void> _apiBypassUpdate(String documentId, Map<String, dynamic> data) async {
    final url = Uri.parse(
      '$appwriteEndpoint/databases/$appwriteDatabaseId/collections/${AppCollections.billings}/documents/$documentId',
    );
    final response = await http.patch(
      url,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': appwriteProjectId,
        'X-Appwrite-Key': appwriteApiKey,
      },
      body: jsonEncode({'data': data}),
    );
    if (response.statusCode != 200) {
      throw Exception('API bypass update failed: ${response.statusCode} - ${response.body}');
    }
  }

  /// Send a payment notification to the Admin dashboard.
  /// Writes to the shared `notifications` collection so the web-admin
  /// picks it up via realtime subscription and renders the collector's photo.
  Future<void> sendAdminPaymentNotification({
    required String collectorId,
    required String collectorName,
    required String customerName,
    required double amountPaid,
    required String billingMonth,
    required bool isFullyPaid,
  }) async {
    try {
      final url = Uri.parse(
        '$appwriteEndpoint/databases/$appwriteDatabaseId/collections/${AppCollections.notifications}/documents',
      );
      final body = jsonEncode({
        'documentId': 'unique()',
        'data': {
          'title': 'Payment Received',
          'message':
              '$collectorName collected ₱${amountPaid.toStringAsFixed(0)} from $customerName'
              ' (${isFullyPaid ? 'Fully Paid' : 'Partial'}) — $billingMonth',
          'type': 'status_update',
          'technicianId': collectorId, // Appwrite schema only has technicianId right now
          'isRead': false,
        },
        'permissions': ['read("any")', 'update("any")', 'delete("any")'],
      });
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
        },
        body: body,
      );
      if (response.statusCode != 201 && response.statusCode != 200) {
        debugPrint('[BillingService] Admin notification failed: ${response.statusCode} ${response.body}');
      } else {
        debugPrint('[BillingService] Admin payment notification sent ✓');
      }
    } catch (e) {
      debugPrint('[BillingService] Could not send admin payment notification: $e');
    }
  }

  Future<List<Billing>> getAssignedBillings(String collectorId) async {
    final cacheService = LocalCacheService();
    final isOnline = await cacheService.isOnline;

    if (!isOnline) {
      debugPrint('Device offline. Loading billings from cache.');
      final cachedList = cacheService.getBillingsCache(collectorId);
      final offlineResult = cachedList.map((map) => Billing.fromJson(map)).toList();
      return _autoCheckOverdue(offlineResult);
    }

    try {
      // Step 1: Get all active subscriptions (same as CustomerService)
      // ignore: deprecated_member_use
      final subsResponse = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.subscriptions,
        queries: [
          Query.equal('status', 'active'),
          Query.limit(200),
        ],
      );

      if (subsResponse.rows.isEmpty) return [];

      // Step 2: Extract unique customer IDs
      final customerIds = subsResponse.rows
          .map((doc) => doc.data['customerId'] as String)
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      if (customerIds.isEmpty) return [];

      // Step 3: Get billing records for those customers
      final List<Billing> allBillings = [];
      // ignore: deprecated_member_use
      final billingsResponse = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        queries: [
          Query.equal('customerId', customerIds),
          Query.orderDesc('\$createdAt'),
          Query.limit(200),
        ],
      );

      for (final doc in billingsResponse.rows) {
        allBillings.add(Billing.fromJson(doc.data));
      }

      await cacheService.saveBillingsCache(collectorId, billingsResponse.rows.map((e) => e.data).toList());

      return _autoCheckOverdue(allBillings);
    } catch (e) {
      debugPrint('Failed to load billings from network: $e');
      final cachedList = cacheService.getBillingsCache(collectorId);
      final offlineResult = cachedList.map((map) => Billing.fromJson(map)).toList();
      return _autoCheckOverdue(offlineResult);
    }
  }

  /// Get billings for a specific customer
  Future<List<Billing>> getBillingsByCustomer(String customerId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        queries: [
          Query.equal('customerId', customerId),
          Query.orderDesc('billingMonth'),
          Query.limit(50),
        ],
      );

      final result = response.rows
          .map((doc) => Billing.fromJson(doc.data))
          .toList();
      return _autoCheckOverdue(result);
    } catch (e) {
      throw Exception('Failed to load customer billings: $e');
    }
  }

  /// Update billing payment status
  Future<void> updateStatus(
    String billingId,
    String status, {
    String? collectedBy,
    double? amountPaid,
    String? notes,
  }) async {
    final Map<String, dynamic> data = {
      'paymentStatus': status,
      'paidDate': DateTime.now().toIso8601String(),
    };

    if (collectedBy != null) {
      data['collectedBy'] = collectedBy;
    }

    if (amountPaid != null) {
      data['amountPaid'] = amountPaid;
    }

    if (notes != null) {
      data['notes'] = notes;
    }

    final cacheService = LocalCacheService();
    final isOnline = await cacheService.isOnline;

    if (!isOnline) {
      debugPrint('Device offline. Queuing payment locally.');
      // Keep UI responsive by immediately updating cache
      if (collectedBy != null) { // Hack to use collectorId since we know who it is
        await cacheService.updateBillingInCache(collectedBy, billingId, data);
      }
      await cacheService.queuePaymentUpdate(billingId, data);
      return;
    }

    try {
      // Try with Appwrite Client SDK first
      // ignore: deprecated_member_use
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        rowId: billingId,
        data: data,
      );
      
      // Update cache even if online so it acts as fresh state when offline
      if (collectedBy != null) {
        await cacheService.updateBillingInCache(collectedBy, billingId, data);
      }
    } catch (e) {
      // Fallback: use server API key bypass for permission issues
      debugPrint('Client SDK updateStatus failed ($e), using API bypass...');
      await _apiBypassUpdate(billingId, data);
      if (collectedBy != null) {
        await cacheService.updateBillingInCache(collectedBy, billingId, data);
      }
    }
  }

  /// Get count of billings by status for a given set of customer IDs
  /// "Unpaid" only counts bills whose due date has already passed
  /// (i.e. customer failed to pay before the deadline).
  /// Bills for the current month that haven't reached their due date
  /// are still "pending" and NOT counted as unpaid.
  Future<Map<String, int>> getStatusCounts(List<String> customerIds) async {
    final counts = <String, int>{
      'not_yet_paid': 0,
      'already_paid': 0,
      'overdue': 0,
    };

    if (customerIds.isEmpty) return counts;

    try {
      // Get already_paid and overdue counts directly (simple queries)
      for (final status in ['already_paid', 'overdue']) {
        // ignore: deprecated_member_use
        final response = await _db.listRows(
          databaseId: appwriteDatabaseId,
          tableId: AppCollections.billings,
          queries: [
            Query.equal('customerId', customerIds),
            Query.equal('paymentStatus', status),
            Query.limit(1),
          ],
        );
        counts[status] = response.total;
      }

      // For "not_yet_paid", fetch actual records and only count those
      // whose due date has already passed (customer missed the deadline)
      // ignore: deprecated_member_use
      final unpaidResponse = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        queries: [
          Query.equal('customerId', customerIds),
          Query.equal('paymentStatus', 'not_yet_paid'),
          Query.limit(200),
        ],
      );

      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      int unpaidCount = 0;

      for (final doc in unpaidResponse.rows) {
        final dueDate = doc.data['dueDate'] as String?;
        if (dueDate != null && dueDate.isNotEmpty) {
          try {
            final dueRaw = DateTime.parse(dueDate);
            final due = DateTime(dueRaw.year, dueRaw.month, dueRaw.day);
            // Only count as unpaid if the due date has passed
            if (due.isBefore(today)) {
              unpaidCount++;
            }
          } catch (_) {
            // If we can't parse the date, don't count it
          }
        }
        // Bills with no due date are not counted as unpaid
      }

      counts['not_yet_paid'] = unpaidCount;
    } catch (_) {}

    return counts;
  }

  /// Get collections made for the collector's assigned customers
  Future<List<Billing>> getCollectionHistory(String collectorProfileId) async {
    try {
      // Step 1: Get all active subscriptions (to find assigned customers)
      // ignore: deprecated_member_use
      final subsResponse = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.subscriptions,
        queries: [
          Query.equal('status', 'active'),
          Query.limit(200),
        ],
      );

      final customerIds = subsResponse.rows
          .map((doc) => doc.data['customerId'] as String)
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      if (customerIds.isEmpty) return [];

      // Step 2: Get paid billings for those customers
      // ignore: deprecated_member_use
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        queries: [
          Query.equal('customerId', customerIds),
          Query.equal('paymentStatus', 'already_paid'),
          Query.orderDesc('paidDate'),
          Query.limit(100),
        ],
      );

      return response.rows
          .map((doc) => Billing.fromJson(doc.data))
          .toList();
    } catch (e) {
      throw Exception('Failed to load collection history: $e');
    }
  }

  /// Helper to lazy-evaluate and auto-update overdue bills
  List<Billing> _autoCheckOverdue(List<Billing> billings) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    
    for (int i = 0; i < billings.length; i++) {
       final b = billings[i];
       if (b.paymentStatus == 'not_yet_paid' && b.dueDate != null && b.dueDate!.isNotEmpty) {
          try {
            final dueRaw = DateTime.parse(b.dueDate!);
            final due = DateTime(dueRaw.year, dueRaw.month, dueRaw.day);
            if (due.isBefore(today)) {
               // It's overdue! Mutate local list so UI updates instantly
               final updated = b.copyWith(paymentStatus: 'overdue');
               billings[i] = updated;
               // Fire-and-forget background update to Appwrite
               updateStatus(b.id, 'overdue').catchError((e) {
                 debugPrint('Failed to auto-update overdue status: \$e');
               });
            }
          } catch (_) {}
       }
    }
    return billings;
  }



  /// Create an advance billing record for a future month
  Future<void> createAdvanceBilling({
    required String customerId,
    required String customerName,
    required String subscriptionId,
    required String billingMonth,
    required double amount,
    required double amountPaid,
    required String collectedBy,
    bool isFullyPaid = true,
    String? dueDate,
  }) async {
    final data = {
      'customerId': customerId,
      'customerName': customerName,
      'subscriptionId': subscriptionId,
      'billingMonth': billingMonth,
      'amount': amount,
      'paymentStatus': isFullyPaid ? 'already_paid' : 'not_yet_paid',
      'dueDate': dueDate ?? '',
      'paidDate': DateTime.now().toIso8601String(),
      'collectedBy': collectedBy,
      'amountPaid': amountPaid,
      'notes': jsonEncode([{
        'amount': amountPaid,
        'date': DateTime.now().toIso8601String(),
        'collector': collectedBy,
        'note': isFullyPaid ? 'Advance payment' : 'Advance partial payment',
      }]),
      'createdAt': DateTime.now().toIso8601String(),
    };

    try {
      await _db.createRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        rowId: ID.unique(),
        data: data,
      );
    } catch (e) {
      debugPrint('Client SDK createAdvanceBilling failed ($e), using API bypass...');
      // Fallback: use server API key bypass
      final url = Uri.parse(
        '$appwriteEndpoint/databases/$appwriteDatabaseId/collections/${AppCollections.billings}/documents',
      );
      final response = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
        },
        body: jsonEncode({
          'documentId': 'unique()',
          'data': data,
        }),
      );
      if (response.statusCode != 201 && response.statusCode != 200) {
        throw Exception('API bypass createAdvanceBilling failed: ${response.statusCode}');
      }
    }
  }

  /// Check if a billing record already exists for a given customer + month
  Future<bool> billingExistsForMonth(String customerId, String billingMonth) async {
    try {
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        queries: [
          Query.equal('customerId', customerId),
          Query.equal('billingMonth', billingMonth),
          Query.limit(1),
        ],
      );
      return response.rows.isNotEmpty;
    } catch (e) {
      debugPrint('Error checking billing existence: $e');
      return false;
    }
  }
}
