import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../marketplace/models/listing_model.dart';
import '../providers/shop_provider.dart';

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
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    final messenger = ScaffoldMessenger.of(context);
    try {
      await context.read<ShopProvider>().deleteListing(listing.id);
      messenger.showSnackBar(const SnackBar(content: Text('Listing deleted')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(e)), backgroundColor: Colors.red));
    }
  }

  Widget _trustLine(ListingSummary l) {
    final score = l.trustScore;
    if (score == null) return const Text('Trust: not checked yet', style: TextStyle(fontSize: 12, color: Colors.grey));
    final color = Formatters.getTrustColor(score);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(children: [
          Icon(Icons.shield, size: 16, color: color),
          const SizedBox(width: 4),
          Text('Trust $score/100', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color)),
        ]),
        if (score >= 40 && score < 70)
          const Padding(
            padding: EdgeInsets.only(top: 2),
            child: Text('Live with a low-trust warning', style: TextStyle(fontSize: 12, color: Colors.amber)),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<ShopProvider>();

    Widget body;
    if (provider.isLoadingListings && provider.myListings.isEmpty) {
      body = const Center(child: CircularProgressIndicator());
    } else if (provider.listingsError != null && provider.myListings.isEmpty) {
      body = ErrorView(message: provider.listingsError!, onRetry: provider.fetchMyListings);
    } else if (provider.myListings.isEmpty) {
      body = ListView(children: [
        const SizedBox(height: 120),
        const EmptyState(message: "You haven't posted any instruments yet."),
        const SizedBox(height: 16),
        Center(
          child: ElevatedButton.icon(onPressed: () => _openEditor('/shop/create'), icon: const Icon(Icons.add), label: const Text('Create your first post')),
        ),
      ]);
    } else {
      body = ListView.separated(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: provider.myListings.length,
        separatorBuilder: (_, _) => const SizedBox(height: 16),
        itemBuilder: (context, index) {
          final listing = provider.myListings[index];
          final sold = listing.status == 'SOLD';
          return AppCard(
            key: ValueKey('my-listing-${listing.id}'),
            padding: EdgeInsets.zero,
            child: InkWell(
              onTap: () => context.push('/listing/${listing.id}'),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Stack(children: [
                    ClipRRect(
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                      child: AppNetworkImage(imageUrl: listing.firstImageUrl, height: 150, isThumbnail: true),
                    ),
                    Positioned(top: 8, right: 8, child: StatusBadge(status: listing.status == 'FLAGGED' ? 'UNDER REVIEW' : listing.status)),
                    if (listing.priceVerdict != null)
                      Positioned(
                        bottom: 8,
                        left: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(color: Formatters.getVerdictColor(listing.priceVerdict), borderRadius: BorderRadius.circular(4)),
                          child: Text(Formatters.getVerdictText(listing.priceVerdict), style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ),
                  ]),
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(listing.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              const SizedBox(height: 4),
                              PriceText(amount: listing.price),
                              if (listing.fairPriceMin != null && listing.fairPriceMax != null)
                                Text('Fair: ${Formatters.price(listing.fairPriceMin!)} – ${Formatters.price(listing.fairPriceMax!)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                              const SizedBox(height: 6),
                              _trustLine(listing),
                            ],
                          ),
                        ),
                        if (sold)
                          const Padding(padding: EdgeInsets.only(top: 8), child: Text('Sold – cannot edit', style: TextStyle(color: Colors.grey, fontSize: 12)))
                        else ...[
                          IconButton(
                            key: ValueKey('edit-${listing.id}'),
                            tooltip: 'Edit',
                            icon: const Icon(Icons.edit_note, color: Colors.blue),
                            onPressed: () => _openEditor('/shop/edit/${listing.id}'),
                          ),
                          IconButton(tooltip: 'Change price', icon: const Icon(Icons.attach_money, color: Colors.blue), onPressed: () => _showEditPriceSheet(listing)),
                          IconButton(tooltip: 'Delete', icon: const Icon(Icons.delete, color: Colors.red), onPressed: () => _confirmDelete(listing)),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('My Listings')),
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
