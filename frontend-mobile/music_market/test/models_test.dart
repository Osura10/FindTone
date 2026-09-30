import 'package:flutter_test/flutter_test.dart';
import 'package:music_market/features/shop/models/price_check_model.dart';
import 'package:music_market/features/marketplace/models/listing_model.dart';
import 'package:music_market/features/shop/models/order_model.dart';
import 'package:music_market/core/models/future_models.dart';

void main() {
  group('JSON Parsing Tests', () {
    test('FairPriceResult parses snake_case correctly', () {
      final json = {
        "fair_price": 35000,
        "fair_range": {
          "min": 29100,
          "max": 37000
        },
        "asking_price": 32000,
        "deviation_percent": 9.4,
        "verdict": "FAIR",
        "confidence": "HIGH",
        "flag_for_trust": false,
        "extras_detected": ["case"],
        "explanation": "Looks good.",
        "used_fallback": false
      };

      final result = FairPriceResult.fromJson(json);
      
      expect(result.fairPrice, 35000.0);
      expect(result.fairRange.min, 29100.0);
      expect(result.fairRange.max, 37000.0);
      expect(result.askingPrice, 32000.0);
      expect(result.verdict, 'FAIR');
      expect(result.extrasDetected, contains('case'));
    });

    test('ListingSummary parses camelCase correctly and handles numbers', () {
      final json = {
        "id": 1,
        "sellerId": 2,
        "title": "Yamaha F310",
        "category": "Acoustic Guitar",
        "brand": "Yamaha",
        "model": "F310",
        "condition": "Good",
        "listingType": "Sell",
        "price": 85000,
        "location": "Colombo",
        "status": "LIVE",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      };

      final result = ListingSummary.fromJson(json);
      
      expect(result.title, 'Yamaha F310');
      expect(result.price, 85000.0);
    });

    test('OrderModel parses camelCase correctly and handles numbers safely', () {
      final json = {
        "id": 10,
        "listingId": 1,
        "listingTitle": "Yamaha F310",
        "amount": 33000,
        "paymentMethod": "Card",
        "status": "Paid",
        "fullName": "John Doe",
        "phone": "0771234567",
        "addressLine": "123 Main St",
        "city": "Colombo",
        "createdAt": "2024-01-01T00:00:00Z"
      };

      final result = OrderModel.fromJson(json);
      
      expect(result.amount, 33000.0);
      expect(result.listingTitle, 'Yamaha F310');
      expect(result.paymentMethod, 'Card');
    });

    test('ListingDetail parses camelCase correctly and handles numbers', () {
      final json = {
        "id": 1,
        "sellerId": 2,
        "sellerName": "John",
        "sellerRole": "User",
        "title": "Yamaha F310",
        "category": "Acoustic Guitar",
        "brand": "Yamaha",
        "model": "F310",
        "condition": "Good",
        "listingType": "Sell",
        "price": 85000,
        "location": "Colombo",
        "description": "Great guitar",
        "status": "LIVE",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z",
        "images": [],
        "priceHistories": []
      };

      final result = ListingDetail.fromJson(json);
      expect(result.price, 85000.0);
      expect(result.title, 'Yamaha F310');
    });

    test('ShoppingAssistantResult parses snake_case correctly', () {
      final json = {
        "reply": "Here are some options.",
        "session_id": "abc-123",
        "used_fallback": true
      };

      final result = ShoppingAssistantResult.fromJson(json);
      expect(result.reply, 'Here are some options.');
      expect(result.sessionId, 'abc-123');
      expect(result.usedFallback, true);
    });

    test('ParseAlertResult parses snake_case correctly', () {
      final json = {
        "query": "Acoustic guitars under 50000",
        "category": "Acoustic Guitar",
        "brand": "",
        "max_price": 50000
      };

      final result = ParseAlertResult.fromJson(json);
      expect(result.maxPrice, 50000.0);
      expect(result.category, 'Acoustic Guitar');
    });

    test('NotificationModel parses camelCase correctly', () {
      final json = {
        "id": 5,
        "message": "Your item sold",
        "isRead": false,
        "createdAt": "2024-01-01T00:00:00Z"
      };

      final result = NotificationModel.fromJson(json);
      expect(result.id, 5);
      expect(result.isRead, false);
    });
  });
}
