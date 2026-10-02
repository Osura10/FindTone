import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../marketplace/models/listing_model.dart';
import '../models/order_model.dart';
import '../models/price_check_model.dart';

/// Selling side for BOTH buyers and shops: my listings, create/edit, price, delete, sales.
class ShopProvider with ChangeNotifier {
  /// Creating/editing can run the AI checks (Fair Price + Trust + alerts), which can take minutes.
  static const aiTimeout = Duration(seconds: 300);

  final ApiClient _apiClient = ApiClient();

  List<ListingSummary> _myListings = [];
  List<OrderModel> _sales = [];
  bool _isLoadingListings = false;
  bool _isLoadingSales = false;
  String? _listingsError;
  String? _salesError;

  List<ListingSummary> get myListings => _myListings;
  List<OrderModel> get sales => _sales;
  bool get isLoadingListings => _isLoadingListings;
  bool get isLoadingSales => _isLoadingSales;
  String? get listingsError => _listingsError;
  String? get salesError => _salesError;

  Future<void> fetchMyListings() async {
    _isLoadingListings = true;
    _listingsError = null;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/listings/mine');
      _myListings = (response.data as List).map((e) => ListingSummary.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      _listingsError = describeError(e, 'Could not load your listings.');
    } finally {
      _isLoadingListings = false;
      notifyListeners();
    }
  }

  Future<void> fetchSales() async {
    _isLoadingSales = true;
    _salesError = null;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/orders/sales');
      _sales = (response.data as List).map((e) => OrderModel.fromJson(Map<String, dynamic>.from(e))).toList();
    } catch (e) {
      _salesError = describeError(e, 'Could not load your sales.');
    } finally {
      _isLoadingSales = false;
      notifyListeners();
    }
  }

  /// The owner view of a listing (includes trust score and fair-price fields). Throws AppException.
  Future<ListingDetail> getOwnerListing(int id) async {
    try {
      final response = await _apiClient.dio.get('/listings/$id');
      return ListingDetail.fromJson(Map<String, dynamic>.from(response.data));
    } catch (e) {
      throw AppException(describeError(e, 'Could not load the listing.'), statusCode: statusOf(e));
    }
  }

  /// Deletes a listing. Throws AppException with the backend message (e.g. 409 "has an order").
  Future<void> deleteListing(int id) async {
    try {
      await _apiClient.dio.delete('/listings/$id');
      _myListings.removeWhere((l) => l.id == id);
      notifyListeners();
    } catch (e) {
      throw AppException(describeError(e, 'Could not delete the listing.'), statusCode: statusOf(e));
    }
  }

  /// PUT /listings/{id}/price. Returns the updated owner listing (new AI result).
  Future<ListingDetail> updatePrice(int id, double newPrice) async {
    try {
      final response = await _apiClient.dio.put(
        '/listings/$id/price',
        data: {'newPrice': newPrice},
        options: Options(receiveTimeout: aiTimeout),
      );
      await fetchMyListings();
      return ListingDetail.fromJson(Map<String, dynamic>.from(response.data));
    } catch (e) {
      throw AppException(describeError(e, 'Could not update the price.'), statusCode: statusOf(e));
    }
  }

  Future<FairPriceResult> checkPrice(Map<String, dynamic> data) async {
    try {
      final response = await _apiClient.dio.post(
        '/listings/price-check',
        data: data,
        options: Options(receiveTimeout: const Duration(seconds: 150)),
      );
      return FairPriceResult.fromJson(Map<String, dynamic>.from(response.data));
    } catch (e) {
      throw AppException(describeError(e, 'Price check failed. Please try again.'), statusCode: statusOf(e));
    }
  }

  Future<List<MultipartFile>> _files(List<XFile> images) async => [
        for (final image in images) MultipartFile.fromBytes(await image.readAsBytes(), filename: image.name),
      ];

  /// POST /listings (multipart). Returns the created owner listing.
  Future<ListingDetail> createListing(Map<String, String> fields, List<XFile> images) async {
    try {
      final formData = FormData.fromMap(fields);
      for (final file in await _files(images)) {
        formData.files.add(MapEntry('Images', file));
      }
      final response = await _apiClient.dio.post('/listings', data: formData, options: Options(receiveTimeout: aiTimeout));
      await fetchMyListings();
      return ListingDetail.fromJson(Map<String, dynamic>.from(response.data));
    } catch (e) {
      throw AppException(describeError(e, 'Could not create the listing.'), statusCode: statusOf(e));
    }
  }

  /// PATCH /listings/{id} (multipart) with ONLY the changed fields, removed photo ids and new photos.
  Future<ListingDetail> updateListing(int id, Map<String, String> changedFields, List<int> removeImageIds, List<XFile> newImages) async {
    try {
      final formData = FormData.fromMap(changedFields);
      for (final imageId in removeImageIds) {
        formData.fields.add(MapEntry('RemoveImageIds', imageId.toString()));
      }
      for (final file in await _files(newImages)) {
        formData.files.add(MapEntry('NewImages', file));
      }
      final response = await _apiClient.dio.patch('/listings/$id', data: formData, options: Options(receiveTimeout: aiTimeout));
      await fetchMyListings();
      return ListingDetail.fromJson(Map<String, dynamic>.from(response.data));
    } catch (e) {
      throw AppException(describeError(e, 'Could not save the changes.'), statusCode: statusOf(e));
    }
  }
}
