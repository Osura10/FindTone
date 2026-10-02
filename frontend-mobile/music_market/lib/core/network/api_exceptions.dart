import 'package:dio/dio.dart';

/// Error with a message that is safe to show to the user.
class AppException implements Exception {
  final String message;
  final int? statusCode;

  AppException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Turns any caught error into a short message for the UI.
/// The API sends {"message": "..."}; ApiClient puts it into an AppException.
String describeError(Object error, [String fallback = 'Something went wrong. Please try again.']) {
  if (error is AppException) return error.message;
  if (error is DioException) {
    final inner = error.error;
    if (inner is AppException) return inner.message;
    final data = error.response?.data;
    if (data is Map && data['message'] != null) return data['message'].toString();
    if (error.message != null && error.message!.isNotEmpty) return error.message!;
  }
  return fallback;
}

/// HTTP status of an error, if there is one.
int? statusOf(Object error) {
  if (error is AppException) return error.statusCode;
  if (error is DioException) {
    final inner = error.error;
    if (inner is AppException && inner.statusCode != null) return inner.statusCode;
    return error.response?.statusCode;
  }
  return null;
}
