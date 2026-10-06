import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../utils/app_logger.dart';
import 'api_exceptions.dart';

/// Provides a configured Dio client for network requests.
class ApiClient {
  static String get _defaultBaseUrl {
    const String envUrl = String.fromEnvironment('API_BASE_URL', defaultValue: '');
    if (envUrl.isNotEmpty) return envUrl;
    if (kIsWeb) return 'https://findtone-02.onrender.com/api';
    if (defaultTargetPlatform == TargetPlatform.android) return 'https://findtone-02.onrender.com/api';
    return 'https://findtone-02.onrender.com/api';
  }

  static final String baseUrl = _defaultBaseUrl;
  static bool _hasPrintedUrl = false;

  /// Called when the API says the session is no longer valid (HTTP 401).
  /// AuthProvider sets this so it can log out and the router sends the user to /login.
  static Future<void> Function()? onUnauthorized;

  static const storage = FlutterSecureStorage();

  late final Dio dio;

  ApiClient() {
    if (!_hasPrintedUrl) {
      logDebug('[API] Base URL: $baseUrl');
      _hasPrintedUrl = true;
    }

    dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 15),
        sendTimeout: kIsWeb ? null : const Duration(seconds: 60), // web has no send timeout without a body stream
        receiveTimeout: const Duration(seconds: 30),
      ),
    );

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        if (!options.path.startsWith('/auth/login') && !options.path.startsWith('/auth/register')) {
          try {
            final token = await storage.read(key: 'jwt_token');
            if (token != null) options.headers['Authorization'] = 'Bearer $token';
          } catch (e) {
            logDebug('Could not read the saved token', e);
          }
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        logDebug('HTTP ${e.requestOptions.method} ${e.requestOptions.path} failed: ${e.type} ${e.response?.statusCode}');

        if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.connectionError) {
          return handler.next(DioException(
            requestOptions: e.requestOptions,
            type: e.type,
            error: AppException('Cannot reach the server. Check that the backend is running and try again.'),
          ));
        }

        if (e.type == DioExceptionType.receiveTimeout || e.type == DioExceptionType.sendTimeout) {
          var msg = 'Request timed out, try again.';
          if (e.requestOptions.path.endsWith('/listings') && e.requestOptions.method == 'POST') {
            msg = 'The AI is taking longer than usual. Your listing may still be saved – check My Listings.';
          } else if (e.requestOptions.path.endsWith('/price-check')) {
            msg = 'Price check timed out, try again.';
          }
          return handler.next(DioException(
            requestOptions: e.requestOptions,
            type: e.type,
            error: AppException(msg),
          ));
        }

        final status = e.response?.statusCode;
        final isLoginCall = e.requestOptions.path.startsWith('/auth/login');
        if (status == 401 && !isLoginCall) {
          await onUnauthorized?.call();
          return handler.next(DioException(
            requestOptions: e.requestOptions,
            response: e.response,
            type: e.type,
            error: AppException('Session expired. Please log in again.', statusCode: 401),
          ));
        }

        // The backend always answers {"message": "..."} for errors.
        var message = 'Something went wrong (HTTP ${status ?? '?'}).';
        final data = e.response?.data;
        if (data is Map && data['message'] != null) {
          message = data['message'].toString();
        } else if (data is String && data.trim().isNotEmpty) {
          message = data;
        }

        return handler.next(DioException(
          requestOptions: e.requestOptions,
          response: e.response,
          type: e.type,
          error: AppException(message, statusCode: status),
        ));
      },
    ));
  }
}
