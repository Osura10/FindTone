import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:music_market/core/theme/app_theme.dart';
import 'package:music_market/core/widgets/common_widgets.dart';
import 'package:music_market/core/widgets/primary_button.dart';
import 'package:music_market/features/auth/providers/auth_provider.dart';
import 'package:music_market/features/marketplace/models/listing_model.dart';
import 'package:music_market/features/marketplace/widgets/listing_card.dart';
import 'package:music_market/features/wishlist/providers/wishlist_provider.dart';

/// Wraps a widget in the app theme (light or dark).
Widget themed(Widget child, {Brightness brightness = Brightness.light}) => MaterialApp(
      theme: brightness == Brightness.light ? AppTheme.light : AppTheme.dark,
      home: Scaffold(body: Center(child: child)),
    );

class FakeAuth extends ChangeNotifier implements AuthProvider {
  @override
  int? get userId => 7;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeWishlist extends ChangeNotifier implements WishlistProvider {
  @override
  bool isInWishlist(int listingId) => listingId == 1;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

ListingSummary listing({int id = 1, String status = 'LIVE', int sellerId = 2}) => ListingSummary.fromJson({
      'id': id,
      'sellerId': sellerId,
      'sellerName': 'Kandy Music House',
      'title': 'Yamaha F310 Acoustic Guitar',
      'category': 'Acoustic Guitar',
      'brand': 'Yamaha',
      'model': 'F310',
      'condition': 'like_new',
      'listingType': 'Sell',
      'price': 45000,
      'location': 'Kandy',
      'status': status,
      'createdAt': '2026-09-01T10:00:00Z',
      'updatedAt': '2026-09-01T10:00:00Z',
    });

Widget card(ListingSummary l) => MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: FakeAuth()),
        ChangeNotifierProvider<WishlistProvider>.value(value: FakeWishlist()),
      ],
      child: themed(SizedBox(width: 200, height: 320, child: ListingCard(listing: l))),
    );

void main() {
  test('both themes use Material 3, the brand purple, Inter and the status colours', () {
    for (final theme in [AppTheme.light, AppTheme.dark]) {
      expect(theme.useMaterial3, isTrue);
      expect(theme.textTheme.bodyMedium?.fontFamily, 'Inter');
      expect(theme.extension<AppColors>(), isNotNull);
    }
    expect(AppTheme.light.colorScheme.primary, const Color(0xFF6D28D9));
    expect(AppTheme.dark.brightness, Brightness.dark);
  });

  testWidgets('StatusChip shows friendly labels', (tester) async {
    await tester.pumpWidget(themed(const Column(children: [
      StatusChip(status: 'LIVE'),
      StatusChip(status: 'FLAGGED'),
      StatusChip(status: 'PENDING'),
      StatusChip(status: 'SOLD'),
    ])));
    expect(find.text('Live'), findsOneWidget);
    expect(find.text('Under review'), findsOneWidget);
    expect(find.text('Pending check'), findsOneWidget);
    expect(find.text('Sold'), findsOneWidget);
  });

  testWidgets('PriceTag formats LKR and TrustChip shows the warning band', (tester) async {
    await tester.pumpWidget(themed(const Column(children: [PriceTag(amount: 45000), TrustChip(score: 55), TrustChip(score: null)])));
    expect(find.bySemanticsLabel('LKR 45,000'), findsOneWidget);
    expect(find.text('Trust 55/100 · warning'), findsOneWidget);
    expect(find.text('Not checked'), findsOneWidget);
  });

  testWidgets('ErrorState retry and EmptyState action are tappable', (tester) async {
    var retried = 0;
    await tester.pumpWidget(themed(ErrorState(message: 'No connection', onRetry: () => retried++), brightness: Brightness.dark));
    await tester.tap(find.text('Try again'));
    expect(retried, 1);

    await tester.pumpWidget(themed(EmptyState(title: 'Nothing here', message: 'Add something', action: FilledButton(onPressed: () {}, child: const Text('Add')))));
    expect(find.text('Nothing here'), findsOneWidget);
    expect(find.text('Add'), findsOneWidget);
  });

  testWidgets('PrimaryButton shows a spinner and is disabled while loading', (tester) async {
    var taps = 0;
    await tester.pumpWidget(themed(PrimaryButton(text: 'Save', isLoading: true, onPressed: () => taps++)));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Save'), findsNothing);
    await tester.tap(find.byType(FilledButton));
    expect(taps, 0);
  });

  testWidgets('ListingCard: price, condition, wishlist heart; SOLD OUT ribbon; own listing badge', (tester) async {
    await tester.pumpWidget(card(listing()));
    await tester.pump();
    expect(find.text('Yamaha F310 Acoustic Guitar'), findsOneWidget);
    expect(find.text('Like New'), findsOneWidget);
    expect(find.byTooltip('Remove from wishlist'), findsOneWidget); // listing 1 is saved
    expect(find.text('SOLD OUT'), findsNothing);

    await tester.pumpWidget(card(listing(id: 2, status: 'SOLD')));
    await tester.pump();
    expect(find.text('SOLD OUT'), findsOneWidget);
    expect(find.byTooltip('Add to wishlist'), findsNothing); // no heart on sold items

    await tester.pumpWidget(card(listing(id: 3, sellerId: 7)));
    await tester.pump();
    expect(find.text('Your listing'), findsOneWidget);
    expect(find.byTooltip('Add to wishlist'), findsNothing); // no heart on your own listing
  });
}
