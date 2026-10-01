class AlertModel {
  final int id;
  final String? queryText;
  final String? category;
  final String? brand;
  final String? modelKeyword;
  final double? minPrice;
  final double? maxPrice;
  final String? conditions;
  final String? location;
  final bool isActive;

  AlertModel({
    required this.id,
    this.queryText,
    this.category,
    this.brand,
    this.modelKeyword,
    this.minPrice,
    this.maxPrice,
    this.conditions,
    this.location,
    required this.isActive,
  });

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: json['id'],
      queryText: json['queryText'],
      category: json['category'],
      brand: json['brand'],
      modelKeyword: json['modelKeyword'],
      minPrice: json['minPrice'] != null ? (json['minPrice'] as num).toDouble() : null,
      maxPrice: json['maxPrice'] != null ? (json['maxPrice'] as num).toDouble() : null,
      conditions: json['conditions'],
      location: json['location'],
      isActive: json['isActive'] ?? true,
    );
  }
}
