import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/marketplace_provider.dart';
import '../models/listing_model.dart';
import '../../../core/providers/catalog_provider.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/utils/formatters.dart';

class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketplaceProvider>().fetchListings(refresh: true);
      context.read<CatalogProvider>().fetchCatalog();
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      context.read<MarketplaceProvider>().fetchListings();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _showFilterSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return const _FilterSheet();
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Marketplace'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_active),
            onPressed: () => context.push('/my_alerts'),
            tooltip: 'My Alerts',
          ),
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: _showFilterSheet,
          ),
        ],
      ),
      body: Consumer<MarketplaceProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.listings.isEmpty) {
            return _buildShimmerGrid();
          }

          if (provider.errorMessage != null && provider.listings.isEmpty) {
            return ErrorView(
              message: provider.errorMessage!,
              onRetry: () => provider.fetchListings(refresh: true),
            );
          }

          if (provider.listings.isEmpty) {
            return const EmptyState(message: 'No listings found.');
          }

          return RefreshIndicator(
            onRefresh: () => provider.fetchListings(refresh: true),
            child: GridView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                childAspectRatio: 0.7,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
              ),
              itemCount: provider.listings.length + (provider.hasMore ? 1 : 0),
              itemBuilder: (context, index) {
                if (index == provider.listings.length) {
                  return const Center(child: CircularProgressIndicator());
                }
                final listing = provider.listings[index];
                return _ListingCard(listing: listing);
              },
            ),
          );
        },
      ),
    );
  }

  Widget _buildShimmerGrid() {
    return GridView.builder(
      padding: const EdgeInsets.all(12),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        childAspectRatio: 0.7,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: 6,
      itemBuilder: (context, index) {
        return const LoadingShimmer(height: double.infinity);
      },
    );
  }
}

class _ListingCard extends StatelessWidget {
  final ListingSummary listing;
  
  const _ListingCard({required this.listing});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => context.push('/listing/${listing.id}'),
      child: AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (listing.firstImageUrl != null)
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                      child: AppNetworkImage(
                        imageUrl: listing.firstImageUrl,
                        isThumbnail: true,
                      ),
                    )
                  else
                    const Icon(Icons.image, size: 50, color: Colors.grey),
                  
                  if (listing.status == 'SOLD')
                    Positioned(
                      top: 10,
                      right: -30,
                      child: Transform.rotate(
                        angle: 0.785, // 45 degrees
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 4),
                          color: Colors.red,
                          child: const Text(
                            'SOLD OUT',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                          ),
                        ),
                      ),
                    ),
                  
                  if (listing.priceVerdict != null && listing.priceVerdict != 'UNKNOWN')
                    Positioned(
                      bottom: 8,
                      left: 8,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: Formatters.getVerdictColor(listing.priceVerdict),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          Formatters.getVerdictText(listing.priceVerdict),
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  
                  if (listing.trustScore != null)
                    Positioned(
                      bottom: 8,
                      right: 8,
                      child: Container(
                        padding: const EdgeInsets.all(4),
                        decoration: BoxDecoration(
                          color: Formatters.getTrustColor(listing.trustScore!).withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.verified, color: Colors.white, size: 12),
                            const SizedBox(width: 4),
                            Text('Trust ${listing.trustScore}', style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(8.0),
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
                  const SizedBox(height: 4),
                  Text(
                    Formatters.condition(listing.condition),
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet();

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  String? _category;
  String? _brand;
  String? _condition;

  @override
  void initState() {
    super.initState();
    final provider = context.read<MarketplaceProvider>();
    _category = provider.category;
    _brand = provider.brand;
    _condition = provider.condition;
  }

  @override
  Widget build(BuildContext context) {
    final catalog = context.watch<CatalogProvider>();
    
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text('Filter', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(labelText: 'Category'),
            items: [
              const DropdownMenuItem(value: null, child: Text('All Categories')),
              ...catalog.categories.map((c) => DropdownMenuItem(value: c, child: Text(c))),
            ],
            onChanged: (val) => setState(() => _category = val),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _brand,
            decoration: const InputDecoration(labelText: 'Brand'),
            items: [
              const DropdownMenuItem(value: null, child: Text('All Brands')),
              ...catalog.brands.map((b) => DropdownMenuItem(value: b, child: Text(b))),
            ],
            onChanged: (val) => setState(() => _brand = val),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _condition,
            decoration: const InputDecoration(labelText: 'Condition'),
            items: const [
              DropdownMenuItem(value: null, child: Text('All Conditions')),
              DropdownMenuItem(value: 'new', child: Text('New')),
              DropdownMenuItem(value: 'like_new', child: Text('Like New')),
              DropdownMenuItem(value: 'excellent', child: Text('Excellent')),
              DropdownMenuItem(value: 'good', child: Text('Good')),
              DropdownMenuItem(value: 'fair', child: Text('Fair')),
              DropdownMenuItem(value: 'poor', child: Text('Poor')),
              DropdownMenuItem(value: 'for_parts', child: Text('For Parts')),
            ],
            onChanged: (val) => setState(() => _condition = val),
          ),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              context.read<MarketplaceProvider>().applyFilters(
                category: _category,
                brand: _brand,
                condition: _condition,
              );
              Navigator.pop(context);
            },
            child: const Text('Apply'),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
