import 'package:flutter_test/flutter_test.dart';
import 'package:music_market/features/buyer/checkout_validation.dart';
import 'package:music_market/features/shop/models/listing_form.dart';

const original = ListingFormValues(
  title: 'Yamaha F310',
  category: 'Acoustic Guitar',
  brand: 'Yamaha',
  model: 'F310',
  condition: 'good',
  year: '2021',
  price: '45000',
  location: 'Colombo',
  description: 'Nice',
  latitude: 6.9,
  longitude: 79.8,
);

ListingFormValues edit({String? price, String? title, String? year, String? description, double? lat}) => ListingFormValues(
      title: title ?? original.title,
      category: original.category,
      brand: original.brand,
      model: original.model,
      condition: original.condition,
      year: year ?? original.year,
      price: price ?? original.price,
      location: original.location,
      description: description ?? original.description,
      latitude: lat ?? original.latitude,
      longitude: original.longitude,
    );

void main() {
  group('changedListingFields', () {
    test('nothing changed -> empty payload', () {
      expect(changedListingFields(original, edit()), isEmpty);
    });

    test('only the price -> only Price is sent', () {
      expect(changedListingFields(original, edit(price: '40000')), {'Price': '40000'});
    });

    test('same number written differently is not a change', () {
      expect(changedListingFields(original, edit(price: ' 45000.0 ')), isEmpty);
    });

    test('extra spaces in text are not a change, a real edit is', () {
      expect(changedListingFields(original, edit(title: '  Yamaha   F310 ')), isEmpty);
      expect(changedListingFields(original, edit(title: 'Yamaha F310 + case')), {'Title': 'Yamaha F310 + case'});
    });

    test('emptied year/description are ignored (the API cannot clear them)', () {
      expect(changedListingFields(original, edit(year: '', description: '')), isEmpty);
    });

    test('moving the pin sends both coordinates', () {
      final changes = changedListingFields(original, edit(lat: 7.29));
      expect(changes.keys, unorderedEquals(['Latitude', 'Longitude']));
      expect(changes['Latitude'], '7.29');
    });

    test('price changes trigger the AI fields set', () {
      expect(aiFieldNames.contains('Price'), isTrue);
      expect(aiFieldNames.contains('Description'), isFalse);
    });
  });

  group('validateCheckout (same rules as the backend)', () {
    final now = DateTime(2026, 10, 1);
    CheckoutInput card({String number = '1234 1234 1234 1234', String expiry = '12/30', String cvv = '123', String phone = '0771234567'}) =>
        CheckoutInput(fullName: 'A', phone: phone, addressLine: 'x', city: 'c', paymentMethod: 'CARD', cardNumber: number, holderName: 'A', expiry: expiry, cvv: cvv);

    test('messages match the backend', () {
      expect(validateCheckout(card(), now: now), isNull);
      expect(validateCheckout(card(number: '4111 1111 1111 1111'), now: now), 'Invalid demo card number. Use 1234 1234 1234 1234.');
      expect(validateCheckout(card(expiry: '13/30'), now: now), 'Invalid expiry. Use MM/YY.');
      expect(validateCheckout(card(expiry: '09/26'), now: now), 'Card expired.');
      expect(validateCheckout(card(cvv: '12'), now: now), 'Invalid CVV. It must be 3 digits.');
      expect(validateCheckout(card(phone: '123'), now: now), 'Invalid Sri Lankan phone number.');
    });

    test('payload sends the card number without spaces, and no card for COD', () {
      final payload = checkoutPayload(7, card());
      expect(payload['card']['number'], '1234123412341234');
      expect(payload['listingId'], 7);
      const cod = CheckoutInput(fullName: 'A', phone: '0771234567', addressLine: 'x', city: 'c', paymentMethod: 'COD');
      expect(validateCheckout(cod, now: now), isNull);
      expect(checkoutPayload(7, cod)['card'], isNull);
    });
  });
}
