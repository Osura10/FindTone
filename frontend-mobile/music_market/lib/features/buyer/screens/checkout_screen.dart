import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../marketplace/models/listing_model.dart';
import '../../marketplace/providers/marketplace_provider.dart';
import '../providers/buyer_provider.dart';
import '../../../core/utils/formatters.dart';

class CheckoutScreen extends StatefulWidget {
  final ListingDetail listing;
  const CheckoutScreen({super.key, required this.listing});

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  
  String _fullName = '';
  String _phone = '';
  String _address = '';
  String _city = '';
  String _postalCode = '';
  String _notes = '';
  
  String _paymentMethod = 'CARD'; // CARD or COD
  
  String _cardNumber = '';
  String _cardHolder = '';
  String _cardExpiry = '';
  String _cardCvv = '';

  bool _isSubmitting = false;

  void _submit() async {
    if (_isSubmitting) return;
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();

    setState(() => _isSubmitting = true);

    final data = {
      'listingId': widget.listing.id,
      'amount': widget.listing.price,
      'paymentMethod': _paymentMethod,
      'fullName': _fullName,
      'phone': _phone,
      'addressLine': _address,
      'city': _city,
      'postalCode': _postalCode,
      'notes': _notes,
    };

    if (_paymentMethod == 'CARD') {
      data['card'] = {
        'number': _cardNumber.replaceAll(' ', ''),
        'expiry': _cardExpiry,
        'cvv': _cardCvv,
        'holderName': _cardHolder,
      };
    }

    try {
      final order = await context.read<BuyerProvider>().placeOrder(data);
      if (mounted) {
        context.read<MarketplaceProvider>().fetchListings(refresh: true);
        context.go('/order_success', extra: order);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Checkout')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Order Summary
            const Text('Order Summary', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Card(
              child: ListTile(
                leading: widget.listing.images.isNotEmpty
                    ? Image.network(widget.listing.images.first.url, width: 50, height: 50, fit: BoxFit.cover)
                    : const Icon(Icons.music_note, size: 50),
                title: Text(widget.listing.title),
                subtitle: Text(Formatters.price(widget.listing.price), style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.blue)),
              ),
            ),
            const SizedBox(height: 24),
            
            // Delivery Details
            const Text('Delivery Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            TextFormField(
              decoration: const InputDecoration(labelText: 'Full Name'),
              validator: (v) => v!.isEmpty ? 'Required' : null,
              onSaved: (v) => _fullName = v!,
            ),
            const SizedBox(height: 16),
            TextFormField(
              decoration: const InputDecoration(labelText: 'Phone Number', hintText: 'e.g. 0771234567'),
              keyboardType: TextInputType.phone,
              validator: (v) {
                if (v == null || v.isEmpty) return 'Required';
                if (!RegExp(r'^(?:0|94|\+94)?7\d{8}$').hasMatch(v)) {
                  return 'Enter a valid Sri Lankan mobile number';
                }
                return null;
              },
              onSaved: (v) => _phone = v!,
            ),
            const SizedBox(height: 16),
            TextFormField(
              decoration: const InputDecoration(labelText: 'Address Line'),
              validator: (v) => v!.isEmpty ? 'Required' : null,
              onSaved: (v) => _address = v!,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: TextFormField(
                    decoration: const InputDecoration(labelText: 'City'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                    onSaved: (v) => _city = v!,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: TextFormField(
                    decoration: const InputDecoration(labelText: 'Postal Code'),
                    validator: (v) => v!.isEmpty ? 'Required' : null,
                    onSaved: (v) => _postalCode = v!,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              decoration: const InputDecoration(labelText: 'Delivery Notes (Optional)'),
              maxLines: 2,
              onSaved: (v) => _notes = v ?? '',
            ),
            const SizedBox(height: 24),

            // Payment Method
            const Text('Payment Method', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _PaymentCard(
                    title: 'Card Payment',
                    icon: Icons.credit_card,
                    isSelected: _paymentMethod == 'CARD',
                    onTap: () => setState(() => _paymentMethod = 'CARD'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _PaymentCard(
                    title: 'Cash on Delivery',
                    icon: Icons.money,
                    isSelected: _paymentMethod == 'COD',
                    onTap: () => setState(() => _paymentMethod = 'COD'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            
            if (_paymentMethod == 'CARD') ...[
              const Text('Demo mode - use card 1234 1234 1234 1234', style: TextStyle(color: Colors.amber, fontSize: 12)),
              const SizedBox(height: 8),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Card Number', hintText: '0000 0000 0000 0000'),
                keyboardType: TextInputType.number,
                inputFormatters: [
                  FilteringTextInputFormatter.digitsOnly,
                  _CardNumberFormatter(),
                  LengthLimitingTextInputFormatter(19),
                ],
                validator: (v) => v!.replaceAll(' ', '').length < 16 ? 'Invalid card' : null,
                onSaved: (v) => _cardNumber = v!,
              ),
              const SizedBox(height: 16),
              TextFormField(
                decoration: const InputDecoration(labelText: 'Cardholder Name'),
                validator: (v) => v!.isEmpty ? 'Required' : null,
                onSaved: (v) => _cardHolder = v!,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      decoration: const InputDecoration(labelText: 'Expiry (MM/YY)', hintText: 'MM/YY'),
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        _ExpiryFormatter(),
                        LengthLimitingTextInputFormatter(5),
                      ],
                      validator: (v) {
                        if (v!.length != 5) return 'Invalid expiry';
                        final parts = v.split('/');
                        if (parts.length == 2) {
                          final month = int.tryParse(parts[0]);
                          int? year = int.tryParse(parts[1]);
                          if (month != null && year != null) {
                            year = year < 100 ? 2000 + year : year;
                            final now = DateTime.now();
                            if (year < now.year || (year == now.year && month < now.month)) {
                              return 'Card expired';
                            }
                          }
                        }
                        return null;
                      },
                      onSaved: (v) => _cardExpiry = v!,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: TextFormField(
                      decoration: const InputDecoration(labelText: 'CVV'),
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(3),
                      ],
                      validator: (v) => v!.length != 3 ? 'Invalid CVV' : null,
                      onSaved: (v) => _cardCvv = v!,
                    ),
                  ),
                ],
              ),
            ],
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                child: _isSubmitting
                    ? const CircularProgressIndicator()
                    : Text('Pay ${Formatters.price(widget.listing.price)}'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _PaymentCard({required this.title, required this.icon, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: isSelected ? Colors.blue.withValues(alpha: 0.1) : Colors.transparent,
          border: Border.all(color: isSelected ? Colors.blue : Colors.grey),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? Colors.blue : Colors.grey),
            const SizedBox(height: 8),
            Text(title, style: TextStyle(color: isSelected ? Colors.blue : Colors.grey, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

class _CardNumberFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var text = newValue.text;
    if (newValue.selection.baseOffset == 0) {
      return newValue;
    }
    var buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      var nonZeroIndex = i + 1;
      if (nonZeroIndex % 4 == 0 && nonZeroIndex != text.length) {
        buffer.write(' ');
      }
    }
    var string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}

class _ExpiryFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    var text = newValue.text;
    if (newValue.selection.baseOffset == 0) {
      return newValue;
    }
    var buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      var nonZeroIndex = i + 1;
      if (nonZeroIndex == 2 && nonZeroIndex != text.length) {
        buffer.write('/');
      }
    }
    var string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}
