class WishlistListingSnapshot {
  final String title;
  final String brand;
  final String condition;
  final double price;
  final String? firstImageUrl;
  final String status;
  final String? priceVerdict;

  WishlistListingSnapshot({
    required this.title,
    required this.brand,
    required this.condition,
    required this.price,
    this.firstImageUrl,
    required this.status,
    this.priceVerdict,
  });

  factory WishlistListingSnapshot.fromJson(Map<String, dynamic> json) {
    return WishlistListingSnapshot(
      title: json['title'] ?? '',
      brand: json['brand'] ?? '',
      condition: json['condition'] ?? '',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      firstImageUrl: json['firstImageUrl'],
      status: json['status'] ?? 'LIVE',
      priceVerdict: json['priceVerdict'],
    );
  }
}

class WishlistItemModel {
  final int id;
  final int listingId;
  final double priceWhenSaved;
  final DateTime createdAt;
  final WishlistListingSnapshot listing;

  WishlistItemModel({
    required this.id,
    required this.listingId,
    required this.priceWhenSaved,
    required this.createdAt,
    required this.listing,
  });

  factory WishlistItemModel.fromJson(Map<String, dynamic> json) {
    return WishlistItemModel(
      id: json['id'],
      listingId: json['listingId'],
      priceWhenSaved: (json['priceWhenSaved'] as num).toDouble(),
      createdAt: DateTime.parse(json['createdAt']),
      listing: WishlistListingSnapshot.fromJson(json['listing']),
    );
  }
}
