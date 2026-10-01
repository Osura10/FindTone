import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../auth/widgets/profile_view.dart';

class BuyerProfileScreen extends StatelessWidget {
  const BuyerProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ProfileView(
        extraMenuItems: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.shopping_bag),
              title: const Text('My Orders'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/my_orders'),
            ),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.notifications_active),
              title: const Text('My Alerts'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/my_alerts'),
            ),
            const Divider(),
          ],
        ),
      ),
    );
  }
}
