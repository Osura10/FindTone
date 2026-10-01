import 'package:music_market/core/utils/app_logger.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';

class AuthProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final _secureStorage = const FlutterSecureStorage();
  
  bool _isAuthLoading = true;
  bool get isAuthLoading => _isAuthLoading;
  
  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _token;
  String? _role;
  bool _pendingApproval = false;
  String? _errorMessage;
  Map<String, dynamic>? _userProfile;

  bool get isAuthenticated => _token != null;
  String? get role => _role;
  bool get pendingApproval => _pendingApproval;
  String? get errorMessage => _errorMessage;
  Map<String, dynamic>? get userProfile => _userProfile;

  int? get userId {
    if (_token == null) return null;
    try {
      final parts = _token!.split('.');
      if (parts.length != 3) return null;
      final normalized = base64Url.normalize(parts[1]);
      final payload = utf8.decode(base64Url.decode(normalized));
      final map = jsonDecode(payload);
      final idStr = map['nameid'] ?? map['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
      return idStr != null ? int.tryParse(idStr.toString()) : null;
    } catch (_) {
      return null;
    }
  }

  bool _isOffline = false;
  bool get isOffline => _isOffline;

  Future<void> loadAuthData() async {
    _token = await _secureStorage.read(key: 'jwt_token');
    _role = await _secureStorage.read(key: 'user_role');
    _isOffline = false;
    
    if (_token != null) {
      try {
        final response = await _apiClient.dio.get('/auth/me', 
          options: Options(sendTimeout: const Duration(seconds: 10), receiveTimeout: const Duration(seconds: 10)));
        if (response.statusCode == 200) {
          _role = response.data['role'];
          await _secureStorage.write(key: 'user_role', value: _role);
        }
      } on DioException catch (e) {
        if (e.response?.statusCode == 401) {
          _token = null;
          _role = null;
          await _secureStorage.deleteAll();
        } else {
          _isOffline = true;
        }
      } catch (_) {
        _isOffline = true;
      }
    }
    
    _isAuthLoading = false;
    notifyListeners();
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
      final response = await _apiClient.dio.post(
        '/auth/login',
        data: {
          'email': email.trim(),
          'password': password,
        },
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final role = data['role'];

        if (role == 'admin') {
          _errorMessage = "Admin accounts can only sign in on the web dashboard.";
          _isLoading = false;
          notifyListeners();
          return false;
        }

        _token = data['token'];
        _role = role;
        
        await _secureStorage.write(key: 'jwt_token', value: _token);
        await _secureStorage.write(key: 'user_role', value: _role);
        
        _isLoading = false;
        notifyListeners();
        return true;
      }
    } on DioException catch (e) {
      if (e.response?.statusCode == 403) {
        _pendingApproval = true;
        _errorMessage = "Please wait until your account is verified. Your account approval is currently pending.";
      } else {
        if (e.error is AppException) {
          _errorMessage = (e.error as AppException).message;
        } else {
          _errorMessage = "An error occurred during login.";
        }
      }
    }

    _isLoading = false;
    notifyListeners();
    return false;
  }

  Future<void> fetchProfile() async {
    try {
      final response = await _apiClient.dio.get('/auth/me');
      _userProfile = response.data;
      notifyListeners();
    } catch (_) {
      logDebug('Log:', 'Error caught');
    }
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

  Future<void> uploadAvatar(String imagePath) async {
    final formData = FormData.fromMap({
      'profileImage': await MultipartFile.fromFile(imagePath),
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

  Future<void> logout() async {
    _token = null;
    _role = null;
    _userProfile = null;
    await _secureStorage.deleteAll();
    notifyListeners();
  }
}
