import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../auth/widgets/profile_view.dart';

/// Profile tab for buyers and shops, with links to the other pages (same as the web sidebar).
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Widget link(IconData icon, String title, String path) => Column(
          children: [
            ListTile(
              leading: Icon(icon),
              title: Text(title),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push(path),
            ),
            const Divider(height: 1),
          ],
        );

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ProfileView(
        extraMenuItems: Column(
          children: [
            link(Icons.add_box_outlined, 'Create Post', '/shop/create'),
            link(Icons.favorite_border, 'Wishlist', '/wishlist'),
            link(Icons.notifications_active_outlined, 'My Alerts', '/my_alerts'),
            link(Icons.shopping_bag_outlined, 'My Orders', '/my_orders'),
            link(Icons.monetization_on_outlined, 'My Sales', '/sales'),
          ],
        ),
      ),
    );
  }
}
