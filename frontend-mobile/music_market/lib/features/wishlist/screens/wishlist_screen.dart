import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/wishlist_provider.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/utils/formatters.dart';

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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wishlist'),
      ),
      body: Consumer<WishlistProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.items.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.errorMessage != null && provider.items.isEmpty) {
            return ErrorView(
              message: provider.errorMessage!,
              onRetry: () => provider.fetchWishlist(),
            );
          }

          if (provider.items.isEmpty) {
            return const EmptyState(message: 'Your wishlist is empty.');
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: provider.items.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final item = provider.items[index];
              return _WishlistCard(item: item, provider: provider);
            },
          );
        },
      ),
    );
  }
}

class _WishlistCard extends StatelessWidget {
  final dynamic item;
  final WishlistProvider provider;

  const _WishlistCard({required this.item, required this.provider});

  @override
  Widget build(BuildContext context) {
    final listing = item.listing;
    final priceDiff = listing.price - item.priceWhenSaved;
    final isDrop = priceDiff < 0;
    
    return GestureDetector(
      onTap: () => context.push('/listing/${item.listingId}'),
      child: AppCard(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: AppNetworkImage(
                imageUrl: listing.firstImageUrl,
                width: 80,
                height: 80,
                isThumbnail: true,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  PriceText(amount: listing.price),
                  if (priceDiff != 0)
                    Text(
                      '${isDrop ? "▼" : "▲"} LKR ${priceDiff.abs()} (${((priceDiff / item.priceWhenSaved) * 100).abs().toStringAsFixed(0)}%)',
                      style: TextStyle(
                        color: isDrop ? Colors.green : Colors.red,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  const SizedBox(height: 4),
                  if (listing.status == 'SOLD')
                    const Text('SOLD OUT', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12))
                  else
                    Text(Formatters.condition(listing.condition), style: const TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.favorite, color: Colors.red),
              onPressed: () => provider.removeFromWishlist(item.listingId),
            ),
          ],
        ),
      ),
    );
  }
}
