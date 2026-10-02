import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/marketplace_provider.dart';
import '../widgets/listing_card.dart';
import '../../../core/providers/catalog_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../notifications/widgets/notification_bell.dart';

const _conditionCodes = ['new', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'];

/// Search tab: server-side search (?q=) + filters, infinite scroll, pull-to-refresh.
class MarketplaceScreen extends StatefulWidget {
  const MarketplaceScreen({super.key});

  @override
  State<MarketplaceScreen> createState() => _MarketplaceScreenState();
}

class _MarketplaceScreenState extends State<MarketplaceScreen> {
  final ScrollController _scrollController = ScrollController();
  final TextEditingController _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = context.read<MarketplaceProvider>();
      _searchController.text = provider.query;
      provider.fetchListings(refresh: true);
      context.read<CatalogProvider>().fetchCatalog();
    });
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 300) {
      context.read<MarketplaceProvider>().fetchListings();
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _showFilterSheet() {
    showModalBottomSheet(context: context, isScrollControlled: true, builder: (context) => const _FilterSheet());
  }

  /// Removes one filter and searches again.
  void _clearOne(MarketplaceProvider p, String which) {
    p.applyFilters(
      category: which == 'category' ? null : p.category,
      brand: which == 'brand' ? null : p.brand,
      condition: which == 'condition' ? null : p.condition,
      minPrice: which == 'price' ? null : p.minPrice,
      maxPrice: which == 'price' ? null : p.maxPrice,
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<MarketplaceProvider>();
    final c = context.colors;
    final canPop = Navigator.of(context).canPop();

    final activeChips = <Widget>[
      if (provider.category?.isNotEmpty ?? false) _activeChip(provider.category!, () => _clearOne(provider, 'category')),
      if (provider.brand?.isNotEmpty ?? false) _activeChip(provider.brand!, () => _clearOne(provider, 'brand')),
      if (provider.condition?.isNotEmpty ?? false) _activeChip(Formatters.condition(provider.condition!), () => _clearOne(provider, 'condition')),
      if (provider.minPrice != null || provider.maxPrice != null)
        _activeChip(
          '${provider.minPrice != null ? Formatters.price(provider.minPrice!) : 'Any'} – ${provider.maxPrice != null ? Formatters.price(provider.maxPrice!) : 'Any'}',
          () => _clearOne(provider, 'price'),
        ),
    ];

    Widget results;
    if (provider.isLoading && provider.listings.isEmpty) {
      results = const ShimmerLoader.grid();
    } else if (provider.errorMessage != null && provider.listings.isEmpty) {
      results = ListView(
        children: [ErrorState(message: provider.errorMessage!, onRetry: () => provider.fetchListings(refresh: true))],
      );
    } else if (provider.listings.isEmpty) {
      results = ListView(
        children: [
          EmptyState(
            icon: Icons.search_off_rounded,
            title: 'No instruments found',
            message: 'Try a different keyword or clear the filters.',
            action: provider.hasActiveFilters || provider.query.isNotEmpty
                ? OutlinedButton(
                    onPressed: () {
                      _searchController.clear();
                      provider.search('');
                      provider.clearFilters();
                    },
                    child: const Text('Clear search'),
                  )
                : null,
          ),
        ],
      );
    } else {
      results = GridView.builder(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.xxl),
        gridDelegate: listingGridDelegate(context),
        itemCount: provider.listings.length + (provider.hasMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == provider.listings.length) {
            return const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5)));
          }
          return ListingCard(listing: provider.listings[index]);
        },
      );
    }

    return Scaffold(
      appBar: AppBar(automaticallyImplyLeading: canPop, title: const Text('Search'), actions: const [NotificationBell(), SizedBox(width: 4)]),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.xs, AppSpacing.page, AppSpacing.sm),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    key: const ValueKey('marketplace-search'),
                    controller: _searchController,
                    textInputAction: TextInputAction.search,
                    decoration: InputDecoration(
                      hintText: 'Search title, brand, model…',
                      prefixIcon: const Icon(Icons.search_rounded),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        borderSide: BorderSide(color: context.scheme.outline),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        borderSide: BorderSide(color: context.scheme.outline),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(AppRadius.full),
                        borderSide: BorderSide(color: context.scheme.primary, width: 2),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      suffixIcon: _searchController.text.isEmpty
                          ? null
                          : IconButton(
                              tooltip: 'Clear',
                              icon: const Icon(Icons.close_rounded),
                              onPressed: () {
                                _searchController.clear();
                                provider.search('');
                                setState(() {});
                              },
                            ),
                    ),
                    onChanged: (_) => setState(() {}),
                    onSubmitted: (text) => provider.search(text),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Badge(
                  isLabelVisible: activeChips.isNotEmpty,
                  label: Text('${activeChips.length}'),
                  backgroundColor: context.scheme.primary,
                  child: IconButton.outlined(
                    tooltip: 'Filters',
                    style: IconButton.styleFrom(
                      minimumSize: const Size(48, 48),
                      side: BorderSide(color: context.scheme.outline),
                    ),
                    icon: const Icon(Icons.tune_rounded),
                    onPressed: _showFilterSheet,
                  ),
                ),
              ],
            ),
          ),
          if (activeChips.isNotEmpty)
            SizedBox(
              height: 44,
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.page, vertical: 4),
                children: [
                  for (final chip in activeChips)
                    Padding(
                      padding: const EdgeInsets.only(right: AppSpacing.sm),
                      child: chip,
                    ),
                  TextButton(
                    onPressed: provider.clearFilters,
                    child: Text('Clear all', style: TextStyle(color: c.danger)),
                  ),
                ],
              ),
            ),
          Expanded(
            child: RefreshIndicator(onRefresh: () => provider.fetchListings(refresh: true), child: results),
          ),
        ],
      ),
    );
  }

  Widget _activeChip(String label, VoidCallback onRemove) =>
      InputChip(label: Text(label), selected: true, showCheckmark: false, onDeleted: onRemove, deleteIcon: const Icon(Icons.close_rounded, size: 16));
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
  final _min = TextEditingController();
  final _max = TextEditingController();
  String? _error;

  @override
  void initState() {
    super.initState();
    final provider = context.read<MarketplaceProvider>();
    _category = provider.category;
    _brand = provider.brand;
    _condition = provider.condition;
    _min.text = provider.minPrice?.toStringAsFixed(0) ?? '';
    _max.text = provider.maxPrice?.toStringAsFixed(0) ?? '';
  }

  @override
  void dispose() {
    _min.dispose();
    _max.dispose();
    super.dispose();
  }

  void _apply() {
    final min = double.tryParse(_min.text.trim());
    final max = double.tryParse(_max.text.trim());
    if (min != null && max != null && max < min) {
      setState(() => _error = 'Max price must be greater than min price.');
      return;
    }
    context.read<MarketplaceProvider>().applyFilters(category: _category, brand: _brand, condition: _condition, minPrice: min, maxPrice: max);
    Navigator.pop(context);
  }

  @override
  Widget build(BuildContext context) {
    final catalog = context.watch<CatalogProvider>();

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpacing.page, 0, AppSpacing.page, AppSpacing.page),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: Text('Filters', style: context.text.titleLarge)),
                  TextButton(
                    onPressed: () => setState(() {
                      _category = null;
                      _brand = null;
                      _condition = null;
                      _min.clear();
                      _max.clear();
                    }),
                    child: const Text('Reset'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              DropdownButtonFormField<String>(
                style: Theme.of(context).textTheme.bodyLarge,
                initialValue: _category,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Category'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All categories')),
                  ...catalog.categories.map((c) => DropdownMenuItem(value: c, child: Text(c))),
                ],
                onChanged: (val) => setState(() => _category = val),
              ),
              const SizedBox(height: AppSpacing.lg),
              DropdownButtonFormField<String>(
                style: Theme.of(context).textTheme.bodyLarge,
                initialValue: _brand,
                isExpanded: true,
                decoration: const InputDecoration(labelText: 'Brand'),
                items: [
                  const DropdownMenuItem(value: null, child: Text('All brands')),
                  ...catalog.brands.map((b) => DropdownMenuItem(value: b, child: Text(b))),
                ],
                onChanged: (val) => setState(() => _brand = val),
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Condition', style: context.text.titleSmall),
              const SizedBox(height: AppSpacing.sm),
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  for (final code in _conditionCodes)
                    ChoiceChip(
                      label: Text(Formatters.condition(code)),
                      selected: _condition == code,
                      onSelected: (on) => setState(() => _condition = on ? code : null),
                    ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              Text('Price (LKR)', style: context.text.titleSmall),
              const SizedBox(height: AppSpacing.sm),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _min,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(hintText: 'Min'),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: AppSpacing.sm),
                    child: Text('–'),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _max,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(hintText: 'Max'),
                    ),
                  ),
                ],
              ),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpacing.sm),
                  child: InlineNotice(message: _error!, tone: NoticeTone.error),
                ),
              const SizedBox(height: AppSpacing.xl),
              FilledButton(onPressed: _apply, child: const Text('Show results')),
            ],
          ),
        ),
      ),
    );
  }
}
