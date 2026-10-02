import 'package:flutter/material.dart';
import '../../../core/widgets/common_widgets.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/buyer_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../notifications/widgets/notification_bell.dart';
import '../../shop/widgets/order_tile.dart';

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
      appBar: AppBar(title: const Text('My Orders'), actions: const [NotificationBell(), SizedBox(width: 4)]),
      body: Consumer<BuyerProvider>(
        builder: (context, provider, child) {
          Widget body;
          if (provider.isLoadingOrders && provider.myOrders.isEmpty) {
            body = const ShimmerLoader.list(count: 4, rowHeight: 130);
          } else if (provider.errorMessage != null && provider.myOrders.isEmpty) {
            body = ListView(children: [ErrorState(message: provider.errorMessage!, onRetry: provider.fetchMyOrders)]);
          } else if (provider.myOrders.isEmpty) {
            body = ListView(children: [
              const SizedBox(height: 60),
              EmptyState(
                icon: Icons.shopping_bag_outlined,
                title: 'No orders yet',
                message: 'Browse the marketplace to find great deals on instruments.',
                action: FilledButton(onPressed: () => context.go('/'), child: const Text('Browse marketplace')),
              ),
            ]);
          } else {
            body = ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.xxl),
              itemCount: provider.myOrders.length,
              separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) => OrderTile(order: provider.myOrders[index], seller: false),
            );
          }
          return RefreshIndicator(onRefresh: provider.fetchMyOrders, child: body);
        },
      ),
    );
  }
}
