import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:carousel_slider/carousel_slider.dart';
import 'package:photo_view/photo_view.dart';
import 'package:photo_view/photo_view_gallery.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import '../providers/marketplace_provider.dart';
import '../../wishlist/providers/wishlist_provider.dart';
import '../models/listing_model.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/utils/formatters.dart';

class ListingDetailsScreen extends StatefulWidget {
  final int id;
  const ListingDetailsScreen({super.key, required this.id});

  @override
  State<ListingDetailsScreen> createState() => _ListingDetailsScreenState();
}

class _ListingDetailsScreenState extends State<ListingDetailsScreen> {
  ListingDetail? _listing;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchDetails();
  }

  Future<void> _fetchDetails() async {
    final provider = context.read<MarketplaceProvider>();
    final details = await provider.getListingDetails(widget.id);
    if (mounted) {
      setState(() {
        _listing = details;
        _isLoading = false;
      });
    }
  }

  void _openGallery(BuildContext context, int initialIndex) {
    if (_listing == null || _listing!.images.isEmpty) return;
    
    Navigator.of(context).push(MaterialPageRoute(
      builder: (context) => Scaffold(
        backgroundColor: Colors.black,
        appBar: AppBar(backgroundColor: Colors.black),
        body: PhotoViewGallery.builder(
          itemCount: _listing!.images.length,
          builder: (context, index) {
            return PhotoViewGalleryPageOptions.customChild(
              child: AppNetworkImage(
                imageUrl: _listing!.images[index].url,
                fit: BoxFit.contain,
              ),
              initialScale: PhotoViewComputedScale.contained,
              minScale: PhotoViewComputedScale.contained,
              maxScale: PhotoViewComputedScale.covered * 2,
            );
          },
          pageController: PageController(initialPage: initialIndex),
          scrollPhysics: const BouncingScrollPhysics(),
        ),
      ),
    ));
  }

  Future<void> _launchUrl(String urlString) async {
    final uri = Uri.parse(urlString);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    } else {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not launch action.')));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_listing == null) {
      return Scaffold(
        appBar: AppBar(),
        body: ErrorView(message: 'Failed to load listing details.', onRetry: () {}),
      );
    }

    final listing = _listing!;
    final wishlistProvider = context.watch<WishlistProvider>();
    final isInWishlist = wishlistProvider.isInWishlist(listing.id);
    // Assuming authProvider can check if my listing. Here we skip or assume from sellerId (but we need my userId).
    // Let's just check if phone matches or rely on a "isMyListing" flag if we add it, but backend doesn't send it. We'll ignore `isMyListing` check for now or assume they can't buy their own item on checkout.

    return Scaffold(
      appBar: AppBar(
        title: Text(listing.title),
        actions: [
          if (listing.status == 'LIVE')
            IconButton(
              icon: Icon(isInWishlist ? Icons.favorite : Icons.favorite_border, color: isInWishlist ? Colors.red : null),
              onPressed: () {
                if (isInWishlist) {
                  wishlistProvider.removeFromWishlist(listing.id);
                } else {
                  wishlistProvider.addToWishlist(listing.id);
                }
              },
            ),
        ],
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (listing.images.isNotEmpty)
              CarouselSlider(
                options: CarouselOptions(
                  height: 300,
                  viewportFraction: 1.0,
                  enableInfiniteScroll: false,
                ),
                items: listing.images.asMap().entries.map((entry) {
                  return GestureDetector(
                    onTap: () => _openGallery(context, entry.key),
                    child: AppNetworkImage(
                      imageUrl: entry.value.url,
                    ),
                  );
                }).toList(),
              ),
            
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      PriceText(amount: listing.price, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.deepPurpleAccent)),
                      StatusBadge(status: listing.status),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(listing.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  
                  // Metadata
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      Chip(label: Text(listing.category)),
                      Chip(label: Text(listing.brand)),
                      if (listing.year != null) Chip(label: Text(listing.year.toString())),
                      Chip(label: Text(Formatters.condition(listing.condition))),
                    ],
                  ),
                  const SizedBox(height: 24),
                  
                  const Text('Description', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(listing.description),
                  const SizedBox(height: 24),

                  if (listing.fairPrice != null) ...[
                    AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.analytics, color: Colors.blue),
                              const SizedBox(width: 8),
                              const Text('AI Fair Price Evaluation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Formatters.getVerdictColor(listing.priceVerdict),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  Formatters.getVerdictText(listing.priceVerdict),
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                                ),
                              ),
                              Text('${Formatters.price(listing.fairPriceMin ?? 0)} - ${Formatters.price(listing.fairPriceMax ?? 0)}'),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Text(listing.priceExplanation ?? ''),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  if (listing.trustScore != null) ...[
                    AppCard(
                      child: Row(
                        children: [
                          Icon(Icons.verified_user, color: Formatters.getTrustColor(listing.trustScore!)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Trust ${listing.trustScore}', style: TextStyle(fontWeight: FontWeight.bold, color: Formatters.getTrustColor(listing.trustScore!))),
                                const Text('Verified by Agent 02', style: TextStyle(fontSize: 12, color: Colors.grey)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  const Text('Location', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(listing.location),
                  if (listing.latitude != null && listing.longitude != null) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      height: 200,
                      child: FlutterMap(
                        options: MapOptions(
                          initialCenter: LatLng(listing.latitude!, listing.longitude!),
                          initialZoom: 13.0,
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'com.example.app',
                          ),
                          MarkerLayer(
                            markers: [
                              Marker(
                                point: LatLng(listing.latitude!, listing.longitude!),
                                width: 40,
                                height: 40,
                                child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
                              ),
                            ],
                          ),
                          RichAttributionWidget(
                            attributions: [
                              TextSourceAttribution('© OpenStreetMap contributors'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                  const SizedBox(height: 24),

                  const Text('Seller', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  AppCard(
                    child: Column(
                      children: [
                        Row(
                          children: [
                            CircleAvatar(child: Text(listing.sellerName.substring(0, 1).toUpperCase())),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(listing.sellerName, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  Text(listing.sellerRole),
                                ],
                              ),
                            ),
                          ],
                        ),
                        if (listing.sellerPhone != null && listing.status == 'LIVE') ...[
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                child: ElevatedButton.icon(
                                  icon: const Icon(Icons.call),
                                  label: const Text('Call'),
                                  onPressed: () => _launchUrl('tel:${listing.sellerPhone}'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton.icon(
                                  icon: const Icon(Icons.message),
                                  label: const Text('WhatsApp'),
                                  onPressed: () => _launchUrl('https://wa.me/${listing.sellerPhone!.replaceAll(RegExp(r"[^\d+]"), "")}'),
                                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 100),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: listing.status == 'LIVE'
          ? Container(
              padding: const EdgeInsets.all(16),
              color: Theme.of(context).scaffoldBackgroundColor,
              child: ElevatedButton(
                onPressed: () {
                  // Buy now logic
                },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 50),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: const Text('Buy Now', style: TextStyle(fontSize: 18)),
              ),
            )
          : null,
    );
  }
}
