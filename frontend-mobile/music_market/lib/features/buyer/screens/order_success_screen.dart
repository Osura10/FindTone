import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/utils/formatters.dart';
import '../../shop/models/order_model.dart';
import '../providers/buyer_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/primary_button.dart';

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
        padding: const EdgeInsets.symmetric(vertical: 6),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 92, child: Text(label, style: context.text.bodySmall)),
            Expanded(child: Text(value, textAlign: TextAlign.end, style: const TextStyle(fontWeight: FontWeight.w600))),
          ],
        ),
      );

  @override
  Widget build(BuildContext context) {
    final order = _order;
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(title: const Text('Order placed'), automaticallyImplyLeading: false),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                children: [
                  Container(
                    width: 92,
                    height: 92,
                    decoration: BoxDecoration(color: c.successSoft, shape: BoxShape.circle),
                    child: Icon(Icons.check_rounded, color: c.success, size: 52),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text('Order placed!', style: context.text.headlineSmall),
                  const SizedBox(height: AppSpacing.sm),
                  Text('Your order #${widget.orderId} has been created.', key: const ValueKey('order-id'), style: TextStyle(fontSize: 15, color: c.textMuted)),
                  const SizedBox(height: AppSpacing.xl),
                  if (order != null)
                    AppCard(
                      child: Column(children: [
                        _row('Item', order.listingTitle),
                        const Divider(),
                        _row('Amount', Formatters.price(order.amount)),
                        const Divider(),
                        _row('Payment', order.paymentMethod == 'CARD' ? 'Card ending in ${order.cardLast4 ?? '????'} (paid)' : 'Cash on Delivery'),
                        const Divider(),
                        _row('Deliver to', '${order.fullName}, ${order.addressLine}, ${order.city}'),
                      ]),
                    )
                  else
                    const LoadingShimmer(height: 180, borderRadius: AppRadius.lg),
                  const SizedBox(height: AppSpacing.xl),
                  PrimaryButton(text: 'View My Orders', icon: Icons.receipt_long_outlined, onPressed: () => context.go('/my_orders')),
                  const SizedBox(height: AppSpacing.md),
                  PrimaryButton(text: 'Back to Home', variant: ButtonVariant.outlined, onPressed: () => context.go('/')),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
