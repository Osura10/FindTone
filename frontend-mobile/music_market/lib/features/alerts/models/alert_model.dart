/// A saved search ("alert"). Matches GET/POST /api/alerts (camelCase).
class AlertModel {
  final int id;
  final String name;
  final String? queryText;
  final String? category;
  final String? brand;
  final String? modelKeyword;
  final double? minPrice;
  final double? maxPrice;
  final String? conditions;
  final String? location;
  final bool isActive;
  final DateTime? lastNotifiedAt;

  /// Existing LIVE listings that matched right after create/update/enable (null otherwise).
  final int? newMatches;

  AlertModel({
    required this.id,
    this.name = '',
    this.queryText,
    this.category,
    this.brand,
    this.modelKeyword,
    this.minPrice,
    this.maxPrice,
    this.conditions,
    this.location,
    required this.isActive,
    this.lastNotifiedAt,
    this.newMatches,
  });

  List<String> get conditionList =>
      (conditions ?? '').split(',').map((c) => c.trim()).where((c) => c.isNotEmpty).toList();

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: (json['id'] as num?)?.toInt() ?? 0,
      name: json['name']?.toString() ?? '',
      queryText: json['queryText']?.toString(),
      category: json['category']?.toString(),
      brand: json['brand']?.toString(),
      modelKeyword: json['modelKeyword']?.toString(),
      minPrice: (json['minPrice'] as num?)?.toDouble(),
      maxPrice: (json['maxPrice'] as num?)?.toDouble(),
      conditions: json['conditions']?.toString(),
      location: json['location']?.toString(),
      isActive: json['isActive'] != false,
      lastNotifiedAt: DateTime.tryParse(json['lastNotifiedAt']?.toString() ?? '')?.toLocal(),
      newMatches: (json['newMatches'] as num?)?.toInt(),
    );
  }
}
