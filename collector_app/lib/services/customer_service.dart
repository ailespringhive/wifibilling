import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../models/user_profile.dart';
import '../models/subscription_model.dart';

class CustomerService {
  final TablesDB _db = AppwriteService().tablesDB;

  /// Get all customers with active subscriptions (visible to all collectors)
  Future<List<UserProfile>> getAssignedCustomers(String collectorId) async {
    try {
      // Step 1: Get all active subscriptions (no collector filter)
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
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            return map['customerId'] as String;
          })
          .toSet()
          .toList();

      // Step 3: Fetch customer profiles
      final List<UserProfile> customers = [];
      // ignore: deprecated_member_use
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.usersProfile,
        queries: [
          Query.equal('userId', customerIds),
          Query.limit(200),
        ],
      );

      for (final doc in response.rows) {
        final map = Map<String, dynamic>.from(doc.data as Map);
        map[r'$id'] = doc.$id;
        map[r'$createdAt'] = doc.$createdAt;
        customers.add(UserProfile.fromJson(map));
      }

      return customers;
    } catch (e) {
      throw Exception('Failed to load customers: $e');
    }
  }

  /// Get a single customer by document ID
  Future<UserProfile?> getCustomerById(String documentId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _db.getRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.usersProfile,
        rowId: documentId,
      );
      final map = Map<String, dynamic>.from(response.data as Map);
      map[r'$id'] = response.$id;
      map[r'$createdAt'] = response.$createdAt;
      return UserProfile.fromJson(map);
    } catch (_) {
      return null;
    }
  }

  /// Get subscriptions for a collector (with plan and customer info)
  Future<List<SubscriptionModel>> getCollectorSubscriptions(
      String collectorId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.subscriptions,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.limit(100),
        ],
      );

      return response.rows
          .map((doc) {
            final map = Map<String, dynamic>.from(doc.data as Map);
            map[r'$id'] = doc.$id;
            return SubscriptionModel.fromJson(map);
          })
          .toList();
    } catch (e) {
      throw Exception('Failed to load subscriptions: $e');
    }
  }
}
