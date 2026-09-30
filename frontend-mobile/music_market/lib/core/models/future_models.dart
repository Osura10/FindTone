class ShoppingAssistantResult {
  final String reply;
  final String sessionId;
  final bool usedFallback;

  ShoppingAssistantResult({
    required this.reply,
    required this.sessionId,
    required this.usedFallback,
  });

  factory ShoppingAssistantResult.fromJson(Map<String, dynamic> json) {
    return ShoppingAssistantResult(
      reply: json['reply'] ?? '',
      sessionId: json['session_id'] ?? '',
      usedFallback: json['used_fallback'] ?? false,
    );
  }
}

class ParseAlertResult {
  final String query;
  final String category;
  final String brand;
  final double? maxPrice;

  ParseAlertResult({
    required this.query,
    required this.category,
    required this.brand,
    this.maxPrice,
  });

  factory ParseAlertResult.fromJson(Map<String, dynamic> json) {
    return ParseAlertResult(
      query: json['query'] ?? '',
      category: json['category'] ?? '',
      brand: json['brand'] ?? '',
      maxPrice: (json['max_price'] as num?)?.toDouble(),
    );
  }
}

class NotificationModel {
  final int id;
  final String message;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.message,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'],
      message: json['message'] ?? '',
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
