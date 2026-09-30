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
      id: json['id'],
      listingId: json['listingId'],
      listingTitle: json['listingTitle'] ?? '',
      listingImage: json['listingImage'],
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      paymentMethod: json['paymentMethod'] ?? '',
      status: json['status'] ?? '',
      fullName: json['fullName'] ?? '',
      phone: json['phone'] ?? '',
      addressLine: json['addressLine'] ?? '',
      city: json['city'] ?? '',
      postalCode: json['postalCode'],
      notes: json['notes'],
      cardLast4: json['cardLast4'],
      createdAt: DateTime.parse(json['createdAt']),
    );
  }
}
