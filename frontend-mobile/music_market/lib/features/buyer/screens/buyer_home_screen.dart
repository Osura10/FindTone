import 'package:flutter/material.dart';
import '../../marketplace/screens/marketplace_screen.dart';
import '../../wishlist/screens/wishlist_screen.dart';
import 'buyer_profile_screen.dart';
import '../../assistant/screens/assistant_screen.dart';
import '../../notifications/screens/notifications_screen.dart';
import 'package:provider/provider.dart';
import '../../notifications/providers/notifications_provider.dart';

class BuyerHomeScreen extends StatefulWidget {
  const BuyerHomeScreen({super.key});

  @override
  State<BuyerHomeScreen> createState() => _BuyerHomeScreenState();
}

class _BuyerHomeScreenState extends State<BuyerHomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const MarketplaceScreen(),
    const WishlistScreen(),
    const AssistantScreen(),
    const NotificationsScreen(),
    const BuyerProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        type: BottomNavigationBarType.fixed,
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.store), label: 'Marketplace'),
          const BottomNavigationBarItem(icon: Icon(Icons.favorite), label: 'Wishlist'),
          const BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'Assistant'),
          BottomNavigationBarItem(
            icon: context.watch<NotificationsProvider>().unreadCount > 0
                ? Badge(
                    label: Text(context.watch<NotificationsProvider>().unreadCount.toString()),
                    child: const Icon(Icons.notifications),
                  )
                : const Icon(Icons.notifications),
            label: 'Notifications',
          ),
          const BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
