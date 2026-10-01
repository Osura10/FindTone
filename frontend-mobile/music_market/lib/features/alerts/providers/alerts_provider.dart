import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../models/alert_model.dart';

/// My Alerts for buyers AND shops: list, create, edit, enable/disable, delete and "Fill with AI".
class AlertsProvider with ChangeNotifier {
  static const parseTimeout = Duration(seconds: 90);

  final ApiClient _apiClient = ApiClient();

  List<AlertModel> _alerts = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<AlertModel> get alerts => _alerts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchAlerts() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/alerts');
      _alerts = (response.data as List).map((e) => AlertModel.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      _errorMessage = describeError(e, 'Could not load your alerts.');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// "Fill with AI": POST /alerts/parse with {"text": ...}. The answer uses snake_case keys.
  Future<Map<String, dynamic>> parseAlertText(String text) async {
    try {
      final response = await _apiClient.dio.post(
        '/alerts/parse',
        data: {'text': text},
        options: Options(receiveTimeout: parseTimeout, sendTimeout: parseTimeout),
      );
      return Map<String, dynamic>.from(response.data as Map);
    } catch (e) {
      throw AppException(describeError(e, 'The AI could not read that. Please fill the form yourself.'), statusCode: statusOf(e));
    }
  }

  /// Create (id == null) or update an alert. Returns the saved alert (with newMatches). Throws AppException.
  Future<AlertModel> saveAlert(Map<String, dynamic> data, {int? id}) async {
    try {
      final response = id == null
          ? await _apiClient.dio.post('/alerts', data: data)
          : await _apiClient.dio.put('/alerts/$id', data: data);
      final saved = AlertModel.fromJson(Map<String, dynamic>.from(response.data as Map));
      await fetchAlerts();
      return saved;
    } catch (e) {
      throw AppException(describeError(e, 'Could not save the alert.'), statusCode: statusOf(e));
    }
  }

  /// Enable/disable. Returns (error message or null, number of new matches when enabled).
  Future<(String?, int)> toggleAlert(int id, bool isActive) async {
    final index = _alerts.indexWhere((a) => a.id == id);
    try {
      final response = await _apiClient.dio.patch('/alerts/$id/toggle', data: {'isActive': isActive});
      final saved = AlertModel.fromJson(Map<String, dynamic>.from(response.data as Map));
      if (index != -1) _alerts[index] = saved;
      notifyListeners();
      return (null, saved.newMatches ?? 0);
    } catch (e) {
      return (describeError(e, 'Could not change the alert.'), 0);
    }
  }

  /// Returns an error message, or null when it worked.
  Future<String?> deleteAlert(int id) async {
    try {
      await _apiClient.dio.delete('/alerts/$id');
      _alerts.removeWhere((a) => a.id == id);
      notifyListeners();
      return null;
    } catch (e) {
      return describeError(e, 'Could not delete the alert.');
    }
  }
}
