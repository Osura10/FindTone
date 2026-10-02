import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';

/// Spacing scale (same steps as the web design tokens).
class AppSpacing {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;

  /// Side padding for page content.
  static const double page = 16;
}

class AppRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double full = 999;
}

/// Extra brand colours that Material's ColorScheme does not have (status colours, borders,
/// muted text). Read them with `context.colors`.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  final Color surface2;
  final Color border;
  final Color textMuted;
  final Color success;
  final Color successSoft;
  final Color warning;
  final Color warningSoft;
  final Color danger;
  final Color dangerSoft;
  final Color info;
  final Color infoSoft;
  final Color primarySoft;
  final Color primaryText;

  const AppColors({
    required this.surface2,
    required this.border,
    required this.textMuted,
    required this.success,
    required this.successSoft,
    required this.warning,
    required this.warningSoft,
    required this.danger,
    required this.dangerSoft,
    required this.info,
    required this.infoSoft,
    required this.primarySoft,
    required this.primaryText,
  });

  static const light = AppColors(
    surface2: Color(0xFFF2F0F8),
    border: Color(0xFFE2DFEC),
    textMuted: Color(0xFF6B6680),
    success: Color(0xFF047857),
    successSoft: Color(0xFFD1FAE5),
    warning: Color(0xFFB45309),
    warningSoft: Color(0xFFFEF3C7),
    danger: Color(0xFFB91C1C),
    dangerSoft: Color(0xFFFEE2E2),
    info: Color(0xFF1D4ED8),
    infoSoft: Color(0xFFDBEAFE),
    primarySoft: Color(0xFFEDE9FE),
    primaryText: Color(0xFF6D28D9),
  );

  static const dark = AppColors(
    surface2: Color(0xFF1F1D29),
    border: Color(0xFF2D2A3A),
    textMuted: Color(0xFF9690AB),
    success: Color(0xFF34D399),
    successSoft: Color(0x2434D399),
    warning: Color(0xFFFBBF24),
    warningSoft: Color(0x24FBBF24),
    danger: Color(0xFFF87171),
    dangerSoft: Color(0x24F87171),
    info: Color(0xFF60A5FA),
    infoSoft: Color(0x2460A5FA),
    primarySoft: Color(0x298B5CF6),
    primaryText: Color(0xFFC4B5FD),
  );

  @override
  AppColors copyWith() => this;

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColors(
      surface2: l(surface2, other.surface2),
      border: l(border, other.border),
      textMuted: l(textMuted, other.textMuted),
      success: l(success, other.success),
      successSoft: l(successSoft, other.successSoft),
      warning: l(warning, other.warning),
      warningSoft: l(warningSoft, other.warningSoft),
      danger: l(danger, other.danger),
      dangerSoft: l(dangerSoft, other.dangerSoft),
      info: l(info, other.info),
      infoSoft: l(infoSoft, other.infoSoft),
      primarySoft: l(primarySoft, other.primarySoft),
      primaryText: l(primaryText, other.primaryText),
    );
  }
}

extension AppThemeContext on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>() ?? AppColors.dark;
  ColorScheme get scheme => Theme.of(this).colorScheme;
  TextTheme get text => Theme.of(this).textTheme;
}

/// Central Material 3 theme in the web brand (purple accent), light + dark.
class AppTheme {
  static const Color brand = Color(0xFF6D28D9);
  static const String fontFamily = 'Inter';

  static ThemeData get light => _build(Brightness.light);
  static ThemeData get dark => _build(Brightness.dark);

  static ThemeData _build(Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final colors = isDark ? AppColors.dark : AppColors.light;

    final scheme = ColorScheme.fromSeed(seedColor: brand, brightness: brightness).copyWith(
      primary: isDark ? const Color(0xFF8B5CF6) : brand,
      onPrimary: Colors.white,
      primaryContainer: colors.primarySoft,
      onPrimaryContainer: colors.primaryText,
      surface: isDark ? const Color(0xFF17161F) : Colors.white,
      onSurface: isDark ? const Color(0xFFF3F2F8) : const Color(0xFF16141F),
      onSurfaceVariant: isDark ? const Color(0xFFBDB8CF) : const Color(0xFF4F4B63),
      surfaceContainerLowest: isDark ? const Color(0xFF0E0D14) : const Color(0xFFF6F5FA),
      surfaceContainerLow: isDark ? const Color(0xFF17161F) : Colors.white,
      surfaceContainer: colors.surface2,
      surfaceContainerHigh: isDark ? const Color(0xFF2A2836) : const Color(0xFFE8E5F2),
      surfaceContainerHighest: isDark ? const Color(0xFF2A2836) : const Color(0xFFE8E5F2),
      outline: isDark ? const Color(0xFF423E55) : const Color(0xFFCBC6DA),
      outlineVariant: colors.border,
      error: colors.danger,
      onError: Colors.white,
      errorContainer: colors.dangerSoft,
      onErrorContainer: colors.danger,
    );
    final background = isDark ? const Color(0xFF0E0D14) : const Color(0xFFF6F5FA);

    final base = ThemeData(useMaterial3: true, brightness: brightness, colorScheme: scheme, fontFamily: fontFamily);
    final text = base.textTheme.copyWith(
      displaySmall: base.textTheme.displaySmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.8),
      headlineMedium: base.textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.6),
      headlineSmall: base.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.4),
      titleLarge: base.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700, letterSpacing: -0.2),
      // Material's default letter spacing is set for Roboto; Inter reads better tighter.
      titleMedium: base.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700, letterSpacing: 0),
      titleSmall: base.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(letterSpacing: 0),
      bodyMedium: base.textTheme.bodyMedium?.copyWith(letterSpacing: 0),
      bodySmall: base.textTheme.bodySmall?.copyWith(color: colors.textMuted, letterSpacing: 0),
      labelLarge: base.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600, letterSpacing: 0),
      labelMedium: base.textTheme.labelMedium?.copyWith(letterSpacing: 0),
      labelSmall: base.textTheme.labelSmall?.copyWith(letterSpacing: 0.2),
    ).apply(bodyColor: scheme.onSurface, displayColor: scheme.onSurface);

    OutlineInputBorder border(Color c, [double w = 1]) =>
        OutlineInputBorder(borderRadius: BorderRadius.circular(AppRadius.md), borderSide: BorderSide(color: c, width: w));
    final buttonShape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md));
    const buttonText = TextStyle(fontFamily: fontFamily, fontWeight: FontWeight.w600, fontSize: 15);

    return base.copyWith(
      scaffoldBackgroundColor: background,
      textTheme: text,
      extensions: [colors],
      splashFactory: InkSparkle.splashFactory,
      pageTransitionsTheme: const PageTransitionsTheme(builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
        TargetPlatform.windows: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.linux: FadeForwardsPageTransitionsBuilder(),
        TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
      }),
      appBarTheme: AppBarTheme(
        backgroundColor: background,
        surfaceTintColor: Colors.transparent,
        foregroundColor: scheme.onSurface,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        centerTitle: false,
        titleTextStyle: text.titleLarge?.copyWith(fontSize: 20),
      ),
      cardTheme: CardThemeData(
        color: scheme.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        margin: EdgeInsets.zero,
        clipBehavior: Clip.antiAlias,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg), side: BorderSide(color: colors.border)),
      ),
      dividerTheme: DividerThemeData(color: colors.border, space: 1, thickness: 1),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surface,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
        border: border(scheme.outline),
        enabledBorder: border(scheme.outline),
        focusedBorder: border(scheme.primary, 2),
        errorBorder: border(colors.danger),
        focusedErrorBorder: border(colors.danger, 2),
        hintStyle: TextStyle(color: colors.textMuted),
        labelStyle: TextStyle(color: scheme.onSurfaceVariant),
        floatingLabelStyle: TextStyle(color: scheme.primary, fontWeight: FontWeight.w600),
        prefixIconColor: colors.textMuted,
        suffixIconColor: colors.textMuted,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: const Size(64, 48), shape: buttonShape, textStyle: buttonText),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: scheme.primary,
          foregroundColor: Colors.white,
          disabledBackgroundColor: scheme.surfaceContainerHigh,
          elevation: 0,
          minimumSize: const Size(64, 48),
          shape: buttonShape,
          textStyle: buttonText,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: scheme.onSurface,
          minimumSize: const Size(64, 48),
          shape: buttonShape,
          side: BorderSide(color: scheme.outline),
          textStyle: buttonText,
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(foregroundColor: colors.primaryText, textStyle: buttonText.copyWith(fontSize: 14)),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: scheme.surface,
        selectedColor: colors.primarySoft,
        side: BorderSide(color: colors.border),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.full)),
        labelStyle: TextStyle(fontFamily: fontFamily, fontSize: 13, fontWeight: FontWeight.w500, color: scheme.onSurface),
        secondaryLabelStyle: TextStyle(fontFamily: fontFamily, fontSize: 13, fontWeight: FontWeight.w600, color: colors.primaryText),
        checkmarkColor: colors.primaryText,
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: SegmentedButton.styleFrom(
          selectedBackgroundColor: colors.primarySoft,
          selectedForegroundColor: colors.primaryText,
          side: BorderSide(color: scheme.outline),
          textStyle: buttonText.copyWith(fontSize: 14),
          minimumSize: const Size(0, 44),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        indicatorColor: colors.primarySoft,
        elevation: 0,
        height: 68,
        labelTextStyle: WidgetStateProperty.resolveWith((s) => TextStyle(
              fontFamily: fontFamily,
              fontSize: 12,
              fontWeight: s.contains(WidgetState.selected) ? FontWeight.w700 : FontWeight.w500,
              color: s.contains(WidgetState.selected) ? colors.primaryText : colors.textMuted,
            )),
        iconTheme: WidgetStateProperty.resolveWith((s) => IconThemeData(color: s.contains(WidgetState.selected) ? colors.primaryText : colors.textMuted)),
      ),
      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        showDragHandle: true,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.xl))),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.xl)),
      ),
      snackBarTheme: SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: isDark ? const Color(0xFF2A2836) : const Color(0xFF16141F),
        contentTextStyle: const TextStyle(fontFamily: fontFamily, color: Colors.white, fontSize: 14),
        actionTextColor: const Color(0xFFC4B5FD),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
      ),
      listTileTheme: ListTileThemeData(iconColor: scheme.onSurfaceVariant, contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.lg)),
      floatingActionButtonTheme: FloatingActionButtonThemeData(
        backgroundColor: scheme.primary,
        foregroundColor: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.lg)),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: scheme.primary),
      badgeTheme: BadgeThemeData(backgroundColor: colors.danger, textColor: Colors.white),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? Colors.white : null),
        trackColor: WidgetStateProperty.resolveWith((s) => s.contains(WidgetState.selected) ? scheme.primary : null),
      ),
    );
  }
}
