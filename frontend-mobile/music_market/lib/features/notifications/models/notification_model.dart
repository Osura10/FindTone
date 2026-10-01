/// Small listing preview inside a notification: {id, title, price, firstImageUrl}.
class NotificationListing {
  final int id;
  final String title;
  final double price;
  final String? firstImageUrl;

  const NotificationListing({required this.id, required this.title, required this.price, this.firstImageUrl});

  static NotificationListing? fromJson(Object? json) {
    if (json is! Map) return null;
    final id = (json['id'] as num?)?.toInt();
    if (id == null) return null;
    return NotificationListing(
      id: id,
      title: json['title']?.toString() ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0,
      firstImageUrl: json['firstImageUrl']?.toString(),
    );
  }
}

/// One row of GET /api/notifications:
/// id, type, title, message, isRead, createdAt, listingId, savedSearchId, listing.
/// Parsing is null-safe: a missing field never throws.
class NotificationModel {
  final int id;
  final String type;
  final String title;
  final String message;
  final bool isRead;
  final DateTime createdAt;
  final int? listingId;
  final int? savedSearchId;
  final NotificationListing? listing;

  const NotificationModel({
    required this.id,
    required this.type,
    required this.title,
    required this.message,
    required this.isRead,
    required this.createdAt,
    this.listingId,
    this.savedSearchId,
    this.listing,
  });

  /// The listing to open when the notification is tapped (if any).
  int? get targetListingId => listingId ?? listing?.id;

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    final type = json['type']?.toString() ?? 'UNKNOWN';
    return NotificationModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      type: type,
      title: (json['title']?.toString().trim().isNotEmpty ?? false) ? json['title'].toString() : type.replaceAll('_', ' '),
      message: json['message']?.toString() ?? '',
      isRead: json['isRead'] == true,
      createdAt: DateTime.tryParse(json['createdAt']?.toString() ?? '')?.toLocal() ?? DateTime.now(),
      listingId: (json['listingId'] as num?)?.toInt(),
      savedSearchId: (json['savedSearchId'] as num?)?.toInt(),
      listing: NotificationListing.fromJson(json['listing']),
    );
  }

  NotificationModel copyWith({bool? isRead}) => NotificationModel(
        id: id,
        type: type,
        title: title,
        message: message,
        isRead: isRead ?? this.isRead,
        createdAt: createdAt,
        listingId: listingId,
        savedSearchId: savedSearchId,
        listing: listing,
      );
}
