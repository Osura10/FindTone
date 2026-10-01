import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../shop/models/order_model.dart';
import '../providers/buyer_provider.dart';

/// Shown after a successful order (route /order_success/:orderId). Uses the order id from the API.
class OrderSuccessScreen extends StatefulWidget {
  final int orderId;
  final OrderModel? order;

  const OrderSuccessScreen({super.key, required this.orderId, this.order});

  @override
  State<OrderSuccessScreen> createState() => _OrderSuccessScreenState();
}

class _OrderSuccessScreenState extends State<OrderSuccessScreen> {
  OrderModel? _order;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    if (_order == null) {
      WidgetsBinding.instance.addPostFrameCallback((_) async {
        final found = await context.read<BuyerProvider>().findOrder(widget.orderId);
        if (mounted) setState(() => _order = found);
      });
    }
  }

  Widget _row(String label, String value) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: const TextStyle(color: Colors.grey)),
            Flexible(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.bold))),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final order = _order;
    return Scaffold(
      appBar: AppBar(title: const Text('Order Placed'), automaticallyImplyLeading: false),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 80),
              const SizedBox(height: 24),
              const Text('Order placed!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Your order #${widget.orderId} has been created.', key: const ValueKey('order-id'), style: const TextStyle(fontSize: 16)),
              const SizedBox(height: 24),
              if (order != null)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(children: [
                      _row('Item', order.listingTitle),
                      _row('Amount', Formatters.price(order.amount)),
                      _row('Payment', order.paymentMethod == 'CARD' ? 'Card ending in ${order.cardLast4 ?? '????'} (paid)' : 'Cash on Delivery'),
                      _row('Deliver to', '${order.fullName}, ${order.addressLine}, ${order.city}'),
                    ]),
                  ),
                ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(onPressed: () => context.go('/my_orders'), child: const Text('View My Orders')),
              ),
              const SizedBox(height: 12),
              TextButton(onPressed: () => context.go('/'), child: const Text('Back to Home')),
            ],
          ),
        ),
      ),
    );
  }
}
