import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:music_market/features/shop/screens/create_post_screen.dart';
import 'package:music_market/features/marketplace/providers/marketplace_provider.dart';
import 'package:music_market/core/providers/catalog_provider.dart';
import 'package:music_market/features/shop/providers/shop_provider.dart';
import 'package:music_market/features/marketplace/models/listing_model.dart';

class FakeMarketplaceProvider extends ChangeNotifier implements MarketplaceProvider {
  @override
  Future<ListingDetail?> getListingDetails(int id) async {
    return ListingDetail(
      id: 1,
      title: 'Test Guitar',
      description: 'A great guitar',
      price: 1500,
      category: 'Electric Guitar',
      brand: 'Fender',
      model: 'Stratocaster',
      condition: 'excellent',
      year: 2020,
      location: 'Colombo',
      latitude: 6.9,
      longitude: 79.8,
      sellerId: 1,
      sellerName: 'John',
      sellerRole: 'shop',
      status: 'LIVE',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
      priceHistories: [],
      images: [],
      listingType: 'Sell',
      priceVerdict: 'FAIR',
    );
  }
  
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeCatalogProvider extends ChangeNotifier implements CatalogProvider {
  @override
  List<String> get categories => ['Electric Guitar'];
  @override
  List<String> get brands => ['Fender'];
  
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class FakeShopProvider extends ChangeNotifier implements ShopProvider {
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('Edit screen pre-fills title and shows Save Changes', (WidgetTester tester) async {
    final mockMarketplace = FakeMarketplaceProvider();
    final mockCatalog = FakeCatalogProvider();
    final mockShop = FakeShopProvider();

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<MarketplaceProvider>.value(value: mockMarketplace),
          ChangeNotifierProvider<CatalogProvider>.value(value: mockCatalog),
          ChangeNotifierProvider<ShopProvider>.value(value: mockShop),
        ],
        child: const MaterialApp(
          home: CreatePostScreen(listingId: 1),
        ),
      ),
    );

    await tester.pumpAndSettle(); // Wait for data to load and UI to render

    expect(find.text('Test Guitar'), findsOneWidget); // Title should be pre-filled
    await tester.drag(find.byType(ListView).first, const Offset(0, -1000));
    await tester.pumpAndSettle();
    expect(find.text('Save Changes'), findsOneWidget); // Button text should be Save Changes
    expect(find.text('Edit Listing'), findsOneWidget); // Appbar Title
  });
}
