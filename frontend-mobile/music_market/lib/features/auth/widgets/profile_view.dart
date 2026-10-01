import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';

class ProfileView extends StatefulWidget {
  final Widget extraMenuItems;
  
  const ProfileView({super.key, required this.extraMenuItems});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AuthProvider>().fetchProfile();
    });
  }

  void _editPhone(BuildContext context, String currentPhone) {
    final controller = TextEditingController(text: currentPhone);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Phone'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Enter new phone number'),
          keyboardType: TextInputType.phone,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                context.read<AuthProvider>().updatePhone(controller.text.trim());
                Navigator.pop(context);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _editLocation(BuildContext context, String currentLoc) {
    final controller = TextEditingController(text: currentLoc);
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Location'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Enter new location'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().isNotEmpty) {
                context.read<AuthProvider>().updateLocation(controller.text.trim());
                Navigator.pop(context);
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _changePassword(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Change Password'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Enter new password'),
          obscureText: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              if (controller.text.trim().length >= 6) {
                context.read<AuthProvider>().updatePassword(controller.text.trim());
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password updated')));
                Navigator.pop(context);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password must be at least 6 characters')));
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Account'),
        content: const Text('Are you sure you want to permanently delete your account? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            onPressed: () async {
              final auth = context.read<AuthProvider>();
              Navigator.pop(context);
              await auth.deleteAccount();
              if (context.mounted) context.go('/login');
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Future<void> _pickImage(BuildContext context) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.gallery);
    if (picked != null) {
      if (context.mounted) {
        await context.read<AuthProvider>().uploadAvatar(picked.path);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final profile = auth.userProfile;

    if (profile == null) {
      return const Center(child: CircularProgressIndicator());
    }

    final imageUrl = profile['profileImageUrl'];
    final name = profile['name'] ?? 'User';
    final email = profile['email'] ?? '';
    final role = profile['role']?.toString().toUpperCase() ?? '';
    final phone = profile['phoneNumber'] ?? 'No phone added';
    final address = profile['address'] ?? 'No address added';

    return RefreshIndicator(
      onRefresh: () => auth.fetchProfile(),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: Stack(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundImage: imageUrl != null ? NetworkImage(imageUrl) : null,
                  child: imageUrl == null ? const Icon(Icons.person, size: 50) : null,
                ),
                Positioned(
                  bottom: 0,
                  right: 0,
                  child: PopupMenuButton(
                    icon: const CircleAvatar(
                      radius: 16,
                      backgroundColor: Colors.blue,
                      child: Icon(Icons.edit, size: 16, color: Colors.white),
                    ),
                    itemBuilder: (context) => [
                      const PopupMenuItem(value: 'upload', child: Text('Upload Image')),
                      if (imageUrl != null) const PopupMenuItem(value: 'delete', child: Text('Remove Image', style: TextStyle(color: Colors.red))),
                    ],
                    onSelected: (val) {
                      if (val == 'upload') {
                        _pickImage(context);
                      } else if (val == 'delete') {
                        auth.deleteAvatar();
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Center(child: Text(name, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold))),
          Center(child: Text(email, style: const TextStyle(color: Colors.grey))),
          Center(child: Chip(label: Text(role))),
          const SizedBox(height: 24),

          ListTile(
            leading: const Icon(Icons.phone),
            title: const Text('Phone Number'),
            subtitle: Text(phone),
            trailing: const Icon(Icons.edit, size: 20),
            onTap: () => _editPhone(context, profile['phoneNumber'] ?? ''),
          ),
          ListTile(
            leading: const Icon(Icons.location_on),
            title: const Text('Address'),
            subtitle: Text(address),
            trailing: const Icon(Icons.edit, size: 20),
            onTap: () => _editLocation(context, profile['address'] ?? ''),
          ),
          ListTile(
            leading: const Icon(Icons.lock),
            title: const Text('Change Password'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _changePassword(context),
          ),
          const Divider(),

          widget.extraMenuItems,

          ListTile(
            leading: const Icon(Icons.logout, color: Colors.orange),
            title: const Text('Logout', style: TextStyle(color: Colors.orange)),
            onTap: () {
              auth.logout();
              context.go('/login');
            },
          ),
          ListTile(
            leading: const Icon(Icons.delete_forever, color: Colors.red),
            title: const Text('Delete Account', style: TextStyle(color: Colors.red)),
            onTap: () => _confirmDelete(context),
          ),
        ],
      ),
    );
  }
}
