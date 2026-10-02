import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../models/notification_model.dart';
import '../providers/notifications_provider.dart';
import '../../../core/theme/app_theme.dart';

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
      case 'NEW_MATCH':
        return Icons.music_note;
      case 'PRICE_DROP':
        return Icons.trending_down;
      case 'ITEM_SOLD':
        return Icons.monetization_on;
      case 'ORDER_PLACED':
        return Icons.inventory_2;
      case 'LISTING_REMOVED':
        return Icons.delete_outline;
      default:
        return Icons.notifications;
    }
  }

  static Color _color(String type, AppColors c) {
    switch (type) {
      case 'NEW_MATCH':
        return c.primaryText;
      case 'PRICE_DROP':
        return c.success;
      case 'ITEM_SOLD':
        return c.warning;
      case 'ORDER_PLACED':
        return c.info;
      case 'LISTING_REMOVED':
        return c.danger;
      default:
        return c.textMuted;
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
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
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
    final c = context.colors;

    Widget body;
    if (provider.isLoading && provider.notifications.isEmpty) {
      body = const ShimmerLoader.list(count: 6, rowHeight: 84);
    } else if (provider.errorMessage != null && provider.notifications.isEmpty) {
      body = ListView(
        children: [ErrorState(message: provider.errorMessage!, onRetry: provider.fetchNotifications)],
      );
    } else if (provider.notifications.isEmpty) {
      body = ListView(
        children: const [
          SizedBox(height: 60),
          EmptyState(
            icon: Icons.notifications_none_rounded,
            title: "You're all caught up",
            message: 'Add items to your wishlist or create an alert to get price drops and new matches.',
          ),
        ],
      );
    } else {
      body = ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.only(bottom: AppSpacing.xxl),
        itemCount: provider.notifications.length,
        separatorBuilder: (_, _) => const Divider(height: 1),
        itemBuilder: (context, index) {
          final n = provider.notifications[index];
          final tone = _color(n.type, c);
          return Semantics(
            key: ValueKey('notification-${n.id}'),
            button: true,
            child: InkWell(
              onTap: () => _open(n),
              child: Container(
                color: n.isRead ? null : c.primarySoft.withValues(alpha: c.primarySoft.a * 0.55),
                padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.md, AppSpacing.sm, AppSpacing.md),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: 52,
                      height: 52,
                      child: Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Positioned.fill(
                            child: n.listing?.firstImageUrl != null
                                ? ClipRRect(
                                    borderRadius: BorderRadius.circular(AppRadius.md),
                                    child: AppNetworkImage(imageUrl: n.listing!.firstImageUrl, isThumbnail: true),
                                  )
                                : Container(
                                    decoration: BoxDecoration(color: tone.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(AppRadius.md)),
                                    child: Icon(_icon(n.type), color: tone),
                                  ),
                          ),
                          if (n.listing?.firstImageUrl != null)
                            Positioned(
                              right: -4,
                              bottom: -4,
                              child: Container(
                                width: 22,
                                height: 22,
                                decoration: BoxDecoration(
                                  color: tone,
                                  shape: BoxShape.circle,
                                  border: Border.all(color: context.scheme.surface, width: 2),
                                ),
                                child: Icon(_icon(n.type), size: 12, color: Colors.white),
                              ),
                            ),
                        ],
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(n.title, style: TextStyle(fontWeight: n.isRead ? FontWeight.w600 : FontWeight.w800, fontSize: 14.5)),
                              ),
                              const SizedBox(width: AppSpacing.sm),
                              Text(_timeAgo(n.createdAt), style: context.text.bodySmall),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(n.message, style: TextStyle(color: context.scheme.onSurfaceVariant, height: 1.4, fontSize: 13.5)),
                          if (n.listing != null || !n.isRead)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Wrap(
                                crossAxisAlignment: WrapCrossAlignment.center,
                                spacing: AppSpacing.sm,
                                children: [
                                  if (n.listing != null)
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.open_in_new_rounded, size: 14, color: c.primaryText),
                                        const SizedBox(width: 4),
                                        Text(
                                          'Open · ${Formatters.price(n.listing!.price)}',
                                          style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: c.primaryText),
                                        ),
                                      ],
                                    ),
                                  if (!n.isRead)
                                    TextButton.icon(
                                      style: TextButton.styleFrom(visualDensity: VisualDensity.compact, foregroundColor: context.scheme.onSurfaceVariant),
                                      onPressed: () => provider.markAsRead(n.id).then(_showError),
                                      icon: const Icon(Icons.done_rounded, size: 16),
                                      label: const Text('Mark read'),
                                    ),
                                ],
                              ),
                            ),
                        ],
                      ),
                    ),
                    if (!n.isRead)
                      Padding(
                        padding: const EdgeInsets.only(left: 6, top: 6),
                        child: Semantics(
                          label: 'Unread',
                          child: Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(color: context.scheme.primary, shape: BoxShape.circle),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          if (unread > 0)
            Padding(
              padding: const EdgeInsets.only(right: AppSpacing.xs),
              child: Center(
                child: Pill(label: '$unread new', color: c.primaryText, background: c.primarySoft),
              ),
            ),
          if (unread > 0)
            IconButton(tooltip: 'Mark all as read', onPressed: () => provider.markAllAsRead().then(_showError), icon: const Icon(Icons.done_all_rounded)),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(onRefresh: provider.fetchNotifications, child: body),
    );
  }
}
