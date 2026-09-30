import 'package:flutter/material.dart';
import '../network/api_client.dart';
import '../models/catalog_model.dart';

class CatalogProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  List<CatalogModel> _items = [];
  bool _isLoading = false;

  List<CatalogModel> get items => _items;
  List<String> get categories => _items.map((e) => e.category).toSet().toList()..sort();
  List<String> get brands => _items.map((e) => e.brand).toSet().toList()..sort();
  bool get isLoading => _isLoading;

  Future<void> fetchCatalog() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      final response = await _apiClient.dio.get('/catalog');
      if (response.statusCode == 200) {
        _items = (response.data as List).map((e) => CatalogModel.fromJson(e)).toList();
      }
    } catch (e) {
      // Handle error natively if needed
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
