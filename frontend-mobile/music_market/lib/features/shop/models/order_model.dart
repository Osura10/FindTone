class OrderModel {
  final int id;
  final int listingId;
  final String listingTitle;
  final String? listingImage;
  final double amount;
  final String paymentMethod;
  final String status;
  final String fullName;
  final String phone;
  final String addressLine;
  final String city;
  final String? postalCode;
  final String? notes;
  final String? cardLast4;
  final DateTime createdAt;

  OrderModel({
    required this.id,
    required this.listingId,
    required this.listingTitle,
    this.listingImage,
    required this.amount,
    required this.paymentMethod,
    required this.status,
    required this.fullName,
    required this.phone,
    required this.addressLine,
    required this.city,
    this.postalCode,
    this.notes,
    this.cardLast4,
    required this.createdAt,
  });

  factory OrderModel.fromJson(Map<String, dynamic> json) {
    return OrderModel(
      id: json['id'] as int? ?? 0,
      listingId: json['listingId'] as int? ?? 0,
      listingTitle: json['listingTitle']?.toString() ?? '',
      listingImage: json['listingImage']?.toString(),
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod']?.toString() ?? '',
      status: json['status']?.toString() ?? '',
      fullName: json['fullName']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      addressLine: json['addressLine']?.toString() ?? '',
      city: json['city']?.toString() ?? '',
      postalCode: json['postalCode']?.toString(),
      notes: json['notes']?.toString(),
      cardLast4: json['cardLast4']?.toString(),
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'].toString()) : DateTime.now(),
    );
  }
}
