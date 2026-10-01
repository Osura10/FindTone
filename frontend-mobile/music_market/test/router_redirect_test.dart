import 'package:flutter_test/flutter_test.dart';
import 'package:music_market/core/routes/app_router.dart';

String? go(String location, {bool loading = false, bool loggedIn = true, String? role = 'buyer'}) =>
    authRedirect(loading: loading, loggedIn: loggedIn, role: role, location: location);

void main() {
  group('authRedirect', () {
    test('while loading everything waits on the splash screen', () {
      expect(go('/', loading: true), isNull);
      expect(go('/buyer_home', loading: true), '/');
      expect(go('/listing/5', loading: true, loggedIn: false), '/');
    });

    test('logged out users only see login and register', () {
      expect(go('/login', loggedIn: false, role: null), isNull);
      expect(go('/register', loggedIn: false, role: null), isNull);
      expect(go('/', loggedIn: false, role: null), '/login');
      expect(go('/shop_home', loggedIn: false, role: null), '/login');
      expect(go('/checkout/3', loggedIn: false, role: null), '/login');
    });

    test('logged in users go to the home for their role', () {
      expect(go('/', role: 'shop'), '/shop_home');
      expect(go('/login', role: 'buyer'), '/buyer_home');
      expect(go('/register', role: 'shop'), '/shop_home');
      expect(go('/buyer_home', role: 'shop'), '/shop_home');
      expect(go('/shop_home', role: 'buyer'), '/buyer_home');
      expect(go('/buyer_home', role: 'buyer'), isNull);
    });

    test('buyers and shops can open every feature page', () {
      for (final role in ['buyer', 'shop']) {
        for (final path in ['/checkout/3', '/my_orders', '/sales', '/my_alerts', '/wishlist', '/notifications', '/shop/create', '/shop/edit/7', '/listing/7']) {
          expect(go(path, role: role), isNull, reason: '$role -> $path');
        }
      }
    });

    test('admins are never let in on mobile', () {
      expect(go('/buyer_home', role: 'admin'), '/login');
      expect(go('/login', role: 'admin'), isNull);
    });
  });
}
