import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../models/notification_model.dart';
import 'dart:async';

class NotificationsProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  List<NotificationModel> _notifications = [];
  bool _isLoading = false;
  Timer? _refreshTimer;

  List<NotificationModel> get notifications => _notifications;
  bool get isLoading => _isLoading;
  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  Future<void> fetchNotifications({bool background = false}) async {
    if (!background) {
      _isLoading = true;
      notifyListeners();
    }
    try {
      final response = await _apiClient.dio.get('/notifications');
      if (response.statusCode == 200) {
        _notifications = (response.data as List).map((e) => NotificationModel.fromJson(e)).toList();
      }
    } catch (e) {
      // Ignore
    } finally {
      if (!background) {
        _isLoading = false;
      }
      notifyListeners();
    }
  }

  Future<void> markAsRead(int id) async {
    try {
      final index = _notifications.indexWhere((n) => n.id == id);
      if (index != -1 && !_notifications[index].isRead) {
        final current = _notifications[index];
        _notifications[index] = NotificationModel(
          id: current.id,
          userId: current.userId,
          listingId: current.listingId,
          type: current.type,
          message: current.message,
          isRead: true,
          createdAt: current.createdAt,
        );
        notifyListeners();
        await _apiClient.dio.patch('/notifications/$id/read');
      }
    } catch (e) {
      // Ignore
    }
  }

  Future<void> markAllAsRead() async {
    try {
      for (int i = 0; i < _notifications.length; i++) {
        final current = _notifications[i];
        if (!current.isRead) {
          _notifications[i] = NotificationModel(
            id: current.id,
            userId: current.userId,
            listingId: current.listingId,
            type: current.type,
            message: current.message,
            isRead: true,
            createdAt: current.createdAt,
          );
        }
      }
      notifyListeners();
      await _apiClient.dio.patch('/notifications/read-all');
    } catch (e) {
      // Ignore
    }
  }

  void startPolling() {
    fetchNotifications(background: true);
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      fetchNotifications(background: true);
    });
  }

  void stopPolling() {
    _refreshTimer?.cancel();
    _refreshTimer = null;
  }
}
