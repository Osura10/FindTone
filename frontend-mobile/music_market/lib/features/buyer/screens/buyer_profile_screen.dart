import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../auth/providers/auth_provider.dart';

class BuyerProfileScreen extends StatelessWidget {
  const BuyerProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Icon(Icons.person, size: 80, color: Colors.blue),
          const SizedBox(height: 16),
          const Center(child: Text('Buyer Account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold))),
          const SizedBox(height: 32),
          
          ListTile(
            leading: const Icon(Icons.shopping_bag),
            title: const Text('My Orders'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => context.push('/my_orders'),
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Logout', style: TextStyle(color: Colors.red)),
            onTap: () {
              context.read<AuthProvider>().logout();
              context.go('/login');
            },
          ),
        ],
      ),
    );
  }
}
