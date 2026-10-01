import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../shop/models/order_model.dart';
import '../../../core/network/exceptions.dart';
import 'package:dio/dio.dart';

class BuyerProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  List<OrderModel> _myOrders = [];
  bool _isLoadingOrders = false;

  List<OrderModel> get myOrders => _myOrders;
  bool get isLoadingOrders => _isLoadingOrders;

  Future<void> fetchMyOrders() async {
    _isLoadingOrders = true;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/orders/mine');
      if (response.statusCode == 200) {
        _myOrders = (response.data as List).map((e) => OrderModel.fromJson(e)).toList();
      }
    } catch (e) {
      // 
    } finally {
      _isLoadingOrders = false;
      notifyListeners();
    }
  }

  Future<OrderModel> placeOrder(Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.dio.post(
        '/orders', 
        data: data,
        options: Options(
          receiveTimeout: const Duration(seconds: 120),
          sendTimeout: const Duration(seconds: 60),
        ),
      );
      
      // If success, try to fetch the full order from /orders/mine because 
      // the POST response only returns { message, orderId }
      final orderId = response.data['orderId'];
      await fetchMyOrders();
      final createdOrder = _myOrders.firstWhere(
        (o) => o.id == orderId,
        orElse: () => OrderModel(
          id: orderId,
          listingId: data['listingId'],
          listingTitle: '',
          amount: (data['amount'] as num).toDouble(),
          paymentMethod: data['paymentMethod'],
          status: data['paymentMethod'] == 'CARD' ? 'PAID' : 'CONFIRMED_COD',
          fullName: data['fullName'],
          phone: data['phone'],
          addressLine: data['addressLine'],
          city: data['city'],
          createdAt: DateTime.now(),
          cardLast4: data['paymentMethod'] == 'CARD' ? (data['card']['number'] as String).substring((data['card']['number'] as String).length - 4) : null,
        ),
      );
      return createdOrder;
      
    } on DioException catch (e) {
      String parseBackendMessage(DioException error, String fallback) {
        if (error.response?.data is Map) {
          final data = error.response!.data as Map;
          if (data['message'] != null) return data['message'].toString();
        } else if (error.response?.data is String && error.response!.data.toString().isNotEmpty) {
          return error.response!.data.toString();
        }
        return fallback;
      }

      if (e.response?.statusCode == 400) {
        throw AppException(parseBackendMessage(e, 'Payment declined. Please check your card details.'));
      }
      if (e.response?.statusCode == 401) {
        throw AppException(parseBackendMessage(e, 'Please log in again.'));
      }
      if (e.response?.statusCode == 403) {
        throw AppException(parseBackendMessage(e, 'Forbidden.'));
      }
      
      // Safety net for 409 or timeouts
      if (e.response?.statusCode == 409 || e.type == DioExceptionType.receiveTimeout || e.type == DioExceptionType.connectionTimeout) {
        await fetchMyOrders();
        final existingOrder = _myOrders.where((o) => o.listingId == data['listingId']).toList();
        if (existingOrder.isNotEmpty) {
          final recentOrder = existingOrder.first;
          // check if it's within last 5 minutes
          if (DateTime.now().difference(recentOrder.createdAt).inMinutes < 5) {
            return recentOrder;
          }
        }
        
        if (e.response?.statusCode == 409) {
          throw AppException('Sorry, this item was just sold.');
        } else {
          throw AppException('Could not confirm your order, check My Orders.');
        }
      }
      
      throw AppException(e.error is AppException ? (e.error as AppException).message : e.message ?? 'Unknown error');
    } catch (e) {
      throw AppException(e.toString());
    }
  }
}
