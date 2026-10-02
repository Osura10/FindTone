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
import '../../../core/theme/app_theme.dart';

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

  Widget _field(TextEditingController c, String label, {TextInputType? type, List<TextInputFormatter>? formatters, bool obscure = false, String? hint, Key? key, IconData? icon}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.md),
        child: TextField(
          key: key,
          controller: c,
          keyboardType: type,
          inputFormatters: formatters,
          obscureText: obscure,
          decoration: InputDecoration(labelText: label, hintText: hint, prefixIcon: icon != null ? Icon(icon, size: 20) : null),
        ),
      );

  Widget _payOption(String value, IconData icon, String title, String subtitle) {
    final selected = _paymentMethod == value;
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Semantics(
        selected: selected,
        button: true,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: () => setState(() => _paymentMethod = value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 160),
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: selected ? c.primarySoft : context.scheme.surface,
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: selected ? context.scheme.primary : context.scheme.outline, width: selected ? 2 : 1),
            ),
            child: Row(children: [
              Icon(icon, color: selected ? c.primaryText : c.textMuted),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                  Text(subtitle, style: context.text.bodySmall),
                ]),
              ),
              Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, size: 20, color: selected ? c.primaryText : c.textMuted),
            ]),
          ),
        ),
      ),
    );
  }

  Widget _card(String title, IconData icon, List<Widget> children) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.lg),
        child: AppCard(
          child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Row(children: [
              Icon(icon, size: 20, color: context.colors.primaryText),
              const SizedBox(width: AppSpacing.sm),
              Text(title, style: context.text.titleMedium),
            ]),
            const SizedBox(height: AppSpacing.lg),
            ...children,
          ]),
        ),
      );

  @override
  Widget build(BuildContext context) {
    if (_loading && _listing == null) {
      return Scaffold(appBar: AppBar(title: const Text('Checkout')), body: const ShimmerLoader.list(count: 3, rowHeight: 180));
    }
    if (_listing == null) {
      return Scaffold(appBar: AppBar(title: const Text('Checkout')), body: ErrorState(message: _loadError ?? _error ?? 'Could not load the listing.', onRetry: _load));
    }
    final listing = _listing!;
    final c = context.colors;
    final myId = context.watch<AuthProvider>().userId;
    final blocked = listing.sellerId == myId
        ? 'You cannot buy your own listing.'
        : listing.status != 'LIVE'
            ? (listing.status == 'SOLD' ? 'This item has already been sold.' : 'This listing is not available for purchase.')
            : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.xl),
        children: [
          // Order summary
          AppCard(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: AppNetworkImage(imageUrl: listing.images.isNotEmpty ? listing.images.first.url : null, width: 64, height: 64, isThumbnail: true),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(listing.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                  const SizedBox(height: 2),
                  Text('${Formatters.condition(listing.condition)} · ${listing.sellerName}', style: context.text.bodySmall, maxLines: 1, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  PriceTag(amount: listing.price, size: 17),
                ]),
              ),
            ]),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (blocked != null)
            InlineNotice(message: blocked, tone: NoticeTone.error)
          else ...[
            _card('Delivery details', Icons.local_shipping_outlined, [
              _field(_fullName, 'Full name', key: const ValueKey('co-name'), icon: Icons.person_outline_rounded),
              _field(_phone, 'Phone number', type: TextInputType.phone, hint: 'e.g. 0771234567', key: const ValueKey('co-phone'), icon: Icons.phone_outlined),
              _field(_address, 'Address line', key: const ValueKey('co-address'), icon: Icons.home_outlined),
              Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(child: _field(_city, 'City', key: const ValueKey('co-city'))),
                const SizedBox(width: AppSpacing.md),
                Expanded(child: _field(_postalCode, 'Postal code', hint: 'Optional')),
              ]),
              _field(_notes, 'Delivery notes (optional)'),
            ]),
            _card('Payment method', Icons.account_balance_wallet_outlined, [
              _payOption('CARD', Icons.credit_card_rounded, 'Card payment', 'Visa, Mastercard'),
              _payOption('COD', Icons.payments_outlined, 'Cash on delivery', 'Pay when it arrives'),
              if (_paymentMethod == 'CARD') ...[
                const SizedBox(height: AppSpacing.lg),
                const InlineNotice(
                  message: 'Demo mode – use card 1234 1234 1234 1234, any future expiry (MM/YY) and any 3-digit CVV. Only the last 4 digits are stored.',
                  tone: NoticeTone.info,
                ),
                const SizedBox(height: AppSpacing.lg),
                _field(_cardNumber, 'Card number', type: TextInputType.number, hint: '0000 0000 0000 0000', key: const ValueKey('co-card'), icon: Icons.credit_card_rounded,
                    formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(16), _CardNumberFormatter()]),
                _field(_cardHolder, 'Card holder name', key: const ValueKey('co-holder')),
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Expanded(
                    child: _field(_expiry, 'Expiry (MM/YY)', type: TextInputType.number, hint: 'MM/YY', key: const ValueKey('co-expiry'),
                        formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(4), _ExpiryFormatter()]),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: _field(_cvv, 'CVV', type: TextInputType.number, obscure: true, key: const ValueKey('co-cvv'),
                        formatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)]),
                  ),
                ]),
              ],
            ]),
            if (_error != null)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.md),
                child: InlineNotice(key: const ValueKey('checkout-error'), message: _error!, tone: NoticeTone.error),
              ),
            Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              Icon(Icons.lock_outline_rounded, size: 14, color: c.textMuted),
              const SizedBox(width: 4),
              Text('Your details go only to the seller for delivery.', style: context.text.bodySmall),
            ]),
          ],
        ],
      ),
      // Sticky total + Place order
      bottomNavigationBar: blocked != null
          ? null
          : Container(
              decoration: BoxDecoration(color: context.scheme.surface, border: Border(top: BorderSide(color: c.border))),
              child: SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.md, AppSpacing.page, AppSpacing.md),
                  child: Row(children: [
                    Expanded(
                      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text('Total', style: context.text.bodySmall),
                        PriceTag(amount: listing.price, size: 20),
                      ]),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      flex: 2,
                      child: SizedBox(
                        height: 52,
                        child: FilledButton(
                          key: const ValueKey('place-order'),
                          onPressed: _submitting ? null : _submit,
                          child: _submitting
                              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                              : const Text('Place order'),
                        ),
                      ),
                    ),
                  ]),
                ),
              ),
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
