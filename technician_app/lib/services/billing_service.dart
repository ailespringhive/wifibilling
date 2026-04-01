import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../models/billing.dart';

class BillingService {
  final Databases _databases = AppwriteService().databases;

  /// Get all billings for customers assigned to this collector
  /// We first get subscription IDs where collectorId matches,
  /// then get billings for those customer IDs.
  Future<List<Billing>> getAssignedBillings(String collectorId) async {
    try {
      // Step 1: Get subscriptions assigned to this collector
      // ignore: deprecated_member_use
      final subsResponse = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.subscriptions,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.limit(100),
        ],
      );

      if (subsResponse.documents.isEmpty) return [];

      // Step 2: Extract unique customer IDs
      final customerIds = subsResponse.documents
          .map((doc) => doc.data['customerId'] as String)
          .toSet()
          .toList();

      // Step 3: Get billing records for those customers
      final List<Billing> allBillings = [];
      // Appwrite Query.equal supports arrays for OR matching
      // ignore: deprecated_member_use
      final billingsResponse = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.billings,
        queries: [
          Query.equal('customerId', customerIds),
          Query.orderDesc('\$createdAt'),
          Query.limit(200),
        ],
      );

      for (final doc in billingsResponse.documents) {
        allBillings.add(Billing.fromJson(doc.data));
      }

      return allBillings;
    } catch (e) {
      throw Exception('Failed to load billings: $e');
    }
  }

  /// Get billings for a specific customer
  Future<List<Billing>> getBillingsByCustomer(String customerId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.billings,
        queries: [
          Query.equal('customerId', customerId),
          Query.orderDesc('billingMonth'),
          Query.limit(50),
        ],
      );

      return response.documents
          .map((doc) => Billing.fromJson(doc.data))
          .toList();
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
      await _databases.updateDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.billings,
        documentId: billingId,
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
      'payment_confirmation': 0,
    };

    if (customerIds.isEmpty) return counts;

    try {
      for (final status in counts.keys.toList()) {
        // ignore: deprecated_member_use
        final response = await _databases.listDocuments(
          databaseId: appwriteDatabaseId,
          collectionId: AppCollections.billings,
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
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.billings,
        queries: [
          Query.equal('collectedBy', collectorProfileId),
          Query.equal('paymentStatus', 'already_paid'),
          Query.orderDesc('paidDate'),
          Query.limit(100),
        ],
      );

      return response.documents
          .map((doc) => Billing.fromJson(doc.data))
          .toList();
    } catch (e) {
      throw Exception('Failed to load collection history: $e');
    }
  }
}
