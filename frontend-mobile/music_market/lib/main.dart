import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/routes/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'core/providers/catalog_provider.dart';
import 'features/marketplace/providers/marketplace_provider.dart';
import 'features/wishlist/providers/wishlist_provider.dart';

void main() {
  runApp(const MusicMarketApp());
}

/// The main entry point of the application.
class MusicMarketApp extends StatelessWidget {
  const MusicMarketApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => CatalogProvider()..fetchCatalog()),
        ChangeNotifierProvider(create: (_) => MarketplaceProvider()..fetchListings(refresh: true)),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
      ],
      child: MaterialApp.router(
        title: 'FindTone',
        theme: AppTheme.darkTheme,
        routerConfig: AppRouter.router,
        debugShowCheckedModeBanner: false,
      ),
    );
  }
}
