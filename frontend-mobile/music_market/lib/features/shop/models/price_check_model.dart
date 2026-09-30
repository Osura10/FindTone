class FairRangeResult {
  final double min;
  final double max;

  FairRangeResult({required this.min, required this.max});

  factory FairRangeResult.fromJson(Map<String, dynamic> json) {
    return FairRangeResult(
      min: (json['min'] as num?)?.toDouble() ?? 0.0,
      max: (json['max'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class FairPriceResult {
  final double fairPrice;
  final FairRangeResult fairRange;
  final double askingPrice;
  final double deviationPercent;
  final String verdict;
  final String confidence;
  final bool flagForTrust;
  final List<String> extrasDetected;
  final String explanation;
  final bool usedFallback;

  FairPriceResult({
    required this.fairPrice,
    required this.fairRange,
    required this.askingPrice,
    required this.deviationPercent,
    required this.verdict,
    required this.confidence,
    required this.flagForTrust,
    required this.extrasDetected,
    required this.explanation,
    required this.usedFallback,
  });

  factory FairPriceResult.fromJson(Map<String, dynamic> json) {
    return FairPriceResult(
      fairPrice: (json['fair_price'] as num?)?.toDouble() ?? 0.0,
      fairRange: json['fair_range'] != null 
          ? FairRangeResult.fromJson(json['fair_range']) 
          : FairRangeResult(min: 0, max: 0),
      askingPrice: (json['asking_price'] as num?)?.toDouble() ?? 0.0,
      deviationPercent: (json['deviation_percent'] as num?)?.toDouble() ?? 0.0,
      verdict: json['verdict'] ?? 'UNKNOWN',
      confidence: json['confidence'] ?? 'UNKNOWN',
      flagForTrust: json['flag_for_trust'] ?? false,
      extrasDetected: (json['extras_detected'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      explanation: json['explanation'] ?? '',
      usedFallback: json['used_fallback'] ?? false,
    );
  }
}
