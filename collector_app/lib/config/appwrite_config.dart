import 'package:appwrite/appwrite.dart';

// ============================================================
// APPWRITE CONFIGURATION
// Replace these with your actual Appwrite project credentials
// ============================================================
const String appwriteEndpoint = 'https://appwrite.springhive.co/v1';
const String appwriteProjectId = '69c4840a0022d6824d83';
const String appwriteDatabaseId = 'wifi_billing_db';

// Collection IDs — must match the web-admin config
class AppCollections {
  static const String usersProfile = 'users_profile';
  static const String wifiPlans = 'wifi_plans';
  static const String subscriptions = 'subscriptions';
  static const String billings = 'billings';
  static const String paymentExtensions = 'payment_extensions';
}

// Singleton Appwrite client
class AppwriteService {
  static final AppwriteService _instance = AppwriteService._internal();
  factory AppwriteService() => _instance;
  AppwriteService._internal();

  late final Client client;
  late final Account account;
  late final Databases databases;

  void init() {
    client = Client()
      ..setEndpoint(appwriteEndpoint)
      ..setProject(appwriteProjectId)
      ..setSelfSigned(status: true); // for dev only

    account = Account(client);
    databases = Databases(client);
  }
}
