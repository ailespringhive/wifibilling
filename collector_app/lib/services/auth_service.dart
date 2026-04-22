import 'package:appwrite/appwrite.dart';
import 'package:appwrite/models.dart' as models;
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/appwrite_config.dart';
import '../models/user_profile.dart';

class AuthService extends ChangeNotifier {
  final Account _account = AppwriteService().account;
  final TablesDB _db = AppwriteService().tablesDB;
  final Storage _storage = AppwriteService().storage;

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
    SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());

    try {
      // Try to create a new session
      try {
        await _account.createEmailPasswordSession(
          email: email,
          password: password,
        );
      } catch (e) {
        // If session already exists, try to use it
        if (e is AppwriteException && (e.code == 401 || e.message?.contains('session') == true)) {
          // Session might already be active, try to use existing
          try {
            await _account.deleteSession(sessionId: 'current');
            await _account.createEmailPasswordSession(
              email: email,
              password: password,
            );
          } catch (_) {
            rethrow;
          }
        } else {
          rethrow;
        }
      }

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
      // Defer notify to next frame so LoginScreen finishes its current build
      // before AuthGate tears it down — prevents framework.dart assertions
      SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
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
        SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
        return true;
      }
      _error = _parseError(e);
      if (_error == 'Authentication failed.' || _error!.contains('Project')) {
        _error = 'Login failed. Use collector@demo.com / demo1234 for demo mode.';
      }
      _currentUser = null;
      _currentProfile = null;
      _isLoading = false;
      SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
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
        SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
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
    SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
  }

  /// Upload new avatar and update profile
  Future<void> uploadAvatarAndSave(XFile image) async {
    if (_currentProfile == null) return;
    try {
      final safeFilename = (image.name.isEmpty) ? 'avatar_${ID.unique()}.jpg' : image.name;
      String newImageUrl = '';
      
      try {
        final file = await _storage.createFile(
          bucketId: 'customer_images', // using the same bucket as web for profiles
          fileId: ID.unique(),
          file: InputFile.fromPath(
            path: image.path,
            filename: safeFilename,
          ),
        );
        newImageUrl = '$appwriteEndpoint/storage/buckets/customer_images/files/${file.$id}/view?project=$appwriteProjectId';
      } catch (e) {
        // Appwrite SDK usually crashes on Web here. Silently catch it and route to HTTP bypass.
        
        // Execute HTTP bypass logic identical to Technician App
        final uri = Uri.parse('$appwriteEndpoint/storage/buckets/customer_images/files');
        final request = http.MultipartRequest('POST', uri);
        request.headers['X-Appwrite-Project'] = appwriteProjectId;
        request.headers['X-Appwrite-Key'] = appwriteApiKey;
        request.fields['fileId'] = ID.unique();
        
        final bytes = await image.readAsBytes();
        request.files.add(http.MultipartFile.fromBytes(
          'file',
          bytes,
          filename: safeFilename,
        ));
        
        final response = await request.send();
        if (response.statusCode == 201) {
          final body = await response.stream.bytesToString();
          final jsonResp = jsonDecode(body);
          final fileId = jsonResp[r'$id'];
          newImageUrl = '$appwriteEndpoint/storage/buckets/customer_images/files/$fileId/view?project=$appwriteProjectId';
        } else {
          final body = await response.stream.bytesToString();
          throw Exception('HTTP bypass failed: ${response.statusCode} - $body');
        }
      }

      // Update document using proper document ID instead of collection search
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.usersProfile,
        rowId: _currentProfile!.id,
        data: {'profileImage': newImageUrl},
      );

      // Refresh local profile state
      final updatedProfile = await _getUserProfile(_currentProfile!.userId);
      if (updatedProfile != null) {
        _currentProfile = updatedProfile;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Avatar upload failed: $e');
      rethrow;
    }
  }
  Future<void> updateProfile(Map<String, dynamic> data) async {
    if (_currentProfile == null) return;
    try {
      await _db.updateRow(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.usersProfile,
        rowId: _currentProfile!.id,
        data: data,
      );
      // Refresh local profile state
      final updatedProfile = await _getUserProfile(_currentProfile!.userId);
      if (updatedProfile != null) {
        _currentProfile = updatedProfile;
        notifyListeners();
      }
    } catch (e) {
      debugPrint('Profile update failed: $e');
      rethrow;
    }
  }

  Future<UserProfile?> _getUserProfile(String userId) async {
    try {
      // ignore: deprecated_member_use
      final response = await _db.listRows(
        databaseId: appwriteDatabaseId,
        tableId: AppCollections.usersProfile,
        queries: [Query.equal('userId', userId)],
      );
      if (response.rows.isNotEmpty) {
        final doc = response.rows.first;
        // Merge system fields ($id, $createdAt) into the data map —
        // Appwrite SDK keeps these on the document object, NOT inside doc.data
        final Map<String, dynamic> merged = Map<String, dynamic>.from(doc.data as Map);
        try {
          merged['\$id'] = doc.$id;
          merged['\$createdAt'] = doc.$createdAt;
        } catch (_) {
          // Fallback if doc.$id isn't available
          merged['\$id'] = merged['\$id'] ?? merged['id'];
        }
        return UserProfile.fromJson(merged);
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
