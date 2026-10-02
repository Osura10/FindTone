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
import '../../auth/providers/auth_provider.dart';
import 'package:go_router/go_router.dart';
import '../models/listing_model.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/theme/app_theme.dart';

class ListingDetailsScreen extends StatefulWidget {
  final int id;
  const ListingDetailsScreen({super.key, required this.id});

  @override
  State<ListingDetailsScreen> createState() => _ListingDetailsScreenState();
}

class _ListingDetailsScreenState extends State<ListingDetailsScreen> {
  ListingDetail? _listing;
  bool _isLoading = true;
  String? _error;
  bool _wishlistBusy = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _fetchDetails());
  }

  Future<void> _fetchDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final details = await context.read<MarketplaceProvider>().getListingDetails(widget.id);
      if (mounted) setState(() => _listing = details);
    } catch (e) {
      if (mounted) setState(() => _error = statusOf(e) == 404 ? 'This listing is not available.' : describeError(e));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _toggleWishlist(WishlistProvider wishlist, bool saved) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _wishlistBusy = true);
    final error = saved ? await wishlist.removeFromWishlist(widget.id) : await wishlist.addToWishlist(widget.id);
    if (mounted) setState(() => _wishlistBusy = false);
    messenger.showSnackBar(SnackBar(
      content: Text(error ?? (saved ? 'Removed from wishlist' : 'Added to wishlist – you will be told about price drops')),
    ));
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

  Widget _section(String title, Widget child, {Widget? trailing}) => Padding(
        padding: const EdgeInsets.only(top: AppSpacing.xl),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Row(children: [
            Expanded(child: Text(title, style: context.text.titleMedium)),
            ?trailing,
          ]),
          const SizedBox(height: AppSpacing.md),
          child,
        ]),
      );

  Widget _spec(String label, String value) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: 10),
      decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(fontSize: 11.5, color: c.textMuted)),
        const SizedBox(height: 2),
        Text(value, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
      ]),
    );
  }

  /// Sticky bottom bar: Buy Now for buyers, Edit for the owner, SOLD OUT when sold.
  Widget? _bottomBar(ListingDetail listing, bool isOwner, bool canBuy) {
    final c = context.colors;
    Widget bar(Widget child) => Container(
          decoration: BoxDecoration(
            color: context.scheme.surface,
            border: Border(top: BorderSide(color: c.border)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.md, AppSpacing.page, AppSpacing.md), child: child),
          ),
        );

    if (isOwner) {
      return bar(Row(children: [
        Icon(Icons.info_outline_rounded, color: c.info, size: 20),
        const SizedBox(width: AppSpacing.sm),
        Expanded(child: Text('This is your listing', style: TextStyle(color: c.info, fontWeight: FontWeight.w600))),
        if (listing.status != 'SOLD')
          FilledButton.icon(
            key: const ValueKey('edit-own-listing'),
            icon: const Icon(Icons.edit_outlined, size: 18),
            label: const Text('Edit'),
            onPressed: () async {
              await context.push('/shop/edit/${listing.id}');
              if (mounted) _fetchDetails();
            },
          ),
      ]));
    }
    if (canBuy) {
      return bar(Row(children: [
        Expanded(
          child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Total', style: context.text.bodySmall),
            PriceTag(amount: listing.price, size: 20),
          ]),
        ),
        const SizedBox(width: AppSpacing.md),
        Expanded(
          flex: 2,
          child: SizedBox(
            height: 52,
            child: FilledButton.icon(
              key: const ValueKey('buy-now'),
              icon: const Icon(Icons.shopping_cart_checkout_rounded),
              label: const Text('Buy Now'),
              onPressed: () => context.push('/checkout/${listing.id}'),
            ),
          ),
        ),
      ]));
    }
    if (listing.status == 'SOLD') {
      return bar(SizedBox(
        height: 52,
        child: FilledButton(
          onPressed: null,
          style: FilledButton.styleFrom(disabledBackgroundColor: c.surface2, disabledForegroundColor: c.textMuted),
          child: const Text('SOLD OUT'),
        ),
      ));
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading && _listing == null) {
      return Scaffold(
        appBar: AppBar(),
        body: ListView(padding: const EdgeInsets.all(AppSpacing.page), children: const [
          LoadingShimmer(height: 300, borderRadius: AppRadius.lg),
          SizedBox(height: AppSpacing.lg),
          LoadingShimmer(height: 28, width: 160),
          SizedBox(height: AppSpacing.md),
          LoadingShimmer(height: 22),
          SizedBox(height: AppSpacing.lg),
          LoadingShimmer(height: 120),
        ]),
      );
    }
    if (_listing == null) {
      return Scaffold(
        appBar: AppBar(),
        body: ErrorState(message: _error ?? 'Failed to load listing details.', onRetry: _fetchDetails),
      );
    }

    final listing = _listing!;
    final c = context.colors;
    final wishlistProvider = context.watch<WishlistProvider>();
    final isInWishlist = wishlistProvider.isInWishlist(listing.id);
    final authProvider = context.watch<AuthProvider>();
    final isOwner = authProvider.userId != null && authProvider.userId == listing.sellerId;
    // Wishlist / Buy only for other people's LIVE listings (never own or SOLD).
    final canBuy = !isOwner && listing.status == 'LIVE';
    final sold = listing.status == 'SOLD';

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _fetchDetails,
        child: CustomScrollView(
          slivers: [
            SliverAppBar(
              pinned: true,
              expandedHeight: 320,
              backgroundColor: context.scheme.surface,
              leading: Padding(
                padding: const EdgeInsets.all(6),
                child: IconButton.filledTonal(
                  tooltip: 'Back',
                  style: IconButton.styleFrom(backgroundColor: context.scheme.surface.withValues(alpha: 0.9)),
                  icon: const Icon(Icons.arrow_back_rounded),
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ),
              actions: [
                if (canBuy)
                  Padding(
                    padding: const EdgeInsets.all(6),
                    child: IconButton.filledTonal(
                      key: const ValueKey('wishlist-toggle'),
                      tooltip: isInWishlist ? 'Remove from wishlist' : 'Add to wishlist',
                      style: IconButton.styleFrom(backgroundColor: context.scheme.surface.withValues(alpha: 0.9)),
                      icon: Icon(isInWishlist ? Icons.favorite : Icons.favorite_border, color: isInWishlist ? const Color(0xFFE11D48) : null),
                      onPressed: _wishlistBusy ? null : () => _toggleWishlist(wishlistProvider, isInWishlist),
                    ),
                  ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: _Gallery(images: listing.images, sold: sold, onOpen: (i) => _openGallery(context, i)),
              ),
            ),
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.lg, AppSpacing.page, AppSpacing.xxl),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Price box
                    Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Expanded(
                        child: Text(
                          [listing.category, listing.brand].where((s) => s.isNotEmpty).join(' · ').toUpperCase(),
                          style: TextStyle(fontSize: 11.5, letterSpacing: 0.5, fontWeight: FontWeight.w600, color: c.textMuted),
                        ),
                      ),
                      StatusChip(status: listing.status),
                    ]),
                    const SizedBox(height: AppSpacing.sm),
                    Text(listing.title, style: context.text.headlineSmall?.copyWith(fontSize: 22, height: 1.25)),
                    const SizedBox(height: AppSpacing.sm),
                    Row(children: [
                      PriceTag(amount: listing.price, size: 26, color: c.primaryText),
                      const SizedBox(width: AppSpacing.sm),
                      if (listing.listingType.isNotEmpty) Text(listing.listingType, style: context.text.bodySmall),
                    ]),
                    const SizedBox(height: AppSpacing.md),
                    Wrap(spacing: AppSpacing.sm, runSpacing: AppSpacing.sm, children: [
                      Pill(label: Formatters.condition(listing.condition), color: context.scheme.onSurface, background: c.surface2, icon: Icons.verified_outlined),
                      if (listing.location.isNotEmpty) Pill(label: listing.location, color: context.scheme.onSurface, background: c.surface2, icon: Icons.place_outlined),
                    ]),

                    // Trust score + fair verdict: only for the owner (the API hides them from others).
                    if (isOwner && (listing.priceVerdict != null || listing.trustScore != null))
                      _section(
                        'AI check',
                        AppCard(
                          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                            Wrap(spacing: AppSpacing.sm, runSpacing: AppSpacing.sm, children: [
                              if (listing.trustScore != null) TrustChip(score: listing.trustScore),
                              if (listing.priceVerdict != null) VerdictChip(verdict: listing.priceVerdict),
                            ]),
                            if (listing.priceVerdict != null) ...[
                              const SizedBox(height: AppSpacing.md),
                              Text(
                                listing.fairPriceMin != null
                                    ? 'Fair range ${Formatters.price(listing.fairPriceMin!)} – ${Formatters.price(listing.fairPriceMax ?? 0)}'
                                    : 'No reference price',
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              if ((listing.priceExplanation ?? '').isNotEmpty)
                                Padding(padding: const EdgeInsets.only(top: 6), child: Text(listing.priceExplanation!, style: context.text.bodySmall?.copyWith(height: 1.45))),
                            ],
                            if (listing.trustScore != null && listing.aiReason != null && listing.aiReason!.isNotEmpty) ...[
                              const SizedBox(height: AppSpacing.md),
                              // 70+: just the AI's note; 40-69: live with a low-trust warning; below 40: held for review.
                              InlineNotice(
                                message: listing.trustScore! >= 70
                                    ? listing.aiReason!
                                    : listing.trustScore! >= 40
                                        ? 'Low trust: ${listing.aiReason}'
                                        : listing.aiReason!,
                                tone: listing.trustScore! >= 70
                                    ? NoticeTone.info
                                    : listing.trustScore! >= 40
                                        ? NoticeTone.warning
                                        : NoticeTone.error,
                                icon: Icons.shield_outlined,
                              ),
                            ],
                          ]),
                        ),
                        trailing: Text('Only you can see this', style: context.text.bodySmall),
                      ),

                    _section(
                      'Details',
                      LayoutBuilder(builder: (context, box) {
                        final w = (box.maxWidth - AppSpacing.sm) / 2;
                        final specs = <(String, String)>[
                          ('Condition', Formatters.condition(listing.condition)),
                          ('Brand', listing.brand),
                          if (listing.model.isNotEmpty) ('Model', listing.model),
                          ('Year', listing.year?.toString() ?? 'N/A'),
                          ('Category', listing.category),
                          if (listing.listingType.isNotEmpty) ('Listing type', listing.listingType),
                        ];
                        return Wrap(spacing: AppSpacing.sm, runSpacing: AppSpacing.sm, children: [
                          for (final s in specs) SizedBox(width: w, child: _spec(s.$1, s.$2)),
                        ]);
                      }),
                    ),

                    _section('Description', Text(listing.description, style: context.text.bodyMedium?.copyWith(height: 1.6, color: context.scheme.onSurfaceVariant))),

                    _section(
                      'Seller',
                      AppCard(
                        child: Column(children: [
                          Row(children: [
                            AppAvatar(name: listing.sellerName, size: 48),
                            const SizedBox(width: AppSpacing.md),
                            Expanded(
                              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                                Text(listing.sellerName, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
                                Text(
                                  '${listing.sellerRole == 'shop' ? 'Shop' : 'Private seller'}${listing.sellerMemberSince != null ? ' · member since ${listing.sellerMemberSince!.year}' : ''}',
                                  style: context.text.bodySmall,
                                ),
                              ]),
                            ),
                          ]),
                          if (listing.sellerPhone != null && canBuy) ...[
                            const SizedBox(height: AppSpacing.md),
                            Row(children: [
                              Icon(Icons.phone_outlined, size: 16, color: c.textMuted),
                              const SizedBox(width: 6),
                              Text(listing.sellerPhone!, style: const TextStyle(fontWeight: FontWeight.w600)),
                            ]),
                            const SizedBox(height: AppSpacing.md),
                            Row(children: [
                              Expanded(
                                child: OutlinedButton.icon(
                                  icon: const Icon(Icons.call_outlined, size: 18),
                                  label: const Text('Call'),
                                  onPressed: () => _launchUrl('tel:${listing.sellerPhone}'),
                                ),
                              ),
                              const SizedBox(width: AppSpacing.md),
                              Expanded(
                                child: FilledButton.icon(
                                  icon: const Icon(Icons.chat_outlined, size: 18),
                                  label: const Text('WhatsApp'),
                                  style: FilledButton.styleFrom(backgroundColor: const Color(0xFF1FAE54)),
                                  onPressed: () => _launchUrl('https://wa.me/${listing.sellerPhone!.replaceAll(RegExp(r"[^\d+]"), "")}'),
                                ),
                              ),
                            ]),
                          ],
                        ]),
                      ),
                    ),

                    _section(
                      'Location',
                      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                        Row(children: [
                          Icon(Icons.place_outlined, size: 18, color: c.textMuted),
                          const SizedBox(width: 4),
                          Expanded(child: Text(listing.location)),
                        ]),
                        if (listing.latitude != null && listing.longitude != null) ...[
                          const SizedBox(height: AppSpacing.md),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(AppRadius.lg),
                            child: SizedBox(
                              height: 200,
                              child: FlutterMap(
                                options: MapOptions(initialCenter: LatLng(listing.latitude!, listing.longitude!), initialZoom: 13.0),
                                children: [
                                  TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.example.app'),
                                  MarkerLayer(markers: [
                                    Marker(
                                      point: LatLng(listing.latitude!, listing.longitude!),
                                      width: 40,
                                      height: 40,
                                      child: Icon(Icons.location_pin, color: context.scheme.primary, size: 40),
                                    ),
                                  ]),
                                  RichAttributionWidget(attributions: [TextSourceAttribution('© OpenStreetMap contributors')]),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ]),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: _bottomBar(listing, isOwner, canBuy),
    );
  }
}

/// Swipeable photo carousel with page dots and a "1 / 3" counter; tap opens full screen.
class _Gallery extends StatefulWidget {
  final List<ListingImage> images;
  final bool sold;
  final ValueChanged<int> onOpen;
  const _Gallery({required this.images, required this.sold, required this.onOpen});

  @override
  State<_Gallery> createState() => _GalleryState();
}

class _GalleryState extends State<_Gallery> {
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final images = widget.images;
    if (images.isEmpty) return const AppNetworkImage(imageUrl: null);
    return Stack(fit: StackFit.expand, children: [
      CarouselSlider(
        options: CarouselOptions(
          height: double.infinity,
          viewportFraction: 1.0,
          enableInfiniteScroll: false,
          onPageChanged: (i, _) => setState(() => _page = i),
        ),
        items: [
          for (var i = 0; i < images.length; i++)
            Semantics(
              button: true,
              label: 'Photo ${i + 1} of ${images.length}, open full screen',
              child: GestureDetector(onTap: () => widget.onOpen(i), child: AppNetworkImage(imageUrl: images[i].url)),
            ),
        ],
      ),
      if (widget.sold)
        Positioned(
          top: 26,
          right: -46,
          child: Transform.rotate(
            angle: 0.785,
            child: Container(
              width: 190,
              padding: const EdgeInsets.symmetric(vertical: 6),
              color: context.colors.danger,
              alignment: Alignment.center,
              child: const Text('SOLD OUT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, letterSpacing: 1.2)),
            ),
          ),
        ),
      if (images.length > 1) ...[
        Positioned(
          right: 12,
          bottom: 12,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.55), borderRadius: BorderRadius.circular(AppRadius.full)),
            child: Text('${_page + 1} / ${images.length}', style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 14,
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < images.length; i++)
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _page ? 18 : 7,
                height: 7,
                decoration: BoxDecoration(color: Colors.white.withValues(alpha: i == _page ? 1 : 0.6), borderRadius: BorderRadius.circular(4)),
              ),
          ]),
        ),
      ],
    ]);
  }
}
