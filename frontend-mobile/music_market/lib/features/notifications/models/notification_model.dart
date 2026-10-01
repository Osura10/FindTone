class NotificationModel {
  final int id;
  final int userId;
  final int? listingId;
  final String type;
  final String message;
  final bool isRead;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.userId,
    this.listingId,
    required this.type,
    required this.message,
    required this.isRead,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['id'],
      userId: json['userId'],
      listingId: json['listingId'],
      type: json['type'] ?? 'UNKNOWN',
      message: json['message'] ?? '',
      isRead: json['isRead'] ?? false,
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
