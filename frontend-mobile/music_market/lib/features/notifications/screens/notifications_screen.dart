import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/notifications_provider.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationsProvider>().startPolling();
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    // Don't stop polling here because they might navigate away but still want badge updates.
    // Instead we could stop it when app is paused.
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      context.read<NotificationsProvider>().startPolling();
    } else if (state == AppLifecycleState.paused) {
      context.read<NotificationsProvider>().stopPolling();
    }
  }

  IconData _getIcon(String type) {
    switch (type) {
      case 'NEW_MATCH': return Icons.music_note;
      case 'PRICE_DROP': return Icons.trending_down;
      case 'ITEM_SOLD': return Icons.monetization_on;
      case 'ORDER_PLACED': return Icons.inventory_2;
      default: return Icons.notifications;
    }
  }

  Color _getIconColor(String type) {
    switch (type) {
      case 'NEW_MATCH': return Colors.purpleAccent;
      case 'PRICE_DROP': return Colors.blue;
      case 'ITEM_SOLD': return Colors.green;
      case 'ORDER_PLACED': return Colors.orange;
      default: return Colors.grey;
    }
  }

  String _timeAgo(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<NotificationsProvider>();
    final unreadCount = provider.unreadCount;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              onPressed: () => provider.markAllAsRead(),
              icon: const Icon(Icons.done_all, color: Colors.blue),
              label: const Text('Mark all as read', style: TextStyle(color: Colors.blue)),
            ),
        ],
      ),
      body: provider.isLoading && provider.notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : provider.notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_none, size: 64, color: Colors.grey.withValues(alpha: 0.3)),
                      const SizedBox(height: 16),
                      const Text('You don\'t have any notifications.', style: TextStyle(color: Colors.grey)),
                    ],
                  ),
                )
              : ListView.builder(
                  itemCount: provider.notifications.length,
                  itemBuilder: (context, index) {
                    final n = provider.notifications[index];
                    return ListTile(
                      tileColor: n.isRead ? null : Colors.blue.withValues(alpha: 0.1),
                      leading: CircleAvatar(
                        backgroundColor: _getIconColor(n.type).withValues(alpha: 0.2),
                        child: Icon(_getIcon(n.type), color: _getIconColor(n.type)),
                      ),
                      title: Text(n.message, style: TextStyle(fontWeight: n.isRead ? FontWeight.normal : FontWeight.bold)),
                      subtitle: Text(_timeAgo(n.createdAt), style: const TextStyle(fontSize: 12)),
                      onTap: () {
                        if (!n.isRead) {
                          provider.markAsRead(n.id);
                        }
                        if (n.listingId != null) {
                          context.push('/listing/${n.listingId}');
                        }
                      },
                    );
                  },
                ),
    );
  }
}
