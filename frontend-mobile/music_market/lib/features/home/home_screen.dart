import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../alerts/providers/alerts_provider.dart';
import '../alerts/screens/my_alerts_screen.dart';
import '../auth/providers/auth_provider.dart';
import '../marketplace/screens/marketplace_screen.dart';
import '../notifications/providers/notifications_provider.dart';
import '../shop/providers/shop_provider.dart';
import '../shop/screens/my_listings_screen.dart';
import '../shop/screens/sales_screen.dart';
import '../wishlist/providers/wishlist_provider.dart';
import '../wishlist/screens/wishlist_screen.dart';
import 'discover_screen.dart';
import 'profile_screen.dart';

/// One bottom-bar tab.
class _Tab {
  final String label;
  final IconData icon;
  final IconData selectedIcon;
  final Widget? screen; // null = an action (e.g. "+ Sell" opens the create page)
  const _Tab(this.label, this.icon, this.selectedIcon, this.screen);
}

/// Home shell for buyers and shops. Both can buy AND sell (same as the web); the bottom bar
/// just puts each role's most used pages first. Everything else is in Profile.
/// The notification bell (with the unread badge) is in each tab's app bar.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;
  NotificationsProvider? _notifications;

  bool get _isShop => context.read<AuthProvider>().role == 'shop';

  late final List<_Tab> _buyerTabs = [
    _Tab('Home', Icons.home_outlined, Icons.home_rounded, DiscoverScreen(onOpenSearch: () => _select(1))),
    const _Tab('Search', Icons.search_rounded, Icons.manage_search_rounded, MarketplaceScreen()),
    const _Tab('Wishlist', Icons.favorite_border_rounded, Icons.favorite_rounded, WishlistScreen()),
    const _Tab('Alerts', Icons.notifications_active_outlined, Icons.notifications_active_rounded, MyAlertsScreen()),
    const _Tab('Profile', Icons.person_outline_rounded, Icons.person_rounded, ProfileScreen()),
  ];

  late final List<_Tab> _shopTabs = [
    _Tab('Home', Icons.home_outlined, Icons.home_rounded, DiscoverScreen(onOpenSearch: () => _openSearch())),
    const _Tab('My Listings', Icons.inventory_2_outlined, Icons.inventory_2_rounded, MyListingsScreen()),
    const _Tab('Sell', Icons.add_circle_outline_rounded, Icons.add_circle_rounded, null),
    const _Tab('Sales', Icons.payments_outlined, Icons.payments_rounded, SalesScreen()),
    const _Tab('Profile', Icons.person_outline_rounded, Icons.person_rounded, ProfileScreen()),
  ];

  List<_Tab> get _tabs => _isShop ? _shopTabs : _buyerTabs;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      _notifications = context.read<NotificationsProvider>()..startPolling();
      context.read<WishlistProvider>().fetchWishlist();
      final message = context.read<AuthProvider>().takeStatusMessage();
      if (message != null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), duration: const Duration(seconds: 6)));
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Refresh the badge as soon as the app is opened again; pause polling in the background.
    if (state == AppLifecycleState.resumed) {
      _notifications?.startPolling();
    } else if (state == AppLifecycleState.paused) {
      _notifications?.stopPolling();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _notifications?.stopPolling();
    super.dispose();
  }

  /// Shops have no Search tab: their search opens as a normal page.
  void _openSearch() => context.push('/search');

  Future<void> _select(int index) async {
    final tab = _tabs[index];
    if (tab.screen == null) {
      // "+ Sell": open the create page, then refresh My Listings.
      final shop = context.read<ShopProvider>();
      await context.push('/shop/create');
      shop.fetchMyListings();
      return;
    }
    setState(() => _currentIndex = index);
    // Tabs stay alive in an IndexedStack, so reload the data each time a tab is opened.
    switch (tab.label) {
      case 'My Listings':
        context.read<ShopProvider>().fetchMyListings();
      case 'Sales':
        context.read<ShopProvider>().fetchSales();
      case 'Wishlist':
        context.read<WishlistProvider>().fetchWishlist();
      case 'Alerts':
        context.read<AlertsProvider>().fetchAlerts();
    }
  }

  @override
  Widget build(BuildContext context) {
    final offline = context.watch<AuthProvider>().isOffline;
    final tabs = _tabs;
    final c = context.colors;

    return Scaffold(
      body: Column(
        children: [
          if (offline)
            MaterialBanner(
              backgroundColor: c.warningSoft,
              content: Text('Cannot reach the server. Some data may be missing – pull down to retry.', style: TextStyle(color: c.warning)),
              leading: Icon(Icons.cloud_off_rounded, color: c.warning),
              actions: [
                TextButton(onPressed: () => context.read<AuthProvider>().loadAuthData(), child: const Text('Retry')),
              ],
            ),
          Expanded(
            child: IndexedStack(
              index: _currentIndex,
              children: [for (final t in tabs) t.screen ?? const SizedBox.shrink()],
            ),
          ),
        ],
      ),
      bottomNavigationBar: DecoratedBox(
        decoration: BoxDecoration(border: Border(top: BorderSide(color: c.border))),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: _select,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            for (final t in tabs)
              t.screen == null
                  ? NavigationDestination(
                      icon: Container(
                        width: 44,
                        height: 32,
                        decoration: BoxDecoration(color: context.scheme.primary, borderRadius: BorderRadius.circular(AppRadius.md)),
                        child: const Icon(Icons.add_rounded, color: Colors.white),
                      ),
                      label: t.label,
                      tooltip: 'Sell an instrument',
                    )
                  : NavigationDestination(icon: Icon(t.icon), selectedIcon: Icon(t.selectedIcon), label: t.label),
          ],
        ),
      ),
    );
  }
}
