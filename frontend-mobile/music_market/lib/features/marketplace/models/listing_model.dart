class ListingSummary {
  final int id;
  final int sellerId;
  final String sellerName;
  final String title;
  final String category;
  final String brand;
  final String model;
  final String condition;
  final int? year;
  final String listingType;
  final double price;
  final String location;
  final double? latitude;
  final double? longitude;
  final String status;
  final String? firstImageUrl;
  final double? fairPrice;
  final double? fairPriceMin;
  final double? fairPriceMax;
  final String? priceVerdict;
  final double? priceDeviationPercent;
  final String? priceConfidence;
  final String? priceExplanation;
  final int? trustScore;
  final String? aiReason;
  final DateTime createdAt;
  final DateTime updatedAt;

  ListingSummary({
    required this.id,
    required this.sellerId,
    required this.sellerName,
    required this.title,
    required this.category,
    required this.brand,
    required this.model,
    required this.condition,
    this.year,
    required this.listingType,
    required this.price,
    required this.location,
    this.latitude,
    this.longitude,
    required this.status,
    this.firstImageUrl,
    this.fairPrice,
    this.fairPriceMin,
    this.fairPriceMax,
    this.priceVerdict,
    this.priceDeviationPercent,
    this.priceConfidence,
    this.priceExplanation,
    this.trustScore,
    this.aiReason,
    required this.createdAt,
    required this.updatedAt,
  });

  factory ListingSummary.fromJson(Map<String, dynamic> json) {
    return ListingSummary(
      id: json['id'],
      sellerId: json['sellerId'],
      sellerName: json['sellerName'] ?? '',
      title: json['title'] ?? '',
      category: json['category'] ?? '',
      brand: json['brand'] ?? '',
      model: json['model'] ?? '',
      condition: json['condition'] ?? '',
      year: json['year'],
      listingType: json['listingType'] ?? 'Sell',
      price: (json['price'] as num?)?.toDouble() ?? 0.0,
      location: json['location'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      status: json['status'] ?? 'LIVE',
      firstImageUrl: json['firstImageUrl'],
      fairPrice: (json['fairPrice'] as num?)?.toDouble(),
      fairPriceMin: (json['fairPriceMin'] as num?)?.toDouble(),
      fairPriceMax: (json['fairPriceMax'] as num?)?.toDouble(),
      priceVerdict: json['priceVerdict'],
      priceDeviationPercent: (json['priceDeviationPercent'] as num?)?.toDouble(),
      priceConfidence: json['priceConfidence'],
      priceExplanation: json['priceExplanation'],
      trustScore: json['trustScore'],
      aiReason: json['aiReason'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
    );
  }
}

class ListingImage {
  final int id;
  final String url;
  final String publicId;
  final String? pHash;
  final int sortOrder;

  ListingImage({
    required this.id,
    required this.url,
    required this.publicId,
    this.pHash,
    required this.sortOrder,
  });

  factory ListingImage.fromJson(Map<String, dynamic> json) {
    return ListingImage(
      id: json['id'],
      url: json['url'] ?? '',
      publicId: json['publicId'] ?? '',
      pHash: json['pHash'],
      sortOrder: json['sortOrder'] ?? 0,
    );
  }
}

class PriceHistory {
  final int id;
  final double oldPrice;
  final double newPrice;
  final DateTime changedAt;

  PriceHistory({
    required this.id,
    required this.oldPrice,
    required this.newPrice,
    required this.changedAt,
  });

  factory PriceHistory.fromJson(Map<String, dynamic> json) {
    return PriceHistory(
      id: json['id'],
      oldPrice: (json['oldPrice'] as num).toDouble(),
      newPrice: (json['newPrice'] as num).toDouble(),
      changedAt: DateTime.parse(json['changedAt']),
    );
  }
}

class ListingDetail {
  final int id;
  final int sellerId;
  final String sellerName;
  final String? sellerPhone;
  final String sellerRole;
  final DateTime? sellerMemberSince;
  final String title;
  final String category;
  final String brand;
  final String model;
  final String condition;
  final int? year;
  final String listingType;
  final double price;
  final String location;
  final double? latitude;
  final double? longitude;
  final String description;
  final String status;
  final double? soldPrice;
  final DateTime? soldAt;

  final double? fairPrice;
  final double? fairPriceMin;
  final double? fairPriceMax;
  final String? priceVerdict;
  final double? priceDeviationPercent;
  final String? priceConfidence;
  final String? priceExplanation;
  final int? trustScore;
  final String? aiReason;

  final DateTime createdAt;
  final DateTime updatedAt;

  final List<ListingImage> images;
  final List<PriceHistory> priceHistories;

  ListingDetail({
    required this.id,
    required this.sellerId,
    required this.sellerName,
    this.sellerPhone,
    required this.sellerRole,
    this.sellerMemberSince,
    required this.title,
    required this.category,
    required this.brand,
    required this.model,
    required this.condition,
    this.year,
    required this.listingType,
    required this.price,
    required this.location,
    this.latitude,
    this.longitude,
    required this.description,
    required this.status,
    this.soldPrice,
    this.soldAt,
    this.fairPrice,
    this.fairPriceMin,
    this.fairPriceMax,
    this.priceVerdict,
    this.priceDeviationPercent,
    this.priceConfidence,
    this.priceExplanation,
    this.trustScore,
    this.aiReason,
    required this.createdAt,
    required this.updatedAt,
    required this.images,
    required this.priceHistories,
  });

  factory ListingDetail.fromJson(Map<String, dynamic> json) {
    return ListingDetail(
      id: json['id'],
      sellerId: json['sellerId'],
      sellerName: json['sellerName'] ?? '',
      sellerPhone: json['sellerPhone'],
      sellerRole: json['sellerRole'] ?? '',
      sellerMemberSince: json['sellerMemberSince'] != null ? DateTime.parse(json['sellerMemberSince']) : null,
      title: json['title'] ?? '',
      category: json['category'] ?? '',
      brand: json['brand'] ?? '',
      model: json['model'] ?? '',
      condition: json['condition'] ?? '',
      year: json['year'],
      listingType: json['listingType'] ?? 'Sell',
      price: (json['price'] as num).toDouble(),
      location: json['location'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      description: json['description'] ?? '',
      status: json['status'] ?? 'LIVE',
      soldPrice: (json['soldPrice'] as num?)?.toDouble(),
      soldAt: json['soldAt'] != null ? DateTime.parse(json['soldAt']) : null,
      fairPrice: (json['fairPrice'] as num?)?.toDouble(),
      fairPriceMin: (json['fairPriceMin'] as num?)?.toDouble(),
      fairPriceMax: (json['fairPriceMax'] as num?)?.toDouble(),
      priceVerdict: json['priceVerdict'],
      priceDeviationPercent: (json['priceDeviationPercent'] as num?)?.toDouble(),
      priceConfidence: json['priceConfidence'],
      priceExplanation: json['priceExplanation'],
      trustScore: json['trustScore'],
      aiReason: json['aiReason'],
      createdAt: DateTime.parse(json['createdAt']),
      updatedAt: DateTime.parse(json['updatedAt']),
      images: (json['images'] as List?)?.map((e) => ListingImage.fromJson(e)).toList() ?? [],
      priceHistories: (json['priceHistories'] as List?)?.map((e) => PriceHistory.fromJson(e)).toList() ?? [],
    );
  }
}

class PagedResult<T> {
  final List<T> items;
  final int totalCount;
  final int page;
  final int pageSize;
  final int totalPages;

  PagedResult({
    required this.items,
    required this.totalCount,
    required this.page,
    required this.pageSize,
    required this.totalPages,
  });
}
