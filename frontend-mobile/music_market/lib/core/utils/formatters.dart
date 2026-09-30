import 'package:intl/intl.dart';
import 'package:flutter/material.dart';

class Formatters {
  static String price(double amount) {
    if (amount % 1 == 0) {
      return NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0).format(amount);
    }
    return NumberFormat.currency(symbol: 'LKR ', decimalDigits: 2).format(amount);
  }

  static String condition(String code) {
    switch (code.toLowerCase()) {
      case 'new': return 'New';
      case 'like_new': return 'Like New';
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'fair': return 'Fair';
      case 'poor': return 'Poor';
      case 'for_parts': return 'For Parts';
      default: return code;
    }
  }

  static String getVerdictText(String? verdict) {
    switch (verdict) {
      case 'SUSPICIOUSLY_LOW': return 'Too Low';
      case 'GREAT_DEAL': return 'Great Deal';
      case 'FAIR': return 'Fair Price';
      case 'SLIGHTLY_HIGH': return 'Slightly High';
      case 'OVERPRICED': return 'Overpriced';
      default: return 'Unknown';
    }
  }

  static Color getVerdictColor(String? verdict) {
    switch (verdict) {
      case 'SUSPICIOUSLY_LOW': return Colors.red;
      case 'GREAT_DEAL': return Colors.green;
      case 'FAIR': return Colors.green;
      case 'SLIGHTLY_HIGH': return Colors.amber;
      case 'OVERPRICED': return Colors.red;
      default: return Colors.grey;
    }
  }

  static Color getTrustColor(int trustScore) {
    if (trustScore >= 70) return Colors.green;
    if (trustScore >= 40) return Colors.amber;
    return Colors.red;
  }
}
