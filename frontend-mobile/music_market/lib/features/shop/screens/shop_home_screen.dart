import 'package:flutter/material.dart';
import '../../marketplace/screens/marketplace_screen.dart';
import 'my_listings_screen.dart';
import 'sales_screen.dart';

class ShopHomeScreen extends StatefulWidget {
  const ShopHomeScreen({super.key});

  @override
  State<ShopHomeScreen> createState() => _ShopHomeScreenState();
}

class _ShopHomeScreenState extends State<ShopHomeScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const MarketplaceScreen(),
    const MyListingsScreen(),
    const SalesScreen(),
    const Center(child: Text('Assistant Placeholder')),
    const Center(child: Text('Profile Placeholder')),
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
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.store), label: 'Marketplace'),
          BottomNavigationBarItem(icon: Icon(Icons.list), label: 'My Listings'),
          BottomNavigationBarItem(icon: Icon(Icons.monetization_on), label: 'Sales'),
          BottomNavigationBarItem(icon: Icon(Icons.chat), label: 'Assistant'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}
