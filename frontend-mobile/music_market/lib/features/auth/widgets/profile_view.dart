import 'package:flutter/material.dart';
import '../../../core/network/api_exceptions.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/theme/app_theme.dart';

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
            style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.error),
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
    if (picked == null || !context.mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<AuthProvider>().uploadAvatar(picked);
      messenger.showSnackBar(const SnackBar(content: Text('Profile photo updated')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final profile = auth.userProfile;
    final c = context.colors;

    if (profile == null) {
      return const ShimmerLoader.list(count: 4, rowHeight: 120);
    }

    final imageUrl = profile['profileImageUrl']?.toString();
    final name = profile['name']?.toString() ?? 'User';
    final email = profile['email']?.toString() ?? '';
    final role = profile['role']?.toString() ?? '';
    final phone = profile['phoneNumber']?.toString() ?? 'No phone added';
    final address = profile['address']?.toString() ?? 'No address added';

    Widget tile(IconData icon, String title, String? subtitle, VoidCallback onTap, {IconData trailing = Icons.edit_outlined}) => ListTile(
          leading: Icon(icon),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
          subtitle: subtitle == null ? null : Text(subtitle, maxLines: 2, overflow: TextOverflow.ellipsis),
          trailing: Icon(trailing, size: 20),
          onTap: onTap,
        );

    return RefreshIndicator(
      onRefresh: () => auth.fetchProfile(),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.xxl),
        children: [
          // Header card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Row(children: [
                Stack(clipBehavior: Clip.none, children: [
                  AppAvatar(name: name, imageUrl: imageUrl, size: 68),
                  Positioned(
                    right: -10,
                    bottom: -10,
                    child: PopupMenuButton<String>(
                      tooltip: 'Change photo',
                      padding: EdgeInsets.zero,
                      icon: CircleAvatar(
                        radius: 14,
                        backgroundColor: context.scheme.primary,
                        child: const Icon(Icons.photo_camera_outlined, size: 16, color: Colors.white),
                      ),
                      itemBuilder: (context) => [
                        const PopupMenuItem(value: 'upload', child: Text('Upload photo')),
                        if (imageUrl != null) PopupMenuItem(value: 'delete', child: Text('Remove photo', style: TextStyle(color: c.danger))),
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
                ]),
                const SizedBox(width: AppSpacing.lg),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(name, style: context.text.titleLarge, maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(email, style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(height: AppSpacing.sm),
                    Pill(
                      label: role.isEmpty ? 'Member' : '${role[0].toUpperCase()}${role.substring(1)}',
                      color: c.primaryText,
                      background: c.primarySoft,
                      icon: role == 'shop' ? Icons.storefront_outlined : Icons.person_outline_rounded,
                    ),
                  ]),
                ),
              ]),
            ),
          ),
          const SizedBox(height: AppSpacing.xl),

          Padding(
            padding: const EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
            child: Text('ACCOUNT', style: TextStyle(fontSize: 11.5, letterSpacing: 0.8, fontWeight: FontWeight.w700, color: c.textMuted)),
          ),
          Card(
            child: Column(children: [
              tile(Icons.phone_outlined, 'Phone number', phone, () => _editPhone(context, profile['phoneNumber']?.toString() ?? '')),
              const Divider(height: 1, indent: 56),
              tile(Icons.place_outlined, 'Address', address, () => _editLocation(context, profile['address']?.toString() ?? '')),
              const Divider(height: 1, indent: 56),
              tile(Icons.lock_outline_rounded, 'Change password', null, () => _changePassword(context), trailing: Icons.chevron_right_rounded),
            ]),
          ),
          const SizedBox(height: AppSpacing.lg),

          widget.extraMenuItems,

          Card(
            child: Column(children: [
              ListTile(
                leading: Icon(Icons.logout_rounded, color: c.warning),
                title: Text('Log out', style: TextStyle(color: c.warning, fontWeight: FontWeight.w600)),
                onTap: () {
                  auth.logout();
                  context.go('/login');
                },
              ),
              const Divider(height: 1, indent: 56),
              ListTile(
                leading: Icon(Icons.delete_forever_outlined, color: c.danger),
                title: Text('Delete account', style: TextStyle(color: c.danger, fontWeight: FontWeight.w600)),
                onTap: () => _confirmDelete(context),
              ),
            ]),
          ),
        ],
      ),
    );
  }
}
