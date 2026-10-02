import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/wishlist_provider.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/theme/app_theme.dart';
import '../../notifications/widgets/notification_bell.dart';
import '../models/wishlist_item_model.dart';

class WishlistScreen extends StatefulWidget {
  const WishlistScreen({super.key});

  @override
  State<WishlistScreen> createState() => _WishlistScreenState();
}

class _WishlistScreenState extends State<WishlistScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WishlistProvider>().fetchWishlist();
    });
  }

  @override
  Widget build(BuildContext context) {
    final canPop = Navigator.of(context).canPop();
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: canPop,
        title: const Text('Wishlist'),
        actions: const [NotificationBell(), SizedBox(width: 4)],
      ),
      body: Consumer<WishlistProvider>(
        builder: (context, provider, child) {
          Widget body;
          if (provider.isLoading && provider.items.isEmpty) {
            body = const ShimmerLoader.list(count: 4, rowHeight: 104);
          } else if (provider.errorMessage != null && provider.items.isEmpty) {
            body = ListView(children: [ErrorState(message: provider.errorMessage!, onRetry: () => provider.fetchWishlist())]);
          } else if (provider.items.isEmpty) {
            body = ListView(children: [
              const SizedBox(height: 60),
              EmptyState(
                icon: Icons.favorite_border_rounded,
                title: 'Your wishlist is empty',
                message: 'Tap the heart on a listing to get a notification every time its price drops.',
              ),
            ]);
          } else {
            body = ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.xxl),
              itemCount: provider.items.length + 1,
              separatorBuilder: (context, index) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (context, index) {
                if (index == 0) {
                  return Text('${provider.items.length} saved · we tell you when a price drops', style: context.text.bodySmall);
                }
                return _WishlistCard(item: provider.items[index - 1], provider: provider);
              },
            );
          }
          return RefreshIndicator(onRefresh: provider.fetchWishlist, child: body);
        },
      ),
    );
  }
}

class _WishlistCard extends StatelessWidget {
  final WishlistItemModel item;
  final WishlistProvider provider;

  const _WishlistCard({required this.item, required this.provider});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final listing = item.listing;
    final priceDiff = listing.price - item.priceWhenSaved;
    final isDrop = priceDiff < 0;
    final sold = listing.status == 'SOLD';
    final percent = item.priceWhenSaved > 0 ? ((priceDiff / item.priceWhenSaved) * 100).abs().toStringAsFixed(0) : '0';

    return AppCard(
      padding: const EdgeInsets.all(AppSpacing.md),
      onTap: () => context.push('/listing/${item.listingId}'),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: SizedBox(
              width: 88,
              height: 88,
              child: Stack(fit: StackFit.expand, children: [
                AppNetworkImage(imageUrl: listing.firstImageUrl, isThumbnail: true),
                if (sold)
                  Container(
                    color: Colors.black.withValues(alpha: 0.5),
                    alignment: Alignment.center,
                    child: const Text('SOLD', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 1)),
                  ),
              ]),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(listing.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                PriceTag(amount: listing.price, size: 16),
                const SizedBox(height: 6),
                if (sold)
                  Pill(label: 'Sold out', color: c.danger, background: c.dangerSoft)
                else if (priceDiff != 0)
                  Pill(
                    label: '${isDrop ? '−' : '+'}${Formatters.price(priceDiff.abs())} ($percent%)',
                    color: isDrop ? c.success : c.danger,
                    background: isDrop ? c.successSoft : c.dangerSoft,
                    icon: isDrop ? Icons.trending_down_rounded : Icons.trending_up_rounded,
                  )
                else
                  Text('${Formatters.condition(listing.condition)} · no price change', style: context.text.bodySmall),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Remove from wishlist',
            icon: const Icon(Icons.favorite_rounded, color: Color(0xFFE11D48)),
            onPressed: () => provider.removeFromWishlist(item.listingId),
          ),
        ],
      ),
    );
  }
}
