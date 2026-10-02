import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../models/order_model.dart';

/// One order. [seller] = My Sales (buyer contact + address to ship to);
/// otherwise My Orders (delivery status + address).
class OrderTile extends StatelessWidget {
  final OrderModel order;
  final bool seller;
  const OrderTile({super.key, required this.order, required this.seller});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final paid = order.status == 'PAID';
    final card = order.paymentMethod == 'CARD';

    final (statusLabel, fg, bg) = seller
        ? (paid ? 'Payment received' : 'COD requested', paid ? c.success : c.warning, paid ? c.successSoft : c.warningSoft)
        : (paid ? 'Paid' : 'Cash on delivery', paid ? c.success : c.info, paid ? c.successSoft : c.infoSoft);

    return AppCard(
      padding: EdgeInsets.zero,
      onTap: () => context.push('/listing/${order.listingId}'),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Header: date + order number + status
        Container(
          color: c.surface2,
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg, vertical: 10),
          child: Row(children: [
            Expanded(
              child: Text(
                '${DateFormat.yMMMd().format(order.createdAt)} · #${order.id.toString().padLeft(6, '0')}',
                style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            Pill(label: statusLabel, color: fg, background: bg, dot: true),
          ]),
        ),
        Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.md),
              child: AppNetworkImage(imageUrl: order.listingImage, width: 72, height: 72, isThumbnail: true),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(order.listingTitle, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                const SizedBox(height: 4),
                PriceTag(amount: order.amount, size: 17, color: seller ? c.success : null),
                const SizedBox(height: 4),
                Row(children: [
                  Icon(card ? Icons.credit_card_rounded : Icons.payments_outlined, size: 14, color: c.textMuted),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      card ? 'Card${order.cardLast4 != null ? ' •••• ${order.cardLast4}' : ''}' : 'Cash on delivery',
                      style: context.text.bodySmall,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ]),
                if (!seller)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Row(children: [
                      Icon(Icons.local_shipping_outlined, size: 14, color: c.textMuted),
                      const SizedBox(width: 4),
                      Text(paid ? 'Preparing for delivery' : 'Pending COD confirmation', style: context.text.bodySmall),
                    ]),
                  ),
              ]),
            ),
          ]),
        ),
        // Delivery address (seller: ship to buyer, with a call button)
        Container(
          margin: const EdgeInsets.fromLTRB(AppSpacing.lg, 0, AppSpacing.lg, AppSpacing.lg),
          padding: const EdgeInsets.all(AppSpacing.md),
          decoration: BoxDecoration(color: c.surface2, borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(seller ? 'SHIP TO BUYER' : 'DELIVERY ADDRESS', style: TextStyle(fontSize: 10.5, letterSpacing: 0.6, fontWeight: FontWeight.w700, color: c.textMuted)),
                const SizedBox(height: 4),
                Text(order.fullName, style: const TextStyle(fontWeight: FontWeight.w600)),
                Text('${order.addressLine}, ${order.city}${order.postalCode != null && order.postalCode!.isNotEmpty ? ' ${order.postalCode}' : ''}', style: context.text.bodySmall),
                Text(order.phone, style: context.text.bodySmall),
                if (seller && (order.notes ?? '').isNotEmpty)
                  Padding(padding: const EdgeInsets.only(top: 4), child: Text('“${order.notes}”', style: context.text.bodySmall?.copyWith(fontStyle: FontStyle.italic))),
              ]),
            ),
            if (seller)
              IconButton.filledTonal(
                tooltip: 'Call buyer',
                icon: const Icon(Icons.call_outlined, size: 18),
                onPressed: () => launchUrl(Uri.parse('tel:${order.phone}')),
              ),
          ]),
        ),
      ]),
    );
  }
}
