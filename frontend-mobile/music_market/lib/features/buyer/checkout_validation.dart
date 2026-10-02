/// Same rules and messages as the backend (OrdersController) and the web checkout.
const demoCardNumber = '1234123412341234';

class CheckoutInput {
  final String fullName;
  final String phone;
  final String addressLine;
  final String city;
  final String paymentMethod; // CARD or COD
  final String cardNumber;
  final String holderName;
  final String expiry; // MM/YY
  final String cvv;

  const CheckoutInput({
    required this.fullName,
    required this.phone,
    required this.addressLine,
    required this.city,
    required this.paymentMethod,
    this.cardNumber = '',
    this.holderName = '',
    this.expiry = '',
    this.cvv = '',
  });
}

/// Returns the first problem, or null when the order can be sent.
String? validateCheckout(CheckoutInput f, {DateTime? now}) {
  final today = now ?? DateTime.now();
  if ([f.fullName, f.phone, f.addressLine, f.city].any((v) => v.trim().isEmpty)) {
    return 'Full name, phone, address and city are required.';
  }
  final digits = f.phone.replaceAll(RegExp(r'\D'), '');
  if (digits.length < 9 || digits.length > 12) return 'Invalid Sri Lankan phone number.';
  if (f.paymentMethod != 'CARD') return null;

  if (f.cardNumber.replaceAll(RegExp(r'[\s-]'), '') != demoCardNumber) {
    return 'Invalid demo card number. Use 1234 1234 1234 1234.';
  }
  if (f.holderName.trim().isEmpty) return 'Card holder name is required.';
  final match = RegExp(r'^(\d{2})/(\d{2})$').firstMatch(f.expiry.trim());
  final month = match == null ? 0 : int.parse(match.group(1)!);
  if (match == null || month < 1 || month > 12) return 'Invalid expiry. Use MM/YY.';
  final year = 2000 + int.parse(match.group(2)!);
  if (year < today.year || (year == today.year && month < today.month)) return 'Card expired.';
  if (!RegExp(r'^\d{3}$').hasMatch(f.cvv)) return 'Invalid CVV. It must be 3 digits.';
  return null;
}

/// JSON body for POST /api/orders. The card number is sent without spaces.
Map<String, dynamic> checkoutPayload(int listingId, CheckoutInput f, {String postalCode = '', String notes = ''}) => {
      'listingId': listingId,
      'paymentMethod': f.paymentMethod,
      'fullName': f.fullName.trim(),
      'phone': f.phone.trim(),
      'addressLine': f.addressLine.trim(),
      'city': f.city.trim(),
      'postalCode': postalCode.trim().isEmpty ? null : postalCode.trim(),
      'notes': notes.trim().isEmpty ? null : notes.trim(),
      'card': f.paymentMethod == 'CARD'
          ? {
              'number': f.cardNumber.replaceAll(RegExp(r'[\s-]'), ''),
              'holderName': f.holderName.trim(),
              'expiry': f.expiry.trim(),
              'cvv': f.cvv,
            }
          : null,
    };
