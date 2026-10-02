import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../providers/notifications_provider.dart';

/// App bar bell with the unread badge. Opens the notifications page and refreshes the
/// count when coming back.
class NotificationBell extends StatelessWidget {
  const NotificationBell({super.key});

  @override
  Widget build(BuildContext context) {
    final unread = context.watch<NotificationsProvider>().unreadCount;
    return IconButton(
      tooltip: unread > 0 ? 'Notifications, $unread unread' : 'Notifications',
      onPressed: () async {
        final provider = context.read<NotificationsProvider>();
        await context.push('/notifications');
        provider.refreshUnreadCount();
      },
      icon: Badge(
        key: const ValueKey('notification-badge'),
        isLabelVisible: unread > 0,
        label: Text(unread > 99 ? '99+' : '$unread'),
        child: const Icon(Icons.notifications_none_rounded),
      ),
    );
  }
}
