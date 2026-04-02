import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../models/billing.dart';

class BillingService {
  final Databases _databases = AppwriteService().databases;

  Future<List<Billing>> getAssignedBillings(String collectorId) async {
    try {
      // Step 1: Get customers assigned to this collector
      // ignore: deprecated_member_use
      final usersResponse = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.usersProfile,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.equal('role', 'customer'),
          Query.limit(200),
        ],
      );

      if (usersResponse.documents.isEmpty) return [];

      // Step 2: Extract unique customer IDs
      final customerIds = usersResponse.documents
          .map((doc) => doc.data['userId'] as String)
          .where((id) => id.isNotEmpty)
          .toSet()
          .toList();

      if (customerIds.isEmpty) return [];

      // Step 3: Get billing records for those customers
      final List<Billing> allBillings = [];
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
    double? amountPaid,
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

      if (amountPaid != null) {
        data['amountPaid'] = amountPaid;
      }

      // ignore: deprecated_member_use
      await _databases.updateDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.billings,
        documentId: billingId,
        data: data,
      );
    } catch (e) {
      // If an unknown attribute error occurs, retry with minimal fields
      final errMsg = e.toString().toLowerCase();
      if (errMsg.contains('unknown attribute') || errMsg.contains('invalid document')) {
        try {
          final Map<String, dynamic> minimalData = {
            'paymentStatus': status,
          };
          if (status == 'already_paid') {
            minimalData['paidDate'] = DateTime.now().toIso8601String();
          }
          // Try adding collectedBy separately
          try {
            if (collectedBy != null) {
              minimalData['collectedBy'] = collectedBy;
            }
          } catch (_) {}

          // ignore: deprecated_member_use
          await _databases.updateDocument(
            databaseId: appwriteDatabaseId,
            collectionId: AppCollections.billings,
            documentId: billingId,
            data: minimalData,
          );
          return;
        } catch (retryErr) {
          // Last resort: just update paymentStatus and paidDate
          final Map<String, dynamic> basicData = {
            'paymentStatus': status,
          };
          if (status == 'already_paid') {
            basicData['paidDate'] = DateTime.now().toIso8601String();
          }
          // ignore: deprecated_member_use
          await _databases.updateDocument(
            databaseId: appwriteDatabaseId,
            collectionId: AppCollections.billings,
            documentId: billingId,
            data: basicData,
          );
          return;
        }
      }
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
