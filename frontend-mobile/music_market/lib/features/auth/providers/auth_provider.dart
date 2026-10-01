import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/utils/app_logger.dart';

/// Login state for the whole app. The router redirect reads isAuthLoading / isAuthenticated / role.
class AuthProvider with ChangeNotifier {
  static const adminBlockedMessage = 'Admin accounts can only sign in on the web dashboard.';

  final ApiClient _apiClient = ApiClient();
  final _storage = ApiClient.storage;

  AuthProvider() {
    // Any 401 from the API logs the user out; the router then shows /login.
    ApiClient.onUnauthorized = () => logout(message: 'Your session expired. Please log in again.');
  }

  bool _isAuthLoading = true;
  bool get isAuthLoading => _isAuthLoading;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _token;
  String? _role;
  int? _userId;
  bool _pendingApproval = false;
  String? _errorMessage;
  String? _statusMessage;
  Map<String, dynamic>? _userProfile;
  bool _isOffline = false;

  bool get isAuthenticated => _token != null && _role != null;
  String? get role => _role;
  int? get userId => _userId;
  bool get pendingApproval => _pendingApproval;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get userProfile => _userProfile;
  bool get isOffline => _isOffline;

  /// A one-time message for the next screen (e.g. "server offline"). Reading it clears it.
  String? takeStatusMessage() {
    final m = _statusMessage;
    _statusMessage = null;
    return m;
  }

  /// Called once by the splash screen. Never throws, so the app never stays on a blank screen.
  Future<void> loadAuthData() async {
    _isOffline = false;
    try {
      _token = await _storage.read(key: 'jwt_token');
      _role = await _storage.read(key: 'user_role');
      final savedId = await _storage.read(key: 'user_id');
      _userId = savedId != null ? int.tryParse(savedId) : null;
    } catch (e) {
      logDebug('Secure storage read failed', e);
      _token = null;
      _role = null;
      _statusMessage = 'Could not read the saved login. Please log in again.';
    }

    if (_token != null) {
      try {
        await _loadMe();
        if (_role == 'admin') {
          await logout(message: adminBlockedMessage);
          return;
        }
      } catch (e) {
        if (statusOf(e) == 401) {
          await logout(message: 'Your session expired. Please log in again.');
          return;
        }
        // Backend is off or unreachable: keep the saved session and tell the user.
        _isOffline = true;
        _statusMessage = '${describeError(e)} Showing what we can; pull down to retry.';
        if (_role == null) {
          _token = null; // no saved role -> we cannot route, ask for a fresh login
        }
      }
    }

    _isAuthLoading = false;
    notifyListeners();
  }

  Future<void> _loadMe() async {
    final response = await _apiClient.dio.get('/auth/me',
        options: Options(receiveTimeout: const Duration(seconds: 10)));
    final data = Map<String, dynamic>.from(response.data as Map);
    _userProfile = data;
    _role = data['role']?.toString().toLowerCase();
    _userId = (data['id'] as num?)?.toInt();
    await _storage.write(key: 'user_role', value: _role);
    await _storage.write(key: 'user_id', value: _userId?.toString());
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    _pendingApproval = false;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post('/auth/login', data: {'email': email.trim(), 'password': password});
      if (response.data['role']?.toString().toLowerCase() == 'admin') {
        _errorMessage = adminBlockedMessage;
        return false;
      }
      _token = response.data['token'];
      await _storage.write(key: 'jwt_token', value: _token);
      // The role used for routing comes from /auth/me, not from the login answer.
      await _loadMe();
      if (_role == 'admin') {
        await logout(message: adminBlockedMessage);
        _errorMessage = adminBlockedMessage;
        return false;
      }
      _isOffline = false;
      return true;
    } catch (e) {
      final status = statusOf(e);
      _pendingApproval = status == 403;
      _errorMessage = describeError(e, 'Login failed. Please try again.');
      _token = null;
      _role = null;
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> fetchProfile() async {
    try {
      await _loadMe();
      _errorMessage = null;
    } catch (e) {
      _errorMessage = describeError(e, 'Could not load your profile.');
    }
    notifyListeners();
  }

  Future<void> updatePhone(String phone) async {
    await _apiClient.dio.put('/auth/profile/phone', data: {'phoneNumber': phone});
    await fetchProfile();
  }

  Future<void> updateLocation(String location) async {
    await _apiClient.dio.put('/auth/profile/location', data: {'address': location});
    await fetchProfile();
  }

  Future<void> updatePassword(String password) async {
    await _apiClient.dio.put('/auth/profile/password', data: {'newPassword': password});
  }

  Future<void> uploadAvatar(XFile image) async {
    final formData = FormData.fromMap({
      'profileImage': MultipartFile.fromBytes(await image.readAsBytes(), filename: image.name),
    });
    await _apiClient.dio.put('/auth/profile/image', data: formData);
    await fetchProfile();
  }

  Future<void> deleteAvatar() async {
    await _apiClient.dio.delete('/auth/profile/image');
    await fetchProfile();
  }

  Future<void> deleteAccount() async {
    await _apiClient.dio.delete('/auth/account');
    await logout();
  }

  Future<void> logout({String? message}) async {
    _token = null;
    _role = null;
    _userId = null;
    _userProfile = null;
    _isAuthLoading = false;
    if (message != null) _statusMessage = message;
    try {
      await _storage.deleteAll();
    } catch (e) {
      logDebug('Secure storage clear failed', e);
    }
    notifyListeners();
  }
}
