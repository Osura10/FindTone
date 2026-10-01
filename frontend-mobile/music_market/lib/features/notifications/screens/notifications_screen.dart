import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../models/notification_model.dart';
import '../providers/notifications_provider.dart';

/// Notification list: pull-to-refresh, error + retry, mark read / mark all, tap opens the listing.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<NotificationsProvider>().fetchNotifications();
    });
  }

  static IconData _icon(String type) {
    switch (type) {
      case 'NEW_MATCH': return Icons.music_note;
      case 'PRICE_DROP': return Icons.trending_down;
      case 'ITEM_SOLD': return Icons.monetization_on;
      case 'ORDER_PLACED': return Icons.inventory_2;
      case 'LISTING_REMOVED': return Icons.delete_outline;
      default: return Icons.notifications;
    }
  }

  static Color _color(String type) {
    switch (type) {
      case 'NEW_MATCH': return Colors.purpleAccent;
      case 'PRICE_DROP': return Colors.blue;
      case 'ITEM_SOLD': return Colors.green;
      case 'ORDER_PLACED': return Colors.orange;
      case 'LISTING_REMOVED': return Colors.redAccent;
      default: return Colors.grey;
    }
  }

  static String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  void _showError(String? message) {
    if (message == null || !mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message), backgroundColor: Colors.red));
  }

  Future<void> _open(NotificationModel n) async {
    final provider = context.read<NotificationsProvider>();
    final target = n.targetListingId;
    if (!n.isRead) {
      // Mark as read in the background; navigation does not wait for it.
      provider.markAsRead(n.id).then(_showError);
    }
    if (target != null) context.push('/listing/$target');
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();
    final unread = provider.notifications.where((n) => !n.isRead).length;

    Widget body;
    if (provider.isLoading && provider.notifications.isEmpty) {
      body = const Center(child: CircularProgressIndicator());
    } else if (provider.errorMessage != null && provider.notifications.isEmpty) {
      body = ErrorView(message: provider.errorMessage!, onRetry: provider.fetchNotifications);
    } else if (provider.notifications.isEmpty) {
      body = ListView(children: const [
        SizedBox(height: 120),
        EmptyState(message: "You don't have any notifications.\nAdd items to your wishlist or create an alert."),
      ]);
    } else {
      body = ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        itemCount: provider.notifications.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final n = provider.notifications[index];
          return ListTile(
            key: ValueKey('notification-${n.id}'),
            tileColor: n.isRead ? null : Colors.blue.withValues(alpha: 0.1),
            leading: n.listing?.firstImageUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: SizedBox(width: 52, height: 52, child: AppNetworkImage(imageUrl: n.listing!.firstImageUrl, isThumbnail: true)),
                  )
                : CircleAvatar(
                    backgroundColor: _color(n.type).withValues(alpha: 0.2),
                    child: Icon(_icon(n.type), color: _color(n.type)),
                  ),
            title: Text(n.title, style: TextStyle(fontWeight: n.isRead ? FontWeight.normal : FontWeight.bold)),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 2),
                Text(n.message),
                const SizedBox(height: 4),
                Text(
                  [_timeAgo(n.createdAt), if (n.listing != null) Formatters.price(n.listing!.price)].join(' · '),
                  style: const TextStyle(fontSize: 12),
                ),
              ],
            ),
            isThreeLine: true,
            trailing: n.isRead
                ? null
                : IconButton(
                    tooltip: 'Mark as read',
                    icon: const Icon(Icons.done, size: 20),
                    onPressed: () => provider.markAsRead(n.id).then(_showError),
                  ),
            onTap: () => _open(n),
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (unread > 0)
            TextButton.icon(
              onPressed: () => provider.markAllAsRead().then(_showError),
              icon: const Icon(Icons.done_all),
              label: const Text('Mark all as read'),
            ),
        ],
      ),
      body: RefreshIndicator(onRefresh: provider.fetchNotifications, child: body),
    );
  }
}
