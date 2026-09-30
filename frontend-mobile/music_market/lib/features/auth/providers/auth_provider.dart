import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';

class AuthProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  final _secureStorage = const FlutterSecureStorage();
  
  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _token;
  String? _role;
  bool _pendingApproval = false;
  String? _errorMessage;

  bool get isAuthenticated => _token != null;
  String? get role => _role;
  bool get pendingApproval => _pendingApproval;
  String? get errorMessage => _errorMessage;

  Future<void> loadAuthData() async {
    _token = await _secureStorage.read(key: 'jwt_token');
    _role = await _secureStorage.read(key: 'user_role');
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

  Future<void> logout() async {
    _token = null;
    _role = null;
    await _secureStorage.delete(key: 'jwt_token');
    await _secureStorage.delete(key: 'user_role');
    notifyListeners();
  }
}
