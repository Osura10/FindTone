import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/providers/catalog_provider.dart';
import '../../core/theme/app_theme.dart';
import '../../core/widgets/common_widgets.dart';
import '../auth/providers/auth_provider.dart';
import '../marketplace/providers/marketplace_provider.dart';
import '../marketplace/widgets/listing_card.dart';
import '../notifications/widgets/notification_bell.dart';

/// Home tab: greeting, search bar, category chips, assistant shortcut and the newest listings.
class DiscoverScreen extends StatefulWidget {
  /// Opens the full search (the Search tab for buyers, a search page for shops).
  final VoidCallback onOpenSearch;
  const DiscoverScreen({super.key, required this.onOpenSearch});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  static const _categoryIcons = <String, IconData>{
    'guitar': Icons.music_note_rounded,
    'keyboard': Icons.piano_rounded,
    'piano': Icons.piano_rounded,
    'drum': Icons.album_rounded,
    'micro': Icons.mic_rounded,
    'violin': Icons.music_note_rounded,
    'amp': Icons.speaker_rounded,
  };

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.read<MarketplaceProvider>().fetchLatest();
      context.read<CatalogProvider>().fetchCatalog();
    });
  }

  Future<void> _refresh() async {
    await Future.wait([
      context.read<MarketplaceProvider>().fetchLatest(),
      context.read<CatalogProvider>().fetchCatalog(),
    ]);
  }

  IconData _iconFor(String category) {
    final key = _categoryIcons.keys.firstWhere((k) => category.toLowerCase().contains(k), orElse: () => '');
    return _categoryIcons[key] ?? Icons.queue_music_rounded;
  }

  void _openCategory(String category) {
    final market = context.read<MarketplaceProvider>();
    market.applyFilters(category: category, brand: market.brand, condition: market.condition, minPrice: market.minPrice, maxPrice: market.maxPrice);
    widget.onOpenSearch();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final market = context.watch<MarketplaceProvider>();
    final categories = context.watch<CatalogProvider>().categories;
    final profileName = context.select<AuthProvider, String?>((a) => a.userProfile?['name']?.toString());
    final firstName = (profileName ?? '').trim().split(' ').first;

    return Scaffold(
      appBar: AppBar(
        title: const BrandMark(size: 30),
        actions: [
          IconButton(tooltip: 'Shopping assistant', icon: const Icon(Icons.auto_awesome_outlined), onPressed: () => context.push('/assistant')),
          const NotificationBell(),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, 0),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(firstName.isEmpty ? 'Find your sound' : 'Hi, $firstName', style: context.text.headlineSmall),
                  const SizedBox(height: 4),
                  Text('Instruments from trusted sellers across Sri Lanka', style: context.text.bodyMedium?.copyWith(color: c.textMuted)),
                  const SizedBox(height: AppSpacing.lg),
                  // Looks like a search field; tapping it opens the full search.
                  Semantics(
                    button: true,
                    label: 'Search instruments',
                    child: InkWell(
                      key: const ValueKey('home-search'),
                      onTap: widget.onOpenSearch,
                      borderRadius: BorderRadius.circular(AppRadius.full),
                      child: Ink(
                        height: 50,
                        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg),
                        decoration: BoxDecoration(
                          color: context.scheme.surface,
                          borderRadius: BorderRadius.circular(AppRadius.full),
                          border: Border.all(color: context.scheme.outline),
                        ),
                        child: Row(children: [
                          Icon(Icons.search_rounded, color: c.textMuted),
                          const SizedBox(width: 10),
                          Expanded(child: Text('Search guitars, keyboards, brands…', style: TextStyle(color: c.textMuted), overflow: TextOverflow.ellipsis)),
                          Icon(Icons.tune_rounded, color: c.textMuted, size: 20),
                        ]),
                      ),
                    ),
                  ),
                ]),
              ),
            ),

            if (categories.isNotEmpty) ...[
              const SliverToBoxAdapter(child: SectionHeader(title: 'Browse by category')),
              SliverToBoxAdapter(
                child: SizedBox(
                  height: 40,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page),
                    itemCount: categories.length,
                    separatorBuilder: (_, _) => const SizedBox(width: AppSpacing.sm),
                    itemBuilder: (_, i) => ActionChip(
                      labelPadding: const EdgeInsets.only(left: 2, right: 6),
                      avatar: Icon(_iconFor(categories[i]), size: 18, color: c.primaryText),
                      label: Text(categories[i]),
                      onPressed: () => _openCategory(categories[i]),
                    ),
                  ),
                ),
              ),
            ],

            // Assistant shortcut
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.xl, AppSpacing.page, 0),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    onTap: () => context.push('/assistant'),
                    child: Ink(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(AppRadius.lg),
                        gradient: const LinearGradient(colors: [Color(0xFF5B21B6), Color(0xFF7C3AED), Color(0xFFA21CAF)], begin: Alignment.topLeft, end: Alignment.bottomRight),
                      ),
                      child: Row(children: [
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(AppRadius.md)),
                          child: const Icon(Icons.auto_awesome, color: Colors.white),
                        ),
                        const SizedBox(width: AppSpacing.md),
                        const Expanded(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Text('Not sure what to buy?', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                            SizedBox(height: 2),
                            Text('Ask the AI shopping assistant', style: TextStyle(color: Color(0xE6FFFFFF), fontSize: 13)),
                          ]),
                        ),
                        const Icon(Icons.arrow_forward_rounded, color: Colors.white),
                      ]),
                    ),
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(child: SectionHeader(title: 'Latest listings', actionLabel: 'See all', onAction: widget.onOpenSearch)),

            if (market.isLoadingLatest && market.latest.isEmpty)
              const SliverToBoxAdapter(child: SizedBox(height: 560, child: ShimmerLoader.grid(count: 4)))
            else if (market.latestError != null && market.latest.isEmpty)
              SliverToBoxAdapter(child: ErrorState(message: market.latestError!, onRetry: market.fetchLatest))
            else if (market.latest.isEmpty)
              const SliverToBoxAdapter(child: EmptyState(icon: Icons.storefront_outlined, title: 'No listings yet', message: 'New instruments will show up here.'))
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.page, 0, AppSpacing.page, AppSpacing.xl),
                sliver: SliverGrid(
                  gridDelegate: listingGridDelegate(context),
                  delegate: SliverChildBuilderDelegate((_, i) => ListingCard(listing: market.latest[i]), childCount: market.latest.length),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
