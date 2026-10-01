import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/routes/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/providers/auth_provider.dart';
import 'core/providers/catalog_provider.dart';
import 'features/marketplace/providers/marketplace_provider.dart';
import 'features/wishlist/providers/wishlist_provider.dart';
import 'features/shop/providers/shop_provider.dart';
import 'features/buyer/providers/buyer_provider.dart';
import 'features/alerts/providers/alerts_provider.dart';
import 'features/assistant/providers/assistant_provider.dart';
import 'features/notifications/providers/notifications_provider.dart';

import 'dart:async';
import 'package:music_market/core/utils/app_logger.dart';

void main() {
  runZonedGuarded(() {
    WidgetsFlutterBinding.ensureInitialized();
    FlutterError.onError = (FlutterErrorDetails details) {
      logDebug('FlutterError', details.exceptionAsString());
    };

    ErrorWidget.builder = (FlutterErrorDetails details) {
      bool inDebug = false;
      assert(() {
        inDebug = true;
        return true;
      }());
      
      return Material(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 48),
                const SizedBox(height: 16),
                const Text('Something went wrong', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                if (inDebug)
                  Expanded(
                    child: SingleChildScrollView(
                      child: Text(details.exceptionAsString(), style: const TextStyle(fontSize: 12)),
                    ),
                  ),
              ],
            ),
          ),
        ),
      );
    };

    runApp(const MusicMarketApp());
  }, (error, stackTrace) {
    logDebug('runZonedGuarded', '$error\n$stackTrace');
  });
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
        ChangeNotifierProvider(create: (_) => ShopProvider()),
        ChangeNotifierProvider(create: (_) => BuyerProvider()),
        ChangeNotifierProvider(create: (_) => AlertsProvider()),
        ChangeNotifierProvider(create: (_) => AssistantProvider()),
        ChangeNotifierProvider(create: (_) => NotificationsProvider()),
      ],
      child: Builder(
        builder: (context) {
          final authProvider = Provider.of<AuthProvider>(context, listen: false);
          return MaterialApp.router(
            title: 'FindTone',
            theme: AppTheme.darkTheme,
            routerConfig: AppRouter.getRouter(authProvider),
            debugShowCheckedModeBanner: false,
          );
        }
      ),
    );
  }
}
