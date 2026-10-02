import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:music_market/core/providers/catalog_provider.dart';
import 'package:music_market/features/auth/providers/auth_provider.dart';
import 'package:music_market/features/marketplace/models/listing_model.dart';
import 'package:music_market/features/shop/providers/shop_provider.dart';
import 'package:music_market/features/shop/screens/create_post_screen.dart';

final _listing = ListingDetail(
  id: 1,
  sellerId: 7,
  sellerName: 'Seller',
  sellerRole: 'buyer',
  title: 'Test Guitar',
  category: 'Electric Guitar',
  brand: 'Fender',
  model: 'Stratocaster',
  condition: 'excellent',
  year: 2020,
  listingType: 'Sell',
  price: 150000,
  location: 'Colombo 03',
  latitude: 6.9,
  longitude: 79.85,
  description: 'A great guitar',
  status: 'LIVE',
  trustScore: 85,
  priceVerdict: 'FAIR',
  createdAt: DateTime(2026, 9, 1),
  updatedAt: DateTime(2026, 9, 1),
  // An empty URL shows the placeholder, so the test needs no network.
  images: [ListingImage(id: 11, url: '', publicId: 'p', sortOrder: 0)],
  priceHistories: const [],
);

class FakeShopProvider extends ChangeNotifier implements ShopProvider {
  Map<String, String>? sentFields;
  List<int>? sentRemoved;
  int? sentNewCount;

  @override
  Future<ListingDetail> getOwnerListing(int id) async => _listing;

  @override
  Future<ListingDetail> updateListing(int id, Map<String, String> changedFields, List<int> removeImageIds, List<XFile> newImages) async {
    sentFields = changedFields;
    sentRemoved = removeImageIds;
    sentNewCount = newImages.length;
    return _listing;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeCatalogProvider extends ChangeNotifier implements CatalogProvider {
  @override
  List<String> get categories => ['Electric Guitar', 'Acoustic Guitar'];
  @override
  List<String> get brands => ['Fender', 'Yamaha'];
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeAuthProvider extends ChangeNotifier implements AuthProvider {
  @override
  int? get userId => 7;
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

String textOf(WidgetTester tester, Key key) => tester.widget<TextFormField>(find.byKey(key)).controller!.text;

Future<void> pumpEdit(WidgetTester tester, FakeShopProvider shop) async {
  tester.view.physicalSize = const Size(1200, 4000);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(MultiProvider(
    providers: [
      ChangeNotifierProvider<ShopProvider>.value(value: shop),
      ChangeNotifierProvider<CatalogProvider>.value(value: FakeCatalogProvider()),
      ChangeNotifierProvider<AuthProvider>.value(value: FakeAuthProvider()),
    ],
    child: const MaterialApp(home: CreatePostScreen(listingId: 1, showMap: false)),
  ));
  await tester.pumpAndSettle();
}

ButtonStyleButton saveButton(WidgetTester tester) => tester.widget<ButtonStyleButton>(find.byKey(const ValueKey('submit-listing')));

void main() {
  testWidgets('edit mode pre-fills ALL fields from the owner listing', (tester) async {
    await pumpEdit(tester, FakeShopProvider());

    expect(find.text('Edit Listing'), findsOneWidget);
    expect(textOf(tester, const ValueKey('f-title')), 'Test Guitar');
    expect(textOf(tester, const ValueKey('f-model')), 'Stratocaster');
    expect(textOf(tester, const ValueKey('f-year')), '2020');
    expect(textOf(tester, const ValueKey('f-price')), '150000');
    expect(textOf(tester, const ValueKey('f-description')), 'A great guitar');
    expect(textOf(tester, const ValueKey('location-label')), 'Colombo 03');
    // Category and brand are free-text suggestion fields.
    expect(find.widgetWithText(TextFormField, 'Electric Guitar'), findsOneWidget);
    expect(find.widgetWithText(TextFormField, 'Fender'), findsOneWidget);
    expect(find.text('Photos (1/6)'), findsOneWidget);
    expect(find.text('Save Changes'), findsOneWidget);
  });

  testWidgets('Save is disabled until something changes, then sends ONLY the changed field', (tester) async {
    final shop = FakeShopProvider();
    await pumpEdit(tester, shop);

    expect(saveButton(tester).onPressed, isNull);

    await tester.enterText(find.byKey(const ValueKey('f-price')), '140000');
    await tester.pump();
    expect(saveButton(tester).onPressed, isNotNull);

    await tester.tap(find.byKey(const ValueKey('submit-listing')));
    await tester.pumpAndSettle();

    expect(shop.sentFields, {'Price': '140000'});
    expect(shop.sentRemoved, isEmpty);
    expect(shop.sentNewCount, 0);
  });

  testWidgets('changing back to the original value disables Save again', (tester) async {
    await pumpEdit(tester, FakeShopProvider());
    await tester.enterText(find.byKey(const ValueKey('f-title')), 'Test Guitar (mint)');
    await tester.pump();
    expect(saveButton(tester).onPressed, isNotNull);
    await tester.enterText(find.byKey(const ValueKey('f-title')), '  Test Guitar ');
    await tester.pump();
    expect(saveButton(tester).onPressed, isNull);
  });
}
