import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:music_market/features/notifications/models/notification_model.dart';

void main() {
  group('NotificationModel', () {
    test('parses a real GET /api/notifications response (no userId in it)', () {
      // Saved from the running backend on 2026-10-01.
      final raw = jsonDecode(File('test/fixtures/notifications_api_sample.json').readAsStringSync()) as List;
      final items = raw.map((e) => NotificationModel.fromJson(Map<String, dynamic>.from(e as Map))).toList();

      expect(items.map((n) => n.type), containsAll(['ORDER_PLACED', 'PRICE_DROP', 'NEW_MATCH']));
      for (final n in items) {
        expect(n.id, greaterThan(0));
        expect(n.title, isNotEmpty);
        expect(n.message, isNotEmpty);
        expect(n.listing, isNotNull);
        expect(n.targetListingId, n.listingId);
        expect(n.listing!.price, greaterThan(0));
      }
      final match = items.firstWhere((n) => n.type == 'NEW_MATCH');
      expect(match.savedSearchId, isNotNull);
      final drop = items.firstWhere((n) => n.type == 'PRICE_DROP');
      expect(drop.message, contains('LKR'));
    });

    test('missing or null fields never throw', () {
      final n = NotificationModel.fromJson({'id': 5, 'type': 'LISTING_REMOVED', 'message': null, 'listing': null});
      expect(n.title, 'LISTING REMOVED');
      expect(n.message, '');
      expect(n.isRead, isFalse);
      expect(n.listingId, isNull);
      expect(n.targetListingId, isNull);

      final empty = NotificationModel.fromJson({});
      expect(empty.id, 0);
      expect(empty.type, 'UNKNOWN');
    });

    test('copyWith only changes isRead', () {
      final n = NotificationModel.fromJson({'id': 1, 'type': 'PRICE_DROP', 'title': 't', 'message': 'm', 'listingId': 9});
      final read = n.copyWith(isRead: true);
      expect(read.isRead, isTrue);
      expect(read.listingId, 9);
      expect(read.title, 't');
    });
  });
}
