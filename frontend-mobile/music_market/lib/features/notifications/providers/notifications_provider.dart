import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/utils/app_logger.dart';
import '../models/notification_model.dart';

/// Notification list + the unread count for the bell badge.
/// The badge is refreshed every 30 seconds and when the app comes back to the foreground.
class NotificationsProvider with ChangeNotifier {
  static const pollInterval = Duration(seconds: 30);

  final ApiClient _apiClient = ApiClient();

  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  String? _errorMessage;
  int _unreadCount = 0;
  Timer? _pollTimer;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get unreadCount => _unreadCount;
  bool get isPolling => _pollTimer != null;

  Future<void> fetchNotifications() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();
    try {
      final response = await _apiClient.dio.get('/notifications');
      _notifications = (response.data as List)
          .whereType<Map>()
          .map((e) => NotificationModel.fromJson(Map<String, dynamic>.from(e)))
          .toList();
      _unreadCount = _notifications.where((n) => !n.isRead).length;
    } catch (e) {
      _errorMessage = describeError(e, 'Could not load notifications.');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Light call for the badge only.
  Future<void> refreshUnreadCount() async {
    try {
      final response = await _apiClient.dio.get('/notifications/unread-count');
      final count = (response.data['unreadCount'] as num?)?.toInt() ?? 0;
      if (count != _unreadCount) {
        _unreadCount = count;
        notifyListeners();
      }
    } catch (e) {
      // Background poll: keep the last count and try again on the next tick.
      logDebug('Unread count poll failed', describeError(e));
    }
  }

  void startPolling() {
    refreshUnreadCount();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(pollInterval, (_) => refreshUnreadCount());
  }

  void stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  /// Marks one notification as read. Returns an error message, or null when it worked.
  Future<String?> markAsRead(int id) async {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index == -1 || _notifications[index].isRead) return null;
    final before = _notifications[index];
    _notifications[index] = before.copyWith(isRead: true);
    _unreadCount = (_unreadCount - 1).clamp(0, 1 << 30);
    notifyListeners();
    try {
      await _apiClient.dio.patch('/notifications/$id/read');
      return null;
    } catch (e) {
      // Put it back so the screen shows the real state.
      _notifications[index] = before;
      _unreadCount += 1;
      notifyListeners();
      return describeError(e, 'Could not mark as read.');
    }
  }

  /// Marks all as read. Returns an error message, or null when it worked.
  Future<String?> markAllAsRead() async {
    final before = List<NotificationModel>.from(_notifications);
    final beforeCount = _unreadCount;
    _notifications = _notifications.map((n) => n.copyWith(isRead: true)).toList();
    _unreadCount = 0;
    notifyListeners();
    try {
      await _apiClient.dio.patch('/notifications/read-all');
      return null;
    } catch (e) {
      _notifications = before;
      _unreadCount = beforeCount;
      notifyListeners();
      return describeError(e, 'Could not mark all as read.');
    }
  }

  void clear() {
    stopPolling();
    _notifications = [];
    _unreadCount = 0;
    _errorMessage = null;
    notifyListeners();
  }

  @override
  void dispose() {
    stopPolling();
    super.dispose();
  }
}
