import 'package:music_market/core/utils/app_logger.dart';
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
        sendTimeout: const Duration(seconds: 60),
        receiveTimeout: const Duration(seconds: 30),
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
            e.type == DioExceptionType.connectionError) {
          if (kDebugMode) {
            logDebug('Log:', "DioException: ${e.type}, ${e.message}, ${e.requestOptions.uri}, ${e.response?.statusCode}, ${e.error}");
          }
          return handler.next(DioException(
            requestOptions: e.requestOptions,
            error: AppException("Cannot reach the server"),
          ));
        }

        if (e.type == DioExceptionType.receiveTimeout || e.type == DioExceptionType.sendTimeout) {
          if (kDebugMode) {
            logDebug('Log:', "DioException Timeout: ${e.type}, path: ${e.requestOptions.path}");
          }
          String msg = "Request timed out, try again.";
          if (e.requestOptions.path.endsWith('/listings') && e.requestOptions.method == 'POST') {
            msg = "The AI is taking longer than usual. Your listing was saved and will be checked shortly.";
          } else if (e.requestOptions.path.endsWith('/price-check')) {
            msg = "Price check timed out, try again";
          }
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
        
        String message = "Something went wrong";
        if (e.response?.data != null) {
          if (e.response?.data is Map<String, dynamic> && e.response?.data['message'] != null) {
            message = e.response?.data['message'];
          } else if (e.response?.data is String) {
            message = e.response?.data;
          }
        } else if (e.message != null && e.message!.isNotEmpty) {
          message = e.message!;
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
