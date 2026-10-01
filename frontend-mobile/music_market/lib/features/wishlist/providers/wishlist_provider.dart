import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
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
      _errorMessage = describeError(e, 'Failed to load wishlist.');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Adds a listing. Returns an error message, or null when it worked.
  Future<String?> addToWishlist(int listingId) async {
    try {
      await _apiClient.dio.post('/wishlist/$listingId');
      await fetchWishlist();
      return null;
    } catch (e) {
      return describeError(e, 'Could not add to the wishlist.');
    }
  }

  /// Removes a listing (by LISTING id). Returns an error message, or null when it worked.
  Future<String?> removeFromWishlist(int listingId) async {
    try {
      await _apiClient.dio.delete('/wishlist/$listingId');
      _items.removeWhere((item) => item.listingId == listingId);
      notifyListeners();
      return null;
    } catch (e) {
      return describeError(e, 'Could not remove from the wishlist.');
    }
  }

  bool isInWishlist(int listingId) {
    return _items.any((item) => item.listingId == listingId);
  }
}
