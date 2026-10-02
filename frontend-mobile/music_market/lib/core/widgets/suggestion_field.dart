import 'package:flutter/material.dart';

/// Free-text field with suggestions (category, brand...). Any value can be typed.
/// Uses the caller's controller, so the text can be set after data loads.
///
/// Built from a plain TextFormField + chips + a menu (not RawAutocomplete): RawAutocomplete
/// could not be focused through the web/screen-reader accessibility layer.
class SuggestionField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  final List<String> suggestions;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final String? hint;

  /// How many matching suggestions are shown as chips while typing.
  final int maxChips;

  const SuggestionField({
    super.key,
    required this.controller,
    required this.label,
    required this.suggestions,
    this.validator,
    this.onChanged,
    this.hint,
    this.maxChips = 4,
  });

  @override
  State<SuggestionField> createState() => _SuggestionFieldState();
}

class _SuggestionFieldState extends State<SuggestionField> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_rebuild);
  }

  @override
  void didUpdateWidget(SuggestionField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_rebuild);
      widget.controller.addListener(_rebuild);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_rebuild);
    super.dispose();
  }

  void _rebuild() {
    if (mounted) setState(() {});
  }

  void _pick(String value) {
    widget.controller.text = value;
    widget.controller.selection = TextSelection.collapsed(offset: value.length);
    widget.onChanged?.call(value);
  }

  /// Suggestions that contain the typed text (but are not exactly it).
  List<String> get _matches {
    final q = widget.controller.text.trim().toLowerCase();
    if (q.isEmpty) return const [];
    return widget.suggestions.where((s) => s.toLowerCase().contains(q) && s.toLowerCase() != q).take(widget.maxChips).toList();
  }

  @override
  Widget build(BuildContext context) {
    final matches = _matches;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextFormField(
          controller: widget.controller,
          decoration: InputDecoration(
            labelText: widget.label,
            hintText: widget.hint,
            suffixIcon: widget.suggestions.isEmpty
                ? null
                : PopupMenuButton<String>(
                    tooltip: '${widget.label} suggestions',
                    icon: const Icon(Icons.arrow_drop_down),
                    onSelected: _pick,
                    itemBuilder: (_) => [for (final s in widget.suggestions) PopupMenuItem(value: s, child: Text(s))],
                  ),
          ),
          validator: widget.validator,
          onChanged: widget.onChanged,
        ),
        if (matches.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Wrap(
              spacing: 6,
              runSpacing: 4,
              children: [
                for (final m in matches)
                  ActionChip(label: Text(m), tooltip: 'Use "$m"', onPressed: () => _pick(m)),
              ],
            ),
          ),
      ],
    );
  }
}
