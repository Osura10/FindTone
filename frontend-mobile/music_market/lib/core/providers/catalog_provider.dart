import 'package:flutter/material.dart';
import '../network/api_client.dart';
import '../network/api_exceptions.dart';
import '../models/catalog_model.dart';

class CatalogProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  List<CatalogModel> _items = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<CatalogModel> get items => _items;
  List<String> get categories => _items.map((e) => e.category).toSet().toList()..sort();
  List<String> get brands => _items.map((e) => e.brand).toSet().toList()..sort();
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchCatalog() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    
    try {
      final response = await _apiClient.dio.get('/catalog');
      if (response.statusCode == 200) {
        _items = (response.data as List).map((e) => CatalogModel.fromJson(e)).toList();
      }
    } catch (e) {
      // Suggestions are optional: forms still accept any typed value.
      _errorMessage = describeError(e, 'Suggestions are not available right now.');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
