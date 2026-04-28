import 'package:appwrite/appwrite.dart';
import 'package:flutter/foundation.dart';
import '../config/appwrite_config.dart';
import '../models/billing.dart';

class BillingService {
  final TablesDB _db = AppwriteService().tablesDB;

  /// Get all billings for customers assigned to this collector
  /// We first get subscription IDs where collectorId matches,
  /// then get billings for those customer IDs.
  Future<List<Billing>> getAssignedBillings(String collectorId) async {
    try {
      // Step 1: Get subscriptions assigned to this collector
      // ignore: deprecated_member_use
      final subsResponse = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.subscriptions,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.limit(100),
        ],
      );

      if (subsResponse.rows.isEmpty) return [];

      // Step 2: Extract unique customer IDs
      final customerIds = subsResponse.rows
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            return map['customerId'] as String;
          })
          .toSet()
          .toList();

      // Step 3: Get billing records for those customers
      final List<Billing> allBillings = [];
      // Appwrite Query.equal supports arrays for OR matching
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
        final map = Map<String, dynamic>.from(doc.data as Map);
        map[r'$id'] = doc.$id;
        allBillings.add(Billing.fromJson(map));
      }

      return _autoCheckOverdue(allBillings);
    } catch (e) {
      throw Exception('Failed to load billings: $e');
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
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            map[r'$id'] = doc.$id;
            return Billing.fromJson(map);
          })
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
  }) async {
    try {
      final Map<String, dynamic> data = {
        'paymentStatus': status,
      };

      if (status == 'already_paid') {
        data['paidDate'] = DateTime.now().toIso8601String();
      }

      if (collectedBy != null) {
        data['collectedBy'] = collectedBy;
      }

      // ignore: deprecated_member_use
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        rowId: billingId,
        data: data,
      );
    } catch (e) {
      throw Exception('Failed to update billing status: $e');
    }
  }

  /// Get count of billings by status for a given set of customer IDs
  Future<Map<String, int>> getStatusCounts(List<String> customerIds) async {
    final counts = <String, int>{
      'not_yet_paid': 0,
      'already_paid': 0,
      'overdue': 0,
    };

    if (customerIds.isEmpty) return counts;

    try {
      for (final status in counts.keys.toList()) {
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
    } catch (_) {}

    return counts;
  }

  /// Get collections made by this collector
  Future<List<Billing>> getCollectionHistory(String collectorProfileId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        queries: [
          Query.equal('collectedBy', collectorProfileId),
          Query.equal('paymentStatus', 'already_paid'),
          Query.orderDesc('paidDate'),
          Query.limit(100),
        ],
      );

      return response.rows
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            map[r'$id'] = doc.$id;
            return Billing.fromJson(map);
          })
          .toList();
    } catch (e) {
      throw Exception('Failed to load collection history: $e');
    }
  }

  /// Get all billings (for technician view)
  Future<List<Billing>> getAllBillings() async {
    try {
      // ignore: deprecated_member_use
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.billings,
        queries: [
          Query.orderDesc('billingMonth'),
          Query.limit(500), // Adjust limit based on your scale
        ],
      );

      final result = response.rows
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            map[r'$id'] = doc.$id;
            return Billing.fromJson(map);
          })
          .toList();
      return _autoCheckOverdue(result);
    } catch (e) {
      throw Exception('Failed to load all billings: $e');
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
                 debugPrint('Failed to auto-update overdue status: $e');
               });
            }
          } catch (_) {}
       }
    }
    return billings;
  }
}
