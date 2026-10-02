import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

import '../theme/app_theme.dart';
import '../utils/formatters.dart';

/// Surface with the standard border + radius.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;

  const AppCard({super.key, required this.child, this.padding = const EdgeInsets.all(AppSpacing.lg), this.onTap, this.color});

  @override
  Widget build(BuildContext context) {
    final content = Padding(padding: padding, child: child);
    return Card(
      color: color,
      child: onTap == null ? content : InkWell(onTap: onTap, child: content),
    );
  }
}

/// Small rounded pill with a colour tone.
class Pill extends StatelessWidget {
  final String label;
  final Color color;
  final Color background;
  final IconData? icon;
  final bool dot;

  const Pill({super.key, required this.label, required this.color, required this.background, this.icon, this.dot = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: background, borderRadius: BorderRadius.circular(AppRadius.full)),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (dot) ...[Container(width: 6, height: 6, decoration: BoxDecoration(color: color, shape: BoxShape.circle)), const SizedBox(width: 6)],
        if (icon != null) ...[Icon(icon, size: 13, color: color), const SizedBox(width: 4)],
        Flexible(child: Text(label, overflow: TextOverflow.ellipsis, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700))),
      ]),
    );
  }
}

/// Listing status: LIVE / PENDING / FLAGGED (under review) / REJECTED / SOLD.
class StatusChip extends StatelessWidget {
  final String status;
  const StatusChip({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (label, fg, bg) = switch (status.toUpperCase()) {
      'LIVE' => ('Live', c.success, c.successSoft),
      'PENDING' => ('Pending check', c.warning, c.warningSoft),
      'FLAGGED' || 'UNDER REVIEW' => ('Under review', c.warning, c.warningSoft),
      'REJECTED' => ('Rejected', c.danger, c.dangerSoft),
      'SOLD' => ('Sold', c.textMuted, c.surface2),
      _ => (status, c.primaryText, c.primarySoft),
    };
    return Pill(label: label, color: fg, background: bg, dot: true);
  }
}

/// Old name kept so existing screens keep working.
class StatusBadge extends StatusChip {
  const StatusBadge({super.key, required super.status});
}

/// Fair-price verdict (owner / admin only).
class VerdictChip extends StatelessWidget {
  final String? verdict;
  const VerdictChip({super.key, required this.verdict});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (fg, bg) = switch (verdict) {
      'GREAT_DEAL' || 'FAIR' => (c.success, c.successSoft),
      'SLIGHTLY_HIGH' => (c.warning, c.warningSoft),
      'SUSPICIOUSLY_LOW' || 'OVERPRICED' => (c.danger, c.dangerSoft),
      _ => (c.textMuted, c.surface2),
    };
    return Pill(label: Formatters.getVerdictText(verdict), color: fg, background: bg, icon: Icons.sell_outlined);
  }
}

/// Trust score: green 70+, amber 40-69 (live with a warning), red below 40.
class TrustChip extends StatelessWidget {
  final int? score;
  const TrustChip({super.key, required this.score});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final s = score;
    if (s == null) return Pill(label: 'Not checked', color: c.textMuted, background: c.surface2, icon: Icons.shield_outlined);
    final (fg, bg) = s >= 70 ? (c.success, c.successSoft) : s >= 40 ? (c.warning, c.warningSoft) : (c.danger, c.dangerSoft);
    return Pill(label: 'Trust $s/100${s >= 40 && s < 70 ? ' · warning' : ''}', color: fg, background: bg, icon: Icons.shield_outlined);
  }
}

/// "LKR 45,000" with a smaller, muted currency.
class PriceTag extends StatelessWidget {
  final double amount;
  final double size;
  final Color? color;

  const PriceTag({super.key, required this.amount, this.size = 18, this.color});

  @override
  Widget build(BuildContext context) {
    final number = Formatters.price(amount).replaceFirst('LKR ', '');
    final main = color ?? context.scheme.onSurface;
    return Text.rich(
      TextSpan(children: [
        TextSpan(text: 'LKR ', style: TextStyle(fontSize: size * 0.62, fontWeight: FontWeight.w600, color: context.colors.textMuted)),
        TextSpan(text: number, style: TextStyle(fontSize: size, fontWeight: FontWeight.w800, color: main, letterSpacing: -0.3)),
      ]),
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      semanticsLabel: Formatters.price(amount),
    );
  }
}

/// Old name kept: plain price text (used where a custom style is needed).
class PriceText extends StatelessWidget {
  final double amount;
  final TextStyle? style;

  const PriceText({super.key, required this.amount, this.style});

  @override
  Widget build(BuildContext context) {
    if (style != null) return Text(Formatters.price(amount), style: style);
    return PriceTag(amount: amount, size: 16);
  }
}

/// Section title with an optional action on the right ("See all").
class SectionHeader extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;
  final EdgeInsetsGeometry padding;

  const SectionHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.padding = const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.xl, AppSpacing.page, AppSpacing.md),
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding,
      child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Expanded(
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: context.text.titleMedium?.copyWith(fontSize: 17)),
            if (subtitle != null) Padding(padding: const EdgeInsets.only(top: 2), child: Text(subtitle!, style: context.text.bodySmall)),
          ]),
        ),
        if (actionLabel != null) TextButton(onPressed: onAction, child: Text(actionLabel!)),
      ]),
    );
  }
}

/// Shimmer placeholder block.
class LoadingShimmer extends StatelessWidget {
  final double width;
  final double height;
  final double borderRadius;

  const LoadingShimmer({super.key, this.width = double.infinity, this.height = 100, this.borderRadius = AppRadius.md});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Shimmer.fromColors(
      baseColor: isDark ? const Color(0xFF1F1D29) : const Color(0xFFECE9F4),
      highlightColor: isDark ? const Color(0xFF2D2A3A) : const Color(0xFFF8F7FC),
      child: Container(
        width: width,
        height: height,
        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(borderRadius)),
      ),
    );
  }
}

/// Ready-made skeletons: a grid of listing cards or a list of rows.
class ShimmerLoader extends StatelessWidget {
  final bool grid;
  final int count;
  final double rowHeight;

  const ShimmerLoader.grid({super.key, this.count = 6})
      : grid = true,
        rowHeight = 0;
  const ShimmerLoader.list({super.key, this.count = 5, this.rowHeight = 92}) : grid = false;

  @override
  Widget build(BuildContext context) {
    if (grid) {
      return GridView.builder(
        physics: const NeverScrollableScrollPhysics(),
        padding: const EdgeInsets.all(AppSpacing.page),
        gridDelegate: listingGridDelegate(context),
        itemCount: count,
        itemBuilder: (_, _) => const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: LoadingShimmer(height: double.infinity, borderRadius: AppRadius.lg)),
          SizedBox(height: 10),
          LoadingShimmer(height: 12, width: 120, borderRadius: 6),
          SizedBox(height: 8),
          LoadingShimmer(height: 16, width: 80, borderRadius: 6),
        ]),
      );
    }
    return ListView.separated(
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(AppSpacing.page),
      itemCount: count,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
      itemBuilder: (_, _) => LoadingShimmer(height: rowHeight, borderRadius: AppRadius.lg),
    );
  }
}

/// Grid used for listing cards: 2 columns on phones, more on wide screens (web / tablets).
SliverGridDelegate listingGridDelegate(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width.clamp(0, 1200).toDouble();
  final columns = width >= 1100 ? 4 : width >= 760 ? 3 : 2;
  return SliverGridDelegateWithFixedCrossAxisCount(
    crossAxisCount: columns,
    mainAxisSpacing: AppSpacing.lg,
    crossAxisSpacing: AppSpacing.md,
    childAspectRatio: width < 380 ? 0.62 : 0.68,
  );
}

/// Friendly empty screen: icon, title, text and an optional action.
class EmptyState extends StatelessWidget {
  final String message;
  final String? title;
  final IconData icon;
  final Widget? action;

  const EmptyState({super.key, required this.message, this.title, this.icon = Icons.inbox_outlined, this.action});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(color: c.primarySoft, shape: BoxShape.circle),
            child: Icon(icon, size: 34, color: c.primaryText),
          ),
          const SizedBox(height: AppSpacing.lg),
          if (title != null) ...[
            Text(title!, textAlign: TextAlign.center, style: context.text.titleMedium),
            const SizedBox(height: 6),
          ],
          Text(message, textAlign: TextAlign.center, style: context.text.bodyMedium?.copyWith(color: c.textMuted, height: 1.45)),
          if (action != null) ...[const SizedBox(height: AppSpacing.xl), action!],
        ]),
      ),
    );
  }
}

/// Error message with a "Try again" button.
class ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  final String title;

  const ErrorState({super.key, required this.message, this.onRetry, this.title = 'Something went wrong'});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(color: c.dangerSoft, shape: BoxShape.circle),
            child: Icon(Icons.wifi_off_rounded, size: 32, color: c.danger),
          ),
          const SizedBox(height: AppSpacing.lg),
          Text(title, style: context.text.titleMedium, textAlign: TextAlign.center),
          const SizedBox(height: 6),
          Text(message, textAlign: TextAlign.center, style: context.text.bodyMedium?.copyWith(color: c.textMuted, height: 1.45)),
          if (onRetry != null) ...[
            const SizedBox(height: AppSpacing.xl),
            OutlinedButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh, size: 18), label: const Text('Try again')),
          ],
        ]),
      ),
    );
  }
}

/// Old name kept so existing screens keep working.
class ErrorView extends ErrorState {
  const ErrorView({super.key, required super.message, required VoidCallback super.onRetry});
}

/// Inline message box (info / warning / error / success).
enum NoticeTone { info, warning, error, success }

class InlineNotice extends StatelessWidget {
  final String message;
  final NoticeTone tone;
  final IconData? icon;

  const InlineNotice({super.key, required this.message, this.tone = NoticeTone.info, this.icon});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (fg, bg, defaultIcon) = switch (tone) {
      NoticeTone.info => (c.info, c.infoSoft, Icons.info_outline),
      NoticeTone.warning => (c.warning, c.warningSoft, Icons.schedule),
      NoticeTone.error => (c.danger, c.dangerSoft, Icons.error_outline),
      NoticeTone.success => (c.success, c.successSoft, Icons.check_circle_outline),
    };
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Icon(icon ?? defaultIcon, size: 20, color: fg),
        const SizedBox(width: 10),
        Expanded(child: Text(message, style: TextStyle(color: fg, fontWeight: FontWeight.w500, height: 1.4))),
      ]),
    );
  }
}

/// Round initials avatar (or photo).
class AppAvatar extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final double size;

  const AppAvatar({super.key, required this.name, this.imageUrl, this.size = 44});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final initials = name.trim().split(RegExp(r'\s+')).where((w) => w.isNotEmpty).take(2).map((w) => w[0].toUpperCase()).join();
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: c.primarySoft,
      foregroundImage: imageUrl != null && imageUrl!.isNotEmpty ? NetworkImage(imageUrl!) : null,
      child: Text(initials.isEmpty ? '?' : initials, style: TextStyle(color: c.primaryText, fontWeight: FontWeight.w700, fontSize: size * 0.36)),
    );
  }
}

/// App logo: purple rounded square with a music note + the name.
class BrandMark extends StatelessWidget {
  final double size;
  final bool showName;

  const BrandMark({super.key, this.size = 36, this.showName = true});

  @override
  Widget build(BuildContext context) {
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFF6D28D9)], begin: Alignment.topLeft, end: Alignment.bottomRight),
          borderRadius: BorderRadius.circular(size * 0.28),
        ),
        child: Icon(Icons.music_note_rounded, color: Colors.white, size: size * 0.6),
      ),
      if (showName) ...[
        SizedBox(width: size * 0.3),
        Text('MusicMarket', style: TextStyle(fontSize: size * 0.55, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
      ],
    ]);
  }
}
