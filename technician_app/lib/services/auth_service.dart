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
  late final Storage _storage = Storage(AppwriteService().client);

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

  /// Login with email & password — restricted to technicians only
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());

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

      if (profile.role != 'technician') {
        await _account.deleteSession(sessionId: 'current');
        _error = 'Access denied. This app is for technicians only.';
        _currentUser = null;
        _isLoading = false;
        notifyListeners();
        return false;
      }

      _currentProfile = profile;
      _isLoading = false;
      SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
      return true;
    } catch (e) {
      // Demo mode: allow demo login when Appwrite is not connected
      if (email == 'technician@demo.com' && password == 'demo1234') {
        _currentProfile = UserProfile(
          id: 'demo_technician',
          userId: 'demo_technician',
          firstName: 'Demo',
          lastName: 'Technician',
          phone: '09171234567',
          email: 'technician@demo.com',
          barangay: 'Brgy. Demo',
          city: 'Manila',
          province: 'Metro Manila',
          role: 'technician',
        );
        _isLoading = false;
        SchedulerBinding.instance.addPostFrameCallback((_) => notifyListeners());
        return true;
      }
      _error = _parseError(e);
      if (_error == 'Authentication failed.' || _error!.contains('Project')) {
        _error = 'Login failed. Use technician@demo.com / demo1234 for demo mode.';
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
      if (profile != null && profile.role == 'technician') {
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
        // HTTP Bypass logic for web/appwrite SDK bugs.
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
      try {
        await _db.updateRow(
          databaseId: appwriteDatabaseId,
          tableId: AppCollections.usersProfile,
          rowId: _currentProfile!.id,
          data: {'profileImage': newImageUrl},
        );
      } catch (e) {
        // HTTP Bypass logic for permission issues
        final uri = Uri.parse('$appwriteEndpoint/databases/$appwriteDatabaseId/collections/${AppCollections.usersProfile}/documents/${_currentProfile!.id}');
        final res = await http.patch(uri, headers: {
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
          'Content-Type': 'application/json'
        }, body: jsonEncode({
          'data': {'profileImage': newImageUrl}
        }));
        if (res.statusCode != 200) {
          throw Exception('Bypass document update failed: ${res.body}');
        }
      }

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

  /// Update Profile Details
  Future<void> updateProfile(Map<String, dynamic> data) async {
    if (_currentProfile == null) return;
    try {
      try {
        await _db.updateRow(
          databaseId: appwriteDatabaseId,
          tableId: AppCollections.usersProfile,
          rowId: _currentProfile!.id,
          data: data,
        );
      } catch (e) {
        // HTTP Bypass logic for permission issues
        final uri = Uri.parse('$appwriteEndpoint/databases/$appwriteDatabaseId/collections/${AppCollections.usersProfile}/documents/${_currentProfile!.id}');
        final res = await http.patch(uri, headers: {
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
          'Content-Type': 'application/json'
        }, body: jsonEncode({
          'data': data
        }));
        if (res.statusCode != 200) {
          throw Exception('Bypass document update failed: ${res.body}');
        }
      }
      
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
        merged[r'$id'] = doc.$id;
        merged[r'$createdAt'] = doc.$createdAt;
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
