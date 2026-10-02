import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/shop_provider.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/theme/app_theme.dart';
import '../../notifications/widgets/notification_bell.dart';
import '../widgets/order_tile.dart';
import '../../../core/utils/formatters.dart';

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
    final canPop = Navigator.of(context).canPop();
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: canPop,
        title: const Text('Sales'),
        actions: const [NotificationBell(), SizedBox(width: 4)],
      ),
      body: Consumer<ShopProvider>(
        builder: (context, provider, child) {
          Widget body;
          if (provider.isLoadingSales && provider.sales.isEmpty) {
            body = const ShimmerLoader.list(count: 4, rowHeight: 120);
          } else if (provider.salesError != null && provider.sales.isEmpty) {
            body = ListView(children: [ErrorState(message: provider.salesError!, onRetry: provider.fetchSales)]);
          } else if (provider.sales.isEmpty) {
            body = ListView(children: const [
              SizedBox(height: 60),
              EmptyState(icon: Icons.payments_outlined, title: 'No sales yet', message: 'When buyers purchase your items, the orders will appear here.'),
            ]);
          } else {
            final total = provider.sales.fold<double>(0, (sum, s) => sum + s.amount);
            final cod = provider.sales.where((s) => s.paymentMethod != 'CARD').length;
            body = ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.xxl),
              children: [
                IntrinsicHeight(
                  child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                  Expanded(child: _StatTile(label: 'Total sales', value: Formatters.price(total), icon: Icons.payments_outlined, highlight: true, hint: 'All time')),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(child: _StatTile(label: 'Orders', value: '${provider.sales.length}', icon: Icons.receipt_long_outlined, hint: '$cod cash on delivery')),
                  ]),
                ),
                const SizedBox(height: AppSpacing.lg),
                for (final sale in provider.sales) ...[
                  OrderTile(order: sale, seller: true),
                  const SizedBox(height: AppSpacing.md),
                ],
              ],
            );
          }
          return RefreshIndicator(onRefresh: provider.fetchSales, child: body);
        },
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final String? hint;
  final bool highlight;
  const _StatTile({required this.label, required this.value, required this.icon, this.hint, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: highlight ? c.successSoft : c.primarySoft, borderRadius: BorderRadius.circular(AppRadius.sm)),
            child: Icon(icon, size: 18, color: highlight ? c.success : c.primaryText),
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(label, style: context.text.bodySmall, overflow: TextOverflow.ellipsis)),
        ]),
        const SizedBox(height: AppSpacing.md),
        FittedBox(fit: BoxFit.scaleDown, alignment: Alignment.centerLeft, child: Text(value, style: context.text.titleLarge?.copyWith(fontWeight: FontWeight.w800))),
        if (hint != null) Text(hint!, style: context.text.bodySmall),
      ]),
    );
  }
}
