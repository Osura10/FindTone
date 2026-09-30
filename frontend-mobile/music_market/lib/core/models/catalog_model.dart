class CatalogModel {
  final int id;
  final String brand;
  final String model;
  final String category;
  final String tier;
  final double newPriceLkr;
  final int? releaseYear;
  final bool isCollectible;

  CatalogModel({
    required this.id,
    required this.brand,
    required this.model,
    required this.category,
    required this.tier,
    required this.newPriceLkr,
    this.releaseYear,
    required this.isCollectible,
  });

  factory CatalogModel.fromJson(Map<String, dynamic> json) {
    return CatalogModel(
      id: json['id'],
      brand: json['brand'] ?? '',
      model: json['model'] ?? '',
      category: json['category'] ?? '',
      tier: json['tier'] ?? '',
      newPriceLkr: (json['newPriceLkr'] as num?)?.toDouble() ?? 0.0,
      releaseYear: json['releaseYear'],
      isCollectible: json['isCollectible'] ?? false,
    );
  }
}
