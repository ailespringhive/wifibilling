import 'package:appwrite/appwrite.dart';
import '../config/appwrite_config.dart';
import '../models/user_profile.dart';
import '../models/subscription_model.dart';

class CustomerService {
  final Databases _databases = AppwriteService().databases;

  /// Get all customers assigned to this collector via subscriptions
  Future<List<UserProfile>> getAssignedCustomers(String collectorId) async {
    try {
      // Step 1: Get subscriptions where collectorId matches
      // ignore: deprecated_member_use
      final subsResponse = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.subscriptions,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.equal('status', 'active'),
          Query.limit(100),
        ],
      );

      if (subsResponse.documents.isEmpty) return [];

      // Step 2: Extract unique customer IDs
      final customerIds = subsResponse.documents
          .map((doc) => doc.data['customerId'] as String)
          .toSet()
          .toList();

      // Step 3: Fetch customer profiles
      final List<UserProfile> customers = [];
      // Fetch in batches if needed; Appwrite Query.equal supports arrays
      // ignore: deprecated_member_use
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.usersProfile,
        queries: [
          Query.equal('userId', customerIds),
          Query.limit(100),
        ],
      );

      for (final doc in response.documents) {
        customers.add(UserProfile.fromJson(doc.data));
      }

      return customers;
    } catch (e) {
      throw Exception('Failed to load assigned customers: $e');
    }
  }

  /// Get a single customer by document ID
  Future<UserProfile?> getCustomerById(String documentId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _databases.getDocument(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.usersProfile,
        documentId: documentId,
      );
      return UserProfile.fromJson(response.data);
    } catch (_) {
      return null;
    }
  }

  /// Get subscriptions for a collector (with plan and customer info)
  Future<List<SubscriptionModel>> getCollectorSubscriptions(
      String collectorId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.subscriptions,
        queries: [
          Query.equal('collectorId', collectorId),
          Query.limit(100),
        ],
      );

      return response.documents
          .map((doc) => SubscriptionModel.fromJson(doc.data))
          .toList();
    } catch (e) {
      throw Exception('Failed to load subscriptions: $e');
    }
  }
}
