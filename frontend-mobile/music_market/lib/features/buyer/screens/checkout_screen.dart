import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';
import '../../marketplace/models/listing_model.dart';
import '../../marketplace/providers/marketplace_provider.dart';
import '../checkout_validation.dart';
import '../providers/buyer_provider.dart';

/// Checkout (route /checkout/:id). Same rules as the web: demo card 1234 1234 1234 1234 or COD.
class CheckoutScreen extends StatefulWidget {
  final int listingId;
  const CheckoutScreen({super.key, required this.listingId});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _fullName = TextEditingController();
  final _phone = TextEditingController();
  final _address = TextEditingController();
  final _city = TextEditingController();
  final _postalCode = TextEditingController();
  final _notes = TextEditingController();
  final _cardNumber = TextEditingController();
  final _cardHolder = TextEditingController();
  final _expiry = TextEditingController();
  final _cvv = TextEditingController();
  String _paymentMethod = 'CARD';

  ListingDetail? _listing;
  bool _loading = true;
  String? _loadError;
  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    for (final c in [_fullName, _phone, _address, _city, _postalCode, _notes, _cardNumber, _cardHolder, _expiry, _cvv]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final listing = await context.read<MarketplaceProvider>().getListingDetails(widget.listingId);
      if (mounted) setState(() => _listing = listing);
    } catch (e) {
      if (mounted) setState(() => _loadError = describeError(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  CheckoutInput get _input => CheckoutInput(
        fullName: _fullName.text,
        phone: _phone.text,
        addressLine: _address.text,
        city: _city.text,
        paymentMethod: _paymentMethod,
        cardNumber: _cardNumber.text,
        holderName: _cardHolder.text,
        expiry: _expiry.text,
        cvv: _cvv.text,
      );

  Future<void> _submit() async {
    if (_submitting) return; // one order per tap
    final problem = validateCheckout(_input);
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() {
      _submitting = true;
      _error = null;
    });
    final marketplace = context.read<MarketplaceProvider>();
    try {
      final payload = checkoutPayload(widget.listingId, _input, postalCode: _postalCode.text, notes: _notes.text);
      final orderId = await context.read<BuyerProvider>().placeOrder(payload);
      marketplace.fetchListings(refresh: true);
      if (mounted) context.go('/order_success/$orderId');
    } catch (e) {
      if (!mounted) return;
      // Show exactly what the backend said, e.g. "This item has already been sold."
      setState(() {
        _error = describeError(e);
        if (statusOf(e) == 409 && _listing != null) _listing = null;
      });
      if (statusOf(e) == 409) _load();
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Widget _field(TextEditingController c, String label, {TextInputType? type, List<TextInputFormatter>? formatters, bool obscure = false, String? hint, Key? key}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          key: key,
          controller: c,
          keyboardType: type,
          inputFormatters: formatters,
          obscureText: obscure,
          decoration: InputDecoration(labelText: label, hintText: hint),
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (_loading && _listing == null) {
      return Scaffold(appBar: AppBar(title: const Text('Checkout')), body: const Center(child: CircularProgressIndicator()));
    }
    if (_listing == null) {
      return Scaffold(appBar: AppBar(title: const Text('Checkout')), body: ErrorView(message: _loadError ?? _error ?? 'Could not load the listing.', onRetry: _load));
    }
    final listing = _listing!;
    final myId = context.watch<AuthProvider>().userId;
    final blocked = listing.sellerId == myId
        ? 'You cannot buy your own listing.'
        : listing.status != 'LIVE'
            ? (listing.status == 'SOLD' ? 'This item has already been sold.' : 'This listing is not available for purchase.')
            : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              leading: SizedBox(width: 50, height: 50, child: AppNetworkImage(imageUrl: listing.images.isNotEmpty ? listing.images.first.url : null, isThumbnail: true)),
              title: Text(listing.title),
              subtitle: Text(Formatters.price(listing.price), style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
          if (blocked != null) ...[
            const SizedBox(height: 24),
            Text(blocked, textAlign: TextAlign.center, style: const TextStyle(color: Colors.redAccent, fontSize: 16)),
          ] else ...[
            const SizedBox(height: 16),
            const Text('Delivery details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _field(_fullName, 'Full name', key: const ValueKey('co-name')),
            _field(_phone, 'Phone number', type: TextInputType.phone, hint: 'e.g. 0771234567', key: const ValueKey('co-phone')),
            _field(_address, 'Address line', key: const ValueKey('co-address')),
            Row(children: [
              Expanded(child: _field(_city, 'City', key: const ValueKey('co-city'))),
              const SizedBox(width: 12),
              Expanded(child: _field(_postalCode, 'Postal code (optional)')),
            ]),
            _field(_notes, 'Delivery notes (optional)'),
            const SizedBox(height: 8),
            const Text('Payment method', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'CARD', icon: Icon(Icons.credit_card), label: Text('Card')),
                ButtonSegment(value: 'COD', icon: Icon(Icons.money), label: Text('Cash on Delivery')),
              ],
              selected: {_paymentMethod},
              onSelectionChanged: (s) => setState(() => _paymentMethod = s.first),
            ),
            const SizedBox(height: 12),
            if (_paymentMethod == 'CARD') ...[
              const Text('Demo mode – use card 1234 1234 1234 1234, any future expiry (MM/YY), any 3-digit CVV. Only the last 4 digits are stored.',
                  style: TextStyle(color: Colors.amber, fontSize: 12)),
              const SizedBox(height: 8),
              _field(_cardNumber, 'Card number', type: TextInputType.number, hint: '0000 0000 0000 0000', key: const ValueKey('co-card'),
                  formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(16), _CardNumberFormatter()]),
              _field(_cardHolder, 'Card holder name', key: const ValueKey('co-holder')),
              Row(children: [
                Expanded(
                  child: _field(_expiry, 'Expiry (MM/YY)', type: TextInputType.number, hint: 'MM/YY', key: const ValueKey('co-expiry'),
                      formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4), _ExpiryFormatter()]),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _field(_cvv, 'CVV', type: TextInputType.number, obscure: true, key: const ValueKey('co-cvv'),
                      formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)]),
                ),
              ]),
            ],
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(_error!, key: const ValueKey('checkout-error'), style: const TextStyle(color: Colors.redAccent)),
              ),
            SizedBox(
              height: 50,
              child: ElevatedButton(
                key: const ValueKey('place-order'),
                onPressed: _submitting ? null : _submit,
                child: _submitting
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))
                    : Text('Place order • ${Formatters.price(listing.price)}'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Shows the card number in groups of 4 ("1234 1234 ..."); digits only are kept in the value check.
class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(' ', '');
    final buffer = StringBuffer();
    for (var i = 0; i < digits.length; i++) {
      if (i > 0 && i % 4 == 0) buffer.write(' ');
      buffer.write(digits[i]);
    }
    final text = buffer.toString();
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}

/// Adds the "/" after the month: "1230" -> "12/30".
class _ExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll('/', '');
    final text = digits.length > 2 ? '${digits.substring(0, 2)}/${digits.substring(2)}' : digits;
    return TextEditingValue(text: text, selection: TextSelection.collapsed(offset: text.length));
  }
}
