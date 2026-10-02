import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../marketplace/models/listing_model.dart';
import '../providers/shop_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../notifications/widgets/notification_bell.dart';

/// The user's own listings (buyers and shops can both sell). Only here – and on the owner's
/// details page – are the trust score and fair-price verdict shown.
class MyListingsScreen extends StatefulWidget {
  const MyListingsScreen({super.key});

  @override
  State<MyListingsScreen> createState() => _MyListingsScreenState();
}

class _MyListingsScreenState extends State<MyListingsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<ShopProvider>().fetchMyListings();
    });
  }

  Future<void> _openEditor(String path) async {
    final provider = context.read<ShopProvider>();
    await context.push(path);
    // Always refresh after create/edit so the new AI result is shown.
    if (mounted) provider.fetchMyListings();
  }

  void _showEditPriceSheet(ListingSummary listing) {
    final controller = TextEditingController(text: listing.price.toStringAsFixed(0));
    String? error;
    bool saving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheet) => Padding(
          padding: EdgeInsets.only(bottom: MediaQuery.of(sheetContext).viewInsets.bottom, left: 16, right: 16, top: 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Change price', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(
                controller: controller,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(labelText: 'Price (LKR)', prefixText: 'LKR ', errorText: error),
              ),
              const SizedBox(height: 8),
              if (saving) const Text('Saving and re-checking the price with AI…', textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: saving
                    ? null
                    : () async {
                        final newPrice = double.tryParse(controller.text.trim());
                        if (newPrice == null || newPrice <= 0) {
                          setSheet(() => error = 'Price must be greater than 0');
                          return;
                        }
                        setSheet(() {
                          saving = true;
                          error = null;
                        });
                        final navigator = Navigator.of(sheetContext);
                        final messenger = ScaffoldMessenger.of(context);
                        try {
                          final updated = await context.read<ShopProvider>().updatePrice(listing.id, newPrice);
                          navigator.pop();
                          messenger.showSnackBar(SnackBar(
                            content: Text('Price updated to ${Formatters.price(updated.price)}. Status: ${updated.status}'
                                '${updated.priceVerdict != null ? ' · ${Formatters.getVerdictText(updated.priceVerdict)}' : ''}'),
                          ));
                        } catch (e) {
                          setSheet(() {
                            saving = false;
                            error = describeError(e);
                          });
                        }
                      },
                child: saving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save price'),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    ).whenComplete(controller.dispose);
  }

  Future<void> _confirmDelete(ListingSummary listing) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete listing?'),
        content: Text('"${listing.title}" will be removed. This cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text('Delete', style: TextStyle(color: Theme.of(ctx).colorScheme.error))),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<ShopProvider>().deleteListing(listing.id);
      messenger.showSnackBar(const SnackBar(content: Text('Listing deleted')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ShopProvider>();
    final c = context.colors;
    final canPop = Navigator.of(context).canPop();

    Widget body;
    if (provider.isLoadingListings && provider.myListings.isEmpty) {
      body = const ShimmerLoader.list(count: 4, rowHeight: 150);
    } else if (provider.listingsError != null && provider.myListings.isEmpty) {
      body = ListView(children: [ErrorState(message: provider.listingsError!, onRetry: provider.fetchMyListings)]);
    } else if (provider.myListings.isEmpty) {
      body = ListView(children: [
        const SizedBox(height: 60),
        EmptyState(
          icon: Icons.inventory_2_outlined,
          title: "You haven't posted any instruments yet",
          message: 'Post your first instrument – our AI checks it and it goes live in seconds.',
          action: FilledButton.icon(onPressed: () => _openEditor('/shop/create'), icon: const Icon(Icons.add), label: const Text('Create your first post')),
        ),
      ]);
    } else {
      body = ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, 96),
        itemCount: provider.myListings.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
        itemBuilder: (context, index) {
          final listing = provider.myListings[index];
          final sold = listing.status == 'SOLD';
          return AppCard(
            key: ValueKey('my-listing-${listing.id}'),
            padding: EdgeInsets.zero,
            onTap: () => context.push('/listing/${listing.id}'),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.md),
              child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.md),
                    child: AppNetworkImage(imageUrl: listing.firstImageUrl, width: 92, height: 76, isThumbnail: true),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text(listing.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                      const SizedBox(height: 4),
                      PriceTag(amount: listing.price, size: 16),
                      if (listing.fairPriceMin != null && listing.fairPriceMax != null)
                        Text('Fair: ${Formatters.price(listing.fairPriceMin!)} – ${Formatters.price(listing.fairPriceMax!)}', style: context.text.bodySmall),
                    ]),
                  ),
                ]),
                const SizedBox(height: AppSpacing.md),
                Wrap(spacing: 6, runSpacing: 6, children: [
                  StatusChip(status: listing.status),
                  TrustChip(score: listing.trustScore),
                  if (listing.priceVerdict != null) VerdictChip(verdict: listing.priceVerdict),
                ]),
                if (listing.trustScore != null && listing.trustScore! >= 40 && listing.trustScore! < 70)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Row(children: [
                      Icon(Icons.warning_amber_rounded, size: 14, color: c.warning),
                      const SizedBox(width: 4),
                      Text('Live with a low-trust warning', style: TextStyle(fontSize: 12, color: c.warning)),
                    ]),
                  ),
                const SizedBox(height: AppSpacing.sm),
                const Divider(),
                if (sold)
                  Padding(padding: const EdgeInsets.only(top: AppSpacing.sm), child: Text('Sold – cannot be edited', style: context.text.bodySmall))
                else
                  Row(children: [
                    TextButton.icon(
                      key: ValueKey('edit-${listing.id}'),
                      icon: const Icon(Icons.edit_outlined, size: 18),
                      label: const Text('Edit'),
                      onPressed: () => _openEditor('/shop/edit/${listing.id}'),
                    ),
                    TextButton.icon(
                      icon: const Icon(Icons.sell_outlined, size: 18),
                      label: const Text('Price'),
                      onPressed: () => _showEditPriceSheet(listing),
                    ),
                    const Spacer(),
                    IconButton(
                      tooltip: 'Delete',
                      icon: Icon(Icons.delete_outline_rounded, color: c.danger),
                      onPressed: () => _confirmDelete(listing),
                    ),
                  ]),
              ]),
            ),
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: canPop,
        title: const Text('My Listings'),
        actions: const [NotificationBell(), SizedBox(width: 4)],
      ),
      body: RefreshIndicator(onRefresh: provider.fetchMyListings, child: body),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'create-post',
        onPressed: () => _openEditor('/shop/create'),
        icon: const Icon(Icons.add),
        label: const Text('Create Post'),
      ),
    );
  }
}
