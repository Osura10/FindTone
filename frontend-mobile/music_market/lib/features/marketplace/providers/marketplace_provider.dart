import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../models/listing_model.dart';

class MarketplaceProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<ListingSummary> _listings = [];
  bool _isLoading = false;
  String? _errorMessage;

  int _currentPage = 1;
  int _totalPages = 1;
  bool _hasMore = true;

  // Search text (sent as ?q=, searched by the API like on the web) and filters
  String _query = '';
  String? _category;
  String? _brand;
  double? _minPrice;
  double? _maxPrice;
  String? _condition;

  List<ListingSummary> get listings => _listings;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasMore => _hasMore;

  // Filter getters
  String get query => _query;
  String? get category => _category;
  String? get brand => _brand;
  double? get minPrice => _minPrice;
  double? get maxPrice => _maxPrice;
  String? get condition => _condition;

  Future<void> fetchListings({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _listings.clear();
      _hasMore = true;
      _errorMessage = null;
    }

    if (!_hasMore) return;

    if (_currentPage == 1) {
      _isLoading = true;
      notifyListeners();
    }

    try {
      final Map<String, dynamic> queryParams = {
        'page': _currentPage,
        'pageSize': 12,
      };

      if (_query.trim().isNotEmpty) queryParams['q'] = _query.trim();
      if (_category != null && _category!.isNotEmpty) queryParams['category'] = _category;
      if (_brand != null && _brand!.isNotEmpty) queryParams['brand'] = _brand;
      if (_minPrice != null) queryParams['minPrice'] = _minPrice;
      if (_maxPrice != null) queryParams['maxPrice'] = _maxPrice;
      if (_condition != null && _condition!.isNotEmpty) queryParams['condition'] = _condition;

      final response = await _apiClient.dio.get(
        '/listings',
        queryParameters: queryParams,
      );

      if (response.statusCode == 200) {
        final data = response.data;
        final items = (data['items'] as List).map((e) => ListingSummary.fromJson(e)).toList();

        _totalPages = data['totalPages'];

        if (refresh) {
          _listings = items;
        } else {
          _listings.addAll(items);
        }

        if (_currentPage >= _totalPages) {
          _hasMore = false;
        } else {
          _currentPage++;
        }
        _errorMessage = null;
      }
    } catch (e) {
      _errorMessage = describeError(e, 'Failed to load listings. Please try again.');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void applyFilters({
    String? category,
    String? brand,
    double? minPrice,
    double? maxPrice,
    String? condition,
  }) {
    _category = category;
    _brand = brand;
    _minPrice = minPrice;
    _maxPrice = maxPrice;
    _condition = condition;
    fetchListings(refresh: true);
  }

  void search(String text) {
    _query = text;
    fetchListings(refresh: true);
  }

  void clearFilters() {
    _category = null;
    _brand = null;
    _minPrice = null;
    _maxPrice = null;
    _condition = null;
    fetchListings(refresh: true);
  }

  /// Listing details (public view, or owner view for your own listing). Throws AppException.
  Future<ListingDetail> getListingDetails(int id) async {
    try {
      final response = await _apiClient.dio.get('/listings/$id');
      return ListingDetail.fromJson(Map<String, dynamic>.from(response.data));
    } catch (e) {
      throw AppException(describeError(e, 'Failed to load listing details.'), statusCode: statusOf(e));
    }
  }
}
