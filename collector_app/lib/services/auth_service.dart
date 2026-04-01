import 'package:appwrite/appwrite.dart';
import 'package:appwrite/models.dart' as models;
import 'package:flutter/foundation.dart';
import '../config/appwrite_config.dart';
import '../models/user_profile.dart';

class AuthService extends ChangeNotifier {
  final Account _account = AppwriteService().account;
  final Databases _databases = AppwriteService().databases;

  UserProfile? _currentProfile;
  models.User? _currentUser;
  bool _isLoading = false;
  String? _error;

  UserProfile? get currentProfile => _currentProfile;
  models.User? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  bool get isLoggedIn => _currentUser != null && _currentProfile != null;
  String? get error => _error;
  String get collectorId => _currentProfile?.id ?? '';

  /// Login with email & password — restricted to collectors only
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Clear any existing session first to prevent "session already active" error
      try {
        await _account.deleteSession(sessionId: 'current');
      } catch (_) {
        // No session to delete, that's fine
      }

      await _account.createEmailPasswordSession(
        email: email,
        password: password,
      );

      final user = await _account.get();
      _currentUser = user;

      // Fetch the user profile
      final profile = await _getUserProfile(user.$id);
      if (profile == null) {
        await _account.deleteSession(sessionId: 'current');
        _error = 'No profile found for this account.';
        _currentUser = null;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      if (profile.role != 'collector') {
        await _account.deleteSession(sessionId: 'current');
        _error = 'Access denied. This app is for collectors only.';
        _currentUser = null;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _currentProfile = profile;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      // Demo mode: allow demo login when Appwrite is not connected
      if (email == 'collector@demo.com' && password == 'demo1234') {
        _currentProfile = UserProfile(
          id: 'demo_collector',
          userId: 'demo_collector',
          firstName: 'Demo',
          lastName: 'Collector',
          phone: '09171234567',
          email: 'collector@demo.com',
          barangay: 'Brgy. Demo',
          city: 'Manila',
          province: 'Metro Manila',
          role: 'collector',
        );
        _isLoading = false;
        notifyListeners();
        return true;
      }
      _error = _parseError(e);
      if (_error == 'Authentication failed.' || _error!.contains('Project')) {
        _error = 'Login failed. Use collector@demo.com / demo1234 for demo mode.';
      }
      _currentUser = null;
      _currentProfile = null;
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  /// Check if a session already exists
  Future<bool> checkSession() async {
    try {
      final user = await _account.get();
      _currentUser = user;
      final profile = await _getUserProfile(user.$id);
      if (profile != null && profile.role == 'collector') {
        _currentProfile = profile;
        notifyListeners();
        return true;
      }
      // Not a collector or no profile
      await _account.deleteSession(sessionId: 'current');
      _currentUser = null;
      return false;
    } catch (_) {
      return false;
    }
  }

  /// Update password
  Future<void> updatePassword(String newPassword, String currentPassword) async {
    await _account.updatePassword(
      password: newPassword,
      oldPassword: currentPassword,
    );
  }

  /// Logout
  Future<void> logout() async {
    try {
      await _account.deleteSession(sessionId: 'current');
    } catch (_) {}
    _currentUser = null;
    _currentProfile = null;
    _error = null;
    notifyListeners();
  }

  Future<UserProfile?> _getUserProfile(String userId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _databases.listDocuments(
        databaseId: appwriteDatabaseId,
        collectionId: AppCollections.usersProfile,
        queries: [Query.equal('userId', userId)],
      );
      if (response.documents.isNotEmpty) {
        return UserProfile.fromJson(response.documents.first.data);
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  String _parseError(dynamic e) {
    if (e is AppwriteException) {
      return e.message ?? 'Authentication failed.';
    }
    return 'Something went wrong. Please try again.';
  }
}
