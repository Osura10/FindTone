import 'package:flutter/material.dart';
import '../../../core/widgets/common_widgets.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../providers/buyer_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';

class MyOrdersScreen extends StatefulWidget {
  const MyOrdersScreen({super.key});

  @override
  State<MyOrdersScreen> createState() => _MyOrdersScreenState();
}

class _MyOrdersScreenState extends State<MyOrdersScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<BuyerProvider>().fetchMyOrders();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Orders')),
      body: Consumer<BuyerProvider>(
        builder: (context, provider, child) {
          if (provider.isLoadingOrders && provider.myOrders.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.errorMessage != null && provider.myOrders.isEmpty) {
            return ErrorView(message: provider.errorMessage!, onRetry: provider.fetchMyOrders);
          }
          if (provider.myOrders.isEmpty) {
            return const Center(child: Text('You have no orders yet.'));
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: provider.myOrders.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final order = provider.myOrders[index];
              return Card(
                child: InkWell(
                  onTap: () => context.push('/listing/${order.listingId}'),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: AppNetworkImage(
                            imageUrl: order.listingImage,
                            width: 80,
                            height: 80,
                            isThumbnail: true,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(order.listingTitle, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const SizedBox(height: 4),
                              Text(Formatters.price(order.amount), style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 4),
                              Text('Status: ${order.status}', style: TextStyle(color: order.status == 'COMPLETED' ? Colors.green : Colors.amber)),
                              const SizedBox(height: 4),
                              Text(
                                '${DateFormat.yMMMd().format(order.createdAt)} • ${order.paymentMethod}',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
