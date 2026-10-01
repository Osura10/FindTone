import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/shop_provider.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import 'package:intl/intl.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key});

  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ShopProvider>().fetchSales();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sales'),
      ),
      body: Consumer<ShopProvider>(
        builder: (context, provider, child) {
          if (provider.isLoadingSales && provider.sales.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.salesError != null && provider.sales.isEmpty) {
            return ErrorView(message: provider.salesError!, onRetry: provider.fetchSales);
          }
          if (provider.sales.isEmpty) {
            return const EmptyState(message: 'No sales found.');
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: provider.sales.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final sale = provider.sales[index];
              return AppCard(
                padding: const EdgeInsets.all(12),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: AppNetworkImage(
                        imageUrl: sale.listingImage,
                        width: 60,
                        height: 60,
                        isThumbnail: true,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(sale.listingTitle, style: const TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text('Buyer: ${sale.fullName}', style: const TextStyle(fontSize: 12)),
                          Text('Method: ${sale.paymentMethod}', style: const TextStyle(fontSize: 12)),
                          Text(DateFormat.yMMMd().format(sale.createdAt), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        ],
                      ),
                    ),
                    PriceText(amount: sale.amount, style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
              );
            },
          );
        },
      ),
    );
  }
}
