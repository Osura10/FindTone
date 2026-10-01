import 'package:music_market/core/utils/app_logger.dart';
import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../models/wishlist_item_model.dart';

class WishlistProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<WishlistItemModel> _items = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<WishlistItemModel> get items => _items;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> fetchWishlist() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _apiClient.dio.get('/wishlist');
      if (response.statusCode == 200) {
        _items = (response.data as List).map((e) => WishlistItemModel.fromJson(e)).toList();
      }
    } catch (e) {
      _errorMessage = "Failed to load wishlist.";
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> addToWishlist(int listingId) async {
    try {
      final response = await _apiClient.dio.post('/wishlist/$listingId');
      if (response.statusCode == 200) {
        await fetchWishlist();
        return true;
      }
    } catch (e) {
      logDebug('Caught error:', e);
    }
    return false;
  }

  Future<bool> removeFromWishlist(int listingId) async {
    try {
      final response = await _apiClient.dio.delete('/wishlist/$listingId');
      if (response.statusCode == 204) {
        _items.removeWhere((item) => item.listingId == listingId);
        notifyListeners();
        return true;
      }
    } catch (e) {
logDebug('Caught error:', e);
      _errorMessage = 'An error occurred. Pull to refresh or try again.';
      notifyListeners();
    }
    return false;
  }

  bool isInWishlist(int listingId) {
    return _items.any((item) => item.listingId == listingId);
  }
}
