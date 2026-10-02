import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../shop/models/order_model.dart';

/// Buying side for buyers AND shops: my orders and placing an order.
class BuyerProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();

  List<OrderModel> _myOrders = [];
  bool _isLoadingOrders = false;
  String? _errorMessage;

  List<OrderModel> get myOrders => _myOrders;
  bool get isLoadingOrders => _isLoadingOrders;
  String? get errorMessage => _errorMessage;

  Future<void> fetchMyOrders() async {
    _isLoadingOrders = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/orders/mine');
      _myOrders = (response.data as List).map((e) => OrderModel.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      _errorMessage = describeError(e, 'Could not load your orders.');
    } finally {
      _isLoadingOrders = false;
      notifyListeners();
    }
  }

  /// My order for this listing created in the last few minutes, if any.
  Future<OrderModel?> _recentOrderFor(int listingId) async {
    await fetchMyOrders();
    final now = DateTime.now();
    for (final o in _myOrders) {
      if (o.listingId == listingId && now.difference(o.createdAt.toLocal()).inMinutes.abs() < 5) return o;
    }
    return null;
  }

  /// POST /api/orders. Returns the new order id. Throws AppException with the backend message.
  /// Safety check: after a 409 or a timeout we look in My Orders, because the first request
  /// may have worked (double tap, slow network) – then that order is returned instead of an error.
  Future<int> placeOrder(Map<String, dynamic> payload) async {
    final listingId = payload['listingId'] as int;
    try {
      final response = await _apiClient.dio.post(
        '/orders',
        data: payload,
        options: Options(receiveTimeout: const Duration(seconds: 120)),
      );
      return (response.data['orderId'] as num).toInt();
    } catch (e) {
      final status = statusOf(e);
      final timedOut = e is DioException &&
          (e.type == DioExceptionType.receiveTimeout || e.type == DioExceptionType.sendTimeout || e.type == DioExceptionType.connectionTimeout);
      if (status == 409 || timedOut) {
        final existing = await _recentOrderFor(listingId);
        if (existing != null) return existing.id;
      }
      throw AppException(describeError(e, 'Could not place your order. Please try again.'), statusCode: status);
    }
  }

  /// Finds one of my orders (used by the success screen after a page reload).
  Future<OrderModel?> findOrder(int orderId) async {
    if (!_myOrders.any((o) => o.id == orderId)) await fetchMyOrders();
    for (final o in _myOrders) {
      if (o.id == orderId) return o;
    }
    return null;
  }
}
