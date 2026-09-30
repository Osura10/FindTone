import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client.dart';
import '../../marketplace/models/listing_model.dart';
import '../models/order_model.dart';
import '../models/price_check_model.dart';
import '../../../core/network/exceptions.dart';

class ShopProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  List<ListingSummary> _myListings = [];
  List<OrderModel> _sales = [];

  bool _isLoadingListings = false;
  bool _isLoadingSales = false;

  List<ListingSummary> get myListings => _myListings;
  List<OrderModel> get sales => _sales;
  bool get isLoadingListings => _isLoadingListings;
  bool get isLoadingSales => _isLoadingSales;

  Future<void> fetchMyListings() async {
    _isLoadingListings = true;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/listings/mine');
      if (response.statusCode == 200) {
        _myListings = (response.data as List).map((e) => ListingSummary.fromJson(e)).toList();
      }
    } catch (e) {
      //
    } finally {
      _isLoadingListings = false;
      notifyListeners();
    }
  }

  Future<void> fetchSales() async {
    _isLoadingSales = true;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/orders/sales');
      if (response.statusCode == 200) {
        _sales = (response.data as List).map((e) => OrderModel.fromJson(e)).toList();
      }
    } catch (e) {
      //
    } finally {
      _isLoadingSales = false;
      notifyListeners();
    }
  }

  Future<bool> deleteListing(int id) async {
    try {
      final response = await _apiClient.dio.delete('/listings/$id');
      if (response.statusCode == 200) {
        _myListings.removeWhere((l) => l.id == id);
        notifyListeners();
        return true;
      }
    } catch (e) {
      //
    }
    return false;
  }

  Future<bool> updatePrice(int id, double newPrice) async {
    try {
      final response = await _apiClient.dio.put(
        '/listings/$id/price',
        data: {'newPrice': newPrice},
        options: Options(receiveTimeout: const Duration(seconds: 300)),
      );
      if (response.statusCode == 200) {
        await fetchMyListings();
        return true;
      }
      throw AppException('Failed to update price');
    } on DioException catch (e) {
      throw AppException(e.message ?? 'Unknown error');
    } catch (e) {
      throw AppException(e.toString());
    }
  }

  Future<FairPriceResult> checkPrice(Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.dio.post(
        '/listings/price-check', 
        data: data,
        options: Options(receiveTimeout: const Duration(seconds: 150)),
      );
      return FairPriceResult.fromJson(response.data);
    } on DioException catch (e) {
      if (e.response?.statusCode == 503) {
        throw AppException('Price check is unavailable right now (503).');
      }
      throw AppException(e.message ?? 'Unknown error checking price');
    } catch (e) {
      throw AppException('Error parsing price check result: $e');
    }
  }

  Future<bool> createListing(Map<String, dynamic> data, List<XFile> images) async {
    try {
      final formData = FormData.fromMap(data);
      for (var image in images) {
        final bytes = await image.readAsBytes();
        formData.files.add(MapEntry(
          'Images',
          MultipartFile.fromBytes(bytes, filename: image.name),
        ));
      }

      final response = await _apiClient.dio.post(
        '/listings',
        data: formData,
        options: Options(
          receiveTimeout: const Duration(seconds: 300),
        ),
      );
      
      if (response.statusCode == 201) {
        await fetchMyListings();
        return true;
      }
      throw AppException('Failed to create listing');
    } on DioException catch (e) {
      throw AppException(e.error is AppException ? (e.error as AppException).message : e.message ?? 'Unknown error');
    } catch (e) {
      throw AppException(e.toString());
    }
  }
}
