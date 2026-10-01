import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../assistant/screens/assistant_screen.dart';
import '../auth/providers/auth_provider.dart';
import '../marketplace/screens/marketplace_screen.dart';
import '../notifications/providers/notifications_provider.dart';
import '../notifications/screens/notifications_screen.dart';
import '../shop/providers/shop_provider.dart';
import '../shop/screens/my_listings_screen.dart';
import '../wishlist/providers/wishlist_provider.dart';
import 'profile_screen.dart';

/// Home for BOTH buyers and shops (same features as the web): marketplace, my listings,
/// notifications (with the unread badge), assistant and profile.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  int _currentIndex = 0;
  NotificationsProvider? _notifications;

  static const _screens = <Widget>[
    MarketplaceScreen(),
    MyListingsScreen(),
    NotificationsScreen(),
    AssistantScreen(),
    ProfileScreen(),
  ];

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

  void _onTap(int index) {
    setState(() => _currentIndex = index);
    // Tabs stay alive in an IndexedStack, so reload the list each time the tab is opened
    // (otherwise the badge can say 2 while the list still shows the old items).
    if (index == 2) _notifications?.fetchNotifications();
    if (index == 1) context.read<ShopProvider>().fetchMyListings();
  }

  @override
  Widget build(BuildContext context) {
    final unread = context.watch<NotificationsProvider>().unreadCount;
    final offline = context.watch<AuthProvider>().isOffline;

    return Scaffold(
      body: Column(
        children: [
          if (offline)
            MaterialBanner(
              content: const Text('Cannot reach the server. Some data may be missing – pull down to retry.'),
              leading: const Icon(Icons.cloud_off, color: Colors.orange),
              actions: [
                TextButton(
                  onPressed: () => context.read<AuthProvider>().loadAuthData(),
                  child: const Text('Retry'),
                ),
              ],
            ),
          Expanded(child: IndexedStack(index: _currentIndex, children: _screens)),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: _onTap,
        type: BottomNavigationBarType.fixed,
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.store), label: 'Marketplace'),
          const BottomNavigationBarItem(icon: Icon(Icons.list_alt), label: 'My Listings'),
          BottomNavigationBarItem(
            icon: Badge(
              key: const ValueKey('notification-badge'),
              isLabelVisible: unread > 0,
              label: Text(unread > 99 ? '99+' : '$unread'),
              child: const Icon(Icons.notifications),
            ),
            label: 'Notifications',
          ),
          const BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'Assistant'),
          const BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
