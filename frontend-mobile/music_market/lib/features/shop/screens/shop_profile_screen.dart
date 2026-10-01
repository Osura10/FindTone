import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../auth/widgets/profile_view.dart';

class ShopProfileScreen extends StatelessWidget {
  const ShopProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ProfileView(
        extraMenuItems: Column(
          children: [
            ListTile(
              leading: const Icon(Icons.monetization_on),
              title: const Text('Sales'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/sales'),
            ),
            const Divider(),
          ],
        ),
      ),
    );
  }
}
