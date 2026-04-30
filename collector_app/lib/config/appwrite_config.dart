import 'package:appwrite/appwrite.dart';

// ============================================================
// APPWRITE CONFIGURATION
// Replace these with your actual Appwrite project credentials
// ============================================================
const String appwriteEndpoint = 'https://appwrite.springhive.co/v1';
const String appwriteProjectId = '69c4840a0022d6824d83';
const String appwriteApiKey = 'standard_b650468f4a776eac08a7d0f31aea79b5de528e970e85714564a8d0480a9cffc6d0c947aaeaecc2a2011b98c97f90515cbf5f9e16d3cd6230d259d1e91d885a1de14d5c1cb20da10930d49bcc3f3cb7d3f4a5011619cba4e42d533abefbc60435de9ab782c82e59704a44ea08b88f9babd5a6edb83fb50e2bc6f4cb33e1069b6c';
const String appwriteDatabaseId = 'wifi_billing_db';

// Collection IDs — must match the web-admin config
class AppCollections {
  static const String usersProfile = 'users_profile';
  static const String wifiPlans = 'wifi_plans';
  static const String subscriptions = 'subscriptions';
  static const String billings = 'billings';
  static const String paymentExtensions = 'payment_extensions';
  static const String mobileNotifications = 'mobile_notifications';
  static const String notifications = 'notifications';
  static const String repairTickets = 'repair_tickets';
}

// Singleton Appwrite client
class AppwriteService {
  static final AppwriteService _instance = AppwriteService._internal();
  factory AppwriteService() => _instance;
  AppwriteService._internal();

  late final Client client;
  late final Account account;
  late final Databases databases;
  late final TablesDB tablesDB;
  late final Storage storage;
  late final Realtime realtime;

  void init() {
    client = Client()
      ..setEndpoint(appwriteEndpoint)
      ..setProject(appwriteProjectId)
      ..setSelfSigned(status: true); // allow self-signed cert on custom domain

    account = Account(client);
    databases = Databases(client);
    tablesDB = TablesDB(client);
    storage = Storage(client);
    realtime = Realtime(client);
  }
}
