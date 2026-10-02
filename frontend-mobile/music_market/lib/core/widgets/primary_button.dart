import 'package:flutter/material.dart';

enum ButtonVariant { filled, outlined, tonal, danger }

/// Full-width (by default) button with a loading spinner. Use [variant] for the style.
class PrimaryButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final ButtonVariant variant;
  final bool expand;
  final String? loadingText;

  const PrimaryButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.variant = ButtonVariant.filled,
    this.expand = true,
    this.loadingText,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final onPress = isLoading ? null : onPressed;
    final spinnerColor = variant == ButtonVariant.outlined ? scheme.primary : Colors.white;

    final Widget label = isLoading
        ? Row(mainAxisSize: MainAxisSize.min, children: [
            SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: spinnerColor)),
            if (loadingText != null) ...[const SizedBox(width: 10), Flexible(child: Text(loadingText!, overflow: TextOverflow.ellipsis))],
          ])
        : Row(mainAxisSize: MainAxisSize.min, children: [
            if (icon != null) ...[Icon(icon, size: 20), const SizedBox(width: 8)],
            Flexible(child: Text(text, overflow: TextOverflow.ellipsis)),
          ]);

    final Widget button = switch (variant) {
      ButtonVariant.outlined => OutlinedButton(onPressed: onPress, child: label),
      ButtonVariant.tonal => FilledButton.tonal(onPressed: onPress, child: label),
      ButtonVariant.danger => FilledButton(
          onPressed: onPress,
          style: FilledButton.styleFrom(backgroundColor: scheme.error, foregroundColor: Colors.white),
          child: label,
        ),
      ButtonVariant.filled => FilledButton(onPressed: onPress, child: label),
    };

    return expand ? SizedBox(width: double.infinity, height: 52, child: button) : button;
  }
}
