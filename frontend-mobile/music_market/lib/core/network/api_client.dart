import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter/foundation.dart';
import 'api_exceptions.dart';
import '../routes/app_router.dart';

/// Provides a configured Dio client for network requests.
class ApiClient {
  static String get _defaultBaseUrl {
    const String envUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'http://localhost:5036/api';
    if (defaultTargetPlatform == TargetPlatform.android) return 'http://10.0.2.2:5036/api';
    return 'http://localhost:5036/api';
  }
  static final String baseUrl = _defaultBaseUrl;
  static bool _hasPrintedUrl = false;

  late final Dio dio;
  final _secureStorage = const FlutterSecureStorage();

  ApiClient() {
    if (kDebugMode && !_hasPrintedUrl) {
      debugPrint('[API] Base URL: $baseUrl');
      _hasPrintedUrl = true;
    }

    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
      ),
    );

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (!options.path.startsWith('/auth/login') && !options.path.startsWith('/auth/register')) {
          final token = await _secureStorage.read(key: 'jwt_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
        }
        return handler.next(options);
      },
      onResponse: (response, handler) {
        return handler.next(response);
      },
      onError: (DioException e, handler) async {
        if (e.type == DioExceptionType.connectionTimeout || 
            e.type == DioExceptionType.receiveTimeout || 
            e.type == DioExceptionType.connectionError) {
          if (kDebugMode) {
            print("DioException: ${e.type}, ${e.message}, ${e.requestOptions.uri}, ${e.response?.statusCode}, ${e.error}");
          }
          String msg = e.type == DioExceptionType.connectionError 
              ? "Cannot reach the server at $baseUrl. Is the backend running?" 
              : "Timeout connecting to the server.";
          return handler.next(DioException(
            requestOptions: e.requestOptions,
            error: AppException(msg),
          ));
        }

        if (e.response?.statusCode == 401) {
          // Clear session and go to login
          await _secureStorage.delete(key: 'jwt_token');
          await _secureStorage.delete(key: 'user_role');
          AppRouter.router.go('/');
          return handler.next(DioException(
            requestOptions: e.requestOptions,
            error: AppException("Session expired. Please login again.", statusCode: 401),
          ));
        }
        
        String message = "An error occurred";
        if (e.response?.data != null) {
          if (e.response?.data is Map<String, dynamic> && e.response?.data['message'] != null) {
            message = e.response?.data['message'];
          } else if (e.response?.data is String) {
            message = e.response?.data;
          }
        }

        return handler.next(DioException(
          requestOptions: e.requestOptions,
          error: AppException(message, statusCode: e.response?.statusCode),
          response: e.response
        ));
      },
    ));
  }
}
