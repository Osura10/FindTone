import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/theme_controller.dart';
import '../auth/providers/auth_provider.dart';
import '../auth/widgets/profile_view.dart';
import '../notifications/widgets/notification_bell.dart';

/// Profile tab: account details, theme, and links to every page that is not a bottom tab
/// for this role (buyers and shops have the same features, like on the web).
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isShop = context.select<AuthProvider, bool>((a) => a.role == 'shop');

    final shopping = <MenuLink>[
      if (isShop) const MenuLink(Icons.search_rounded, 'Search instruments', '/search'),
      if (isShop) const MenuLink(Icons.favorite_border_rounded, 'Wishlist', '/wishlist'),
      if (isShop) const MenuLink(Icons.notifications_active_outlined, 'My Alerts', '/my_alerts'),
      const MenuLink(Icons.shopping_bag_outlined, 'My Orders', '/my_orders'),
      const MenuLink(Icons.auto_awesome_outlined, 'Shopping assistant', '/assistant'),
    ];
    final selling = <MenuLink>[
      const MenuLink(Icons.add_box_outlined, 'Create Post', '/shop/create'),
      if (!isShop) const MenuLink(Icons.inventory_2_outlined, 'My Listings', '/my_listings'),
      if (!isShop) const MenuLink(Icons.payments_outlined, 'My Sales', '/sales'),
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Profile'), actions: const [NotificationBell(), SizedBox(width: 4)]),
      body: ProfileView(
        extraMenuItems: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          MenuGroup(title: 'Shopping', links: shopping),
          MenuGroup(title: 'Selling', links: selling),
          const _ThemeSelector(),
        ]),
      ),
    );
  }
}

class MenuLink {
  final IconData icon;
  final String title;
  final String path;
  const MenuLink(this.icon, this.title, this.path);
}

/// A titled card of navigation rows.
class MenuGroup extends StatelessWidget {
  final String title;
  final List<MenuLink> links;
  const MenuGroup({super.key, required this.title, required this.links});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
          child: Text(title.toUpperCase(), style: TextStyle(fontSize: 11.5, letterSpacing: 0.8, fontWeight: FontWeight.w700, color: context.colors.textMuted)),
        ),
        Card(
          child: Column(children: [
            for (var i = 0; i < links.length; i++) ...[
              if (i > 0) const Divider(height: 1, indent: 56),
              ListTile(
                leading: Icon(links[i].icon),
                title: Text(links[i].title, style: const TextStyle(fontWeight: FontWeight.w500)),
                trailing: const Icon(Icons.chevron_right_rounded),
                onTap: () => context.push(links[i].path),
              ),
            ],
          ]),
        ),
      ]),
    );
  }
}

class _ThemeSelector extends StatelessWidget {
  const _ThemeSelector();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ThemeController>();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: AppSpacing.sm),
          child: Text('APPEARANCE', style: TextStyle(fontSize: 11.5, letterSpacing: 0.8, fontWeight: FontWeight.w700, color: context.colors.textMuted)),
        ),
        SizedBox(
          width: double.infinity,
          child: SegmentedButton<ThemeMode>(
            showSelectedIcon: false,
            segments: const [
              ButtonSegment(value: ThemeMode.system, icon: Icon(Icons.brightness_auto_outlined, size: 18), label: Text('System')),
              ButtonSegment(value: ThemeMode.light, icon: Icon(Icons.light_mode_outlined, size: 18), label: Text('Light')),
              ButtonSegment(value: ThemeMode.dark, icon: Icon(Icons.dark_mode_outlined, size: 18), label: Text('Dark')),
            ],
            selected: {controller.mode},
            onSelectionChanged: (s) => controller.setMode(s.first),
          ),
        ),
      ]),
    );
  }
}
