import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../models/chat_message_model.dart';
import 'package:dio/dio.dart';

class AssistantProvider with ChangeNotifier {
  final ApiClient _apiClient = ApiClient();
  
  final List<ChatMessageModel> _messages = [];
  bool _isTyping = false;
  String? _sessionId;

  List<ChatMessageModel> get messages => _messages;
  bool get isTyping => _isTyping;

  Future<void> sendMessage(String text) async {
    if (text.trim().isEmpty) return;

    _messages.add(ChatMessageModel(role: 'user', text: text));
    _isTyping = true;
    notifyListeners();

    try {
      final response = await _apiClient.dio.post('/shopping-assistant/chat', 
        data: {
          'message': text,
          if (_sessionId != null) 'session_id': _sessionId,
        },
        options: Options(
          receiveTimeout: const Duration(seconds: 120),
          sendTimeout: const Duration(seconds: 60),
        ),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        if (data['session_id'] != null) {
          _sessionId = data['session_id'];
        }

        List<dynamic> listings = data['listings'] ?? [];
        // Filter out SOLD items if the backend didn't do it
        listings = listings.where((l) => l['status'] != 'SOLD').toList();

        _messages.add(ChatMessageModel(
          role: 'assistant',
          text: data['reply'] ?? '',
          listings: listings.isNotEmpty ? listings : null,
          alertToCreate: data['alert_to_create'],
        ));
      }
    } catch (e) {
      _messages.add(ChatMessageModel(
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
      ));
    } finally {
      _isTyping = false;
      notifyListeners();
    }
  }

  void clearSession() {
    _messages.clear();
    _sessionId = null;
    notifyListeners();
  }
}
