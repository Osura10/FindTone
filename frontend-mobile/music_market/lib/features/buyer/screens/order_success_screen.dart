import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../shop/models/order_model.dart';
import '../../../core/utils/formatters.dart';

class OrderSuccessScreen extends StatelessWidget {
  final OrderModel order;
  
  const OrderSuccessScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Order Placed')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, color: Colors.green, size: 80),
              const SizedBox(height: 24),
              const Text('Payment Successful!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('Your order #${order.id} has been placed.', style: const TextStyle(fontSize: 16)),
              const SizedBox(height: 32),
              
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      _buildRow('Item', order.listingTitle),
                      const SizedBox(height: 8),
                      _buildRow('Amount', Formatters.price(order.amount)),
                      const SizedBox(height: 8),
                      _buildRow('Payment Method', order.paymentMethod == 'CARD' ? 'Card ending in ${order.cardLast4}' : 'Cash on Delivery'),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: () => context.go('/buyer_home'),
                  child: const Text('Back to Home'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey)),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }
}
