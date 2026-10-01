import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../models/alert_model.dart';

class AlertsProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  List<AlertModel> _alerts = [];
  bool _isLoading = false;

  List<AlertModel> get alerts => _alerts;
  bool get isLoading => _isLoading;

  Future<void> fetchAlerts() async {
    _isLoading = true;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/alerts');
      if (response.statusCode == 200) {
        _alerts = (response.data as List).map((e) => AlertModel.fromJson(e)).toList();
      }
    } catch (e) {
      // Ignore
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<Map<String, dynamic>> parseAlertQuery(String query) async {
    try {
      final response = await _apiClient.dio.post('/alerts/parse', data: {'query': query});
      if (response.statusCode == 200) {
        return response.data;
      }
    } catch (e) {
      throw Exception('Failed to parse query');
    }
    return {};
  }

  Future<void> createAlert(Map<String, dynamic> data) async {
    try {
      await _apiClient.dio.post('/alerts', data: data);
      await fetchAlerts();
    } catch (e) {
      throw Exception('Failed to create alert');
    }
  }

  Future<void> updateAlert(int id, Map<String, dynamic> data) async {
    try {
      await _apiClient.dio.put('/alerts/$id', data: data);
      await fetchAlerts();
    } catch (e) {
      throw Exception('Failed to update alert');
    }
  }

  Future<void> toggleAlert(int id, bool isActive) async {
    try {
      final index = _alerts.indexWhere((a) => a.id == id);
      if (index != -1) {
        final alert = _alerts[index];
        _alerts[index] = AlertModel(
          id: alert.id,
          queryText: alert.queryText,
          category: alert.category,
          brand: alert.brand,
          modelKeyword: alert.modelKeyword,
          minPrice: alert.minPrice,
          maxPrice: alert.maxPrice,
          conditions: alert.conditions,
          location: alert.location,
          isActive: isActive,
        );
        notifyListeners();
      }
      await _apiClient.dio.patch('/alerts/$id/toggle', data: {'isActive': isActive});
    } catch (e) {
      // Revert if failed
      await fetchAlerts();
    }
  }

  Future<void> deleteAlert(int id) async {
    try {
      _alerts.removeWhere((a) => a.id == id);
      notifyListeners();
      await _apiClient.dio.delete('/alerts/$id');
    } catch (e) {
      // Revert if failed
      await fetchAlerts();
    }
  }
}
