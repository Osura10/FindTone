import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wishlist/providers/wishlist_provider.dart';
import '../models/listing_model.dart';

/// Marketplace card: photo, condition, SOLD ribbon, wishlist heart, price, title, location.
/// No trust score / verdict here – those are only for the owner and admins.
class ListingCard extends StatelessWidget {
  final ListingSummary listing;
  const ListingCard({super.key, required this.listing});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final sold = listing.status == 'SOLD';
    final myId = context.select<AuthProvider, int?>((a) => a.userId);
    final isOwn = myId != null && myId == listing.sellerId;

    return Semantics(
      button: true,
      label: '${listing.title}, ${Formatters.price(listing.price)}${sold ? ', sold' : ''}',
      child: InkWell(
        key: ValueKey('listing-card-${listing.id}'),
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: () => context.push('/listing/${listing.id}'),
        child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.lg),
              child: Stack(fit: StackFit.expand, children: [
                ColorFiltered(
                  colorFilter: sold
                      ? const ColorFilter.matrix([0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0.33, 0.33, 0.33, 0, 0, 0, 0, 0, 0.75, 0])
                      : const ColorFilter.mode(Colors.transparent, BlendMode.dst),
                  child: AppNetworkImage(imageUrl: listing.firstImageUrl, isThumbnail: true),
                ),
                Positioned(
                  left: 8,
                  top: 8,
                  child: _MediaPill(text: isOwn ? 'Your listing' : Formatters.condition(listing.condition), highlight: isOwn),
                ),
                if (!sold && !isOwn && listing.status == 'LIVE') Positioned(right: 6, top: 6, child: _WishlistHeart(listingId: listing.id)),
                if (sold) const _SoldRibbon(),
              ]),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            [listing.category, listing.brand].where((s) => s.isNotEmpty).join(' · ').toUpperCase(),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 10.5, letterSpacing: 0.4, color: c.textMuted, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 2),
          Text(listing.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14, height: 1.25)),
          const SizedBox(height: 4),
          PriceTag(amount: listing.price, size: 17),
          if (listing.location.isNotEmpty)
            Row(children: [
              Icon(Icons.place_outlined, size: 13, color: c.textMuted),
              const SizedBox(width: 2),
              Expanded(child: Text(listing.location, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, color: c.textMuted))),
            ]),
        ]),
      ),
    );
  }
}

class _MediaPill extends StatelessWidget {
  final String text;
  final bool highlight;
  const _MediaPill({required this.text, this.highlight = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: highlight ? context.scheme.primary : Colors.black.withValues(alpha: 0.55),
        borderRadius: BorderRadius.circular(AppRadius.full),
      ),
      child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}

class _SoldRibbon extends StatelessWidget {
  const _SoldRibbon();

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 14,
      right: -34,
      child: Transform.rotate(
        angle: 0.785,
        child: Container(
          width: 130,
          padding: const EdgeInsets.symmetric(vertical: 4),
          color: context.colors.danger,
          alignment: Alignment.center,
          child: const Text('SOLD OUT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 10.5, letterSpacing: 1)),
        ),
      ),
    );
  }
}

/// Heart button on a card: adds / removes the listing from the wishlist.
class _WishlistHeart extends StatefulWidget {
  final int listingId;
  const _WishlistHeart({required this.listingId});

  @override
  State<_WishlistHeart> createState() => _WishlistHeartState();
}

class _WishlistHeartState extends State<_WishlistHeart> {
  bool _busy = false;

  Future<void> _toggle(WishlistProvider wishlist, bool saved) async {
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    final error = saved ? await wishlist.removeFromWishlist(widget.listingId) : await wishlist.addToWishlist(widget.listingId);
    if (mounted) setState(() => _busy = false);
    messenger.showSnackBar(SnackBar(content: Text(error ?? (saved ? 'Removed from wishlist' : 'Added to wishlist – you will be told about price drops'))));
  }

  @override
  Widget build(BuildContext context) {
    final wishlist = context.watch<WishlistProvider>();
    final saved = wishlist.isInWishlist(widget.listingId);
    return Material(
      color: Colors.white.withValues(alpha: 0.92),
      shape: const CircleBorder(),
      child: IconButton(
        visualDensity: VisualDensity.compact,
        iconSize: 19,
        tooltip: saved ? 'Remove from wishlist' : 'Add to wishlist',
        onPressed: _busy ? null : () => _toggle(wishlist, saved),
        icon: Icon(saved ? Icons.favorite : Icons.favorite_border, color: saved ? const Color(0xFFE11D48) : const Color(0xFF16141F)),
      ),
    );
  }
}
