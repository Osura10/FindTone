import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/shop_provider.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/utils/formatters.dart';
import 'create_post_screen.dart';

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
      context.read<ShopProvider>().fetchMyListings();
    });
  }

  void _showEditPriceSheet(BuildContext context, int id, double currentPrice) {
    final TextEditingController priceController = TextEditingController(text: currentPrice.toStringAsFixed(0));
    bool isSaving = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setState) {
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
                  const Text('Edit Price', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  TextField(
                    controller: priceController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    decoration: const InputDecoration(
                      labelText: 'Price (LKR)',
                      prefixText: 'LKR ',
                    ),
                  ),
                  const SizedBox(height: 32),
                  ElevatedButton(
                    onPressed: isSaving ? null : () async {
                      final newPrice = double.tryParse(priceController.text);
                      if (newPrice != null && newPrice > 0) {
                        setState(() => isSaving = true);
                        final navigator = Navigator.of(context);
                        final messenger = ScaffoldMessenger.of(context);
                        final success = await context.read<ShopProvider>().updatePrice(id, newPrice);
                        if (mounted) {
                          navigator.pop();
                          messenger.showSnackBar(
                            SnackBar(content: Text(success ? 'Price updated successfully' : 'Failed to update price')),
                          );
                        }
                      }
                    },
                    child: isSaving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save'),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _confirmDelete(BuildContext context, int id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Listing'),
        content: const Text('Are you sure you want to delete this listing?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);
              await context.read<ShopProvider>().deleteListing(id);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Listings'),
      ),
      body: Consumer<ShopProvider>(
        builder: (context, provider, child) {
          if (provider.isLoadingListings) {
            return const Center(child: CircularProgressIndicator());
          }
          if (provider.myListings.isEmpty) {
            return const EmptyState(message: 'You have no listings.');
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: provider.myListings.length,
            separatorBuilder: (context, index) => const SizedBox(height: 16),
            itemBuilder: (context, index) {
              final listing = provider.myListings[index];
              return AppCard(
                padding: EdgeInsets.zero,
                child: Column(
                  children: [
                    Stack(
                      children: [
                        ClipRRect(
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                          child: AppNetworkImage(
                            imageUrl: listing.firstImageUrl,
                            height: 150,
                            isThumbnail: true,
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: StatusBadge(status: listing.status == 'FLAGGED' ? 'UNDER REVIEW' : listing.status),
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
                      ],
                    ),
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(listing.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 4),
                                PriceText(amount: listing.price),
                                if (listing.trustScore != null) ...[
                                  const SizedBox(height: 8),
                                  Row(
                                    children: [
                                      Icon(Icons.shield, size: 16, color: listing.trustScore! >= 70 ? Colors.green : (listing.trustScore! >= 40 ? Colors.amber : Colors.red)),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Trust Score: ${listing.trustScore}',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: listing.trustScore! >= 70 ? Colors.green : (listing.trustScore! >= 40 ? Colors.amber : Colors.red),
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (listing.trustScore! < 70 && listing.aiReason != null && listing.aiReason!.isNotEmpty)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4),
                                      child: Text(
                                        listing.trustScore! >= 40 ? 'Low trust: ${listing.aiReason}' : listing.aiReason!,
                                        style: TextStyle(fontSize: 12, color: listing.trustScore! >= 40 ? Colors.amber[800] : Colors.red[800], fontStyle: FontStyle.italic),
                                      ),
                                    ),
                                ],
                              ],
                            ),
                          ),
                          if (listing.status != 'SOLD') ...[
                            IconButton(
                              icon: const Icon(Icons.edit_note, color: Colors.blue),
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => CreatePostScreen(listingId: listing.id),
                                  ),
                                );
                              },
                            ),
                            if (listing.status == 'LIVE')
                              IconButton(
                                icon: const Icon(Icons.attach_money, color: Colors.blue),
                                onPressed: () => _showEditPriceSheet(context, listing.id, listing.price),
                              ),
                            IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () => _confirmDelete(context, listing.id),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const CreatePostScreen()));
        },
        child: const Icon(Icons.add),
      ),
    );
  }
}
