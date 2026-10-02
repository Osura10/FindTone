import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/providers/catalog_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/suggestion_field.dart';
import '../../notifications/providers/notifications_provider.dart';
import '../models/alert_model.dart';
import '../providers/alerts_provider.dart';
import '../../notifications/widgets/notification_bell.dart';
import '../../../core/theme/app_theme.dart';

const _conditionCodes = ['new', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'];

/// My Alerts (buyers and shops): create manually or with "Fill with AI", edit, pause/resume, delete.
class MyAlertsScreen extends StatefulWidget {
  const MyAlertsScreen({super.key});

  @override
  State<MyAlertsScreen> createState() => _MyAlertsScreenState();
}

class _MyAlertsScreenState extends State<MyAlertsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<AlertsProvider>().fetchAlerts();
    });
  }

  void _openForm({AlertModel? alert}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => AlertForm(alert: alert),
    );
  }

  void _snack(String text, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(error ? '⚠ $text' : text)));
  }

  String _summary(AlertModel a) {
    final parts = <String>[
      if (a.category != null) a.category!,
      if (a.brand != null) a.brand!,
      if (a.modelKeyword != null) '"${a.modelKeyword}"',
      if (a.minPrice != null || a.maxPrice != null)
        '${a.minPrice != null ? Formatters.price(a.minPrice!) : 'Any'} – ${a.maxPrice != null ? Formatters.price(a.maxPrice!) : 'Any'}',
      if (a.conditionList.isNotEmpty) a.conditionList.map(Formatters.condition).join('/'),
      if (a.location != null) a.location!,
    ];
    return parts.join(' · ');
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AlertsProvider>();
    final c = context.colors;
    final canPop = Navigator.of(context).canPop();

    Widget body;
    if (provider.isLoading && provider.alerts.isEmpty) {
      body = const ShimmerLoader.list(count: 3, rowHeight: 130);
    } else if (provider.errorMessage != null && provider.alerts.isEmpty) {
      body = ListView(children: [ErrorState(message: provider.errorMessage!, onRetry: provider.fetchAlerts)]);
    } else if (provider.alerts.isEmpty) {
      body = ListView(children: [
        const SizedBox(height: 60),
        EmptyState(
          icon: Icons.notifications_active_outlined,
          title: 'No alerts yet',
          message: 'Tell us what you want – we notify you the moment a matching instrument is listed.',
          action: FilledButton.icon(icon: const Icon(Icons.add), label: const Text('Create Alert'), onPressed: _openForm),
        ),
      ]);
    } else {
      body = ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, 96),
        itemCount: provider.alerts.length,
        itemBuilder: (context, index) {
          final alert = provider.alerts[index];
          return Padding(
            key: ValueKey('alert-${alert.id}'),
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: Opacity(
              opacity: alert.isActive ? 1 : 0.65,
              child: AppCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(AppRadius.md)),
                        child: Icon(Icons.notifications_active_outlined, size: 20, color: c.primaryText),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(alert.name.isNotEmpty ? alert.name : 'Alert #${alert.id}', style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          Text(alert.isActive ? 'Active' : 'Paused', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: alert.isActive ? c.success : c.textMuted)),
                        ]),
                      ),
                      Switch(
                        value: alert.isActive,
                        onChanged: (val) async {
                          final (error, matches) = await provider.toggleAlert(alert.id, val);
                          if (error != null) {
                            _snack(error, error: true);
                          } else if (val && matches > 0) {
                            _snack('Alert resumed – $matches listing${matches == 1 ? '' : 's'} match now.');
                            if (context.mounted) context.read<NotificationsProvider>().refreshUnreadCount();
                          } else {
                            _snack(val ? 'Alert resumed' : 'Alert paused');
                          }
                        },
                      ),
                    ]),
                    const SizedBox(height: AppSpacing.md),
                    Wrap(spacing: 6, runSpacing: 6, children: [
                      for (final part in _summary(alert).split(' · ').where((p) => p.isNotEmpty))
                        Pill(label: part, color: context.scheme.onSurface, background: c.surface2),
                    ]),
                    if (alert.lastNotifiedAt != null)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpacing.sm),
                        child: Row(children: [
                          Icon(Icons.schedule_rounded, size: 14, color: c.textMuted),
                          const SizedBox(width: 4),
                          Text('Last match: ${alert.lastNotifiedAt}'.split('.').first, style: context.text.bodySmall),
                        ]),
                      ),
                    const SizedBox(height: AppSpacing.sm),
                    const Divider(),
                    Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                      TextButton.icon(icon: const Icon(Icons.edit_outlined, size: 18), label: const Text('Edit'), onPressed: () => _openForm(alert: alert)),
                      TextButton.icon(
                        style: TextButton.styleFrom(foregroundColor: c.danger),
                        icon: const Icon(Icons.delete_outline_rounded, size: 18),
                        label: const Text('Delete'),
                        onPressed: () async {
                          final error = await provider.deleteAlert(alert.id);
                          _snack(error ?? 'Alert deleted', error: error != null);
                        },
                      ),
                    ]),
                  ],
                ),
              ),
            ),
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: canPop,
        title: const Text('My Alerts'),
        actions: const [NotificationBell(), SizedBox(width: 4)],
      ),
      body: RefreshIndicator(onRefresh: provider.fetchAlerts, child: body),
      floatingActionButton: FloatingActionButton.extended(heroTag: 'new-alert', onPressed: _openForm, icon: const Icon(Icons.add), label: const Text('New alert')),
    );
  }
}

/// Create / edit form. Every field uses a controller so "Fill with AI" can set it.
class AlertForm extends StatefulWidget {
  final AlertModel? alert;
  const AlertForm({super.key, this.alert});

  @override
  State<AlertForm> createState() => _AlertFormState();
}

class _AlertFormState extends State<AlertForm> {
  final _formKey = GlobalKey<FormState>();
  final _aiText = TextEditingController();
  final _name = TextEditingController();
  final _category = TextEditingController();
  final _brand = TextEditingController();
  final _model = TextEditingController();
  final _minPrice = TextEditingController();
  final _maxPrice = TextEditingController();
  final _location = TextEditingController();
  final Set<String> _conditions = {};
  String? _queryText;
  bool _isParsing = false;
  bool _isSaving = false;
  String? _error;
  String? _aiNote;

  static String _num(double? v) => v == null ? '' : (v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString());

  @override
  void initState() {
    super.initState();
    final a = widget.alert;
    if (a != null) {
      _name.text = a.name;
      _category.text = a.category ?? '';
      _brand.text = a.brand ?? '';
      _model.text = a.modelKeyword ?? '';
      _minPrice.text = _num(a.minPrice);
      _maxPrice.text = _num(a.maxPrice);
      _location.text = a.location ?? '';
      _conditions.addAll(a.conditionList);
      _queryText = a.queryText;
    }
  }

  @override
  void dispose() {
    for (final c in [_aiText, _name, _category, _brand, _model, _minPrice, _maxPrice, _location]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _fillWithAi() async {
    final text = _aiText.text.trim();
    if (text.isEmpty) return;
    setState(() {
      _isParsing = true;
      _error = null;
      _aiNote = null;
    });
    try {
      final res = await context.read<AlertsProvider>().parseAlertText(text);
      String str(String key) => res[key]?.toString() ?? '';
      setState(() {
        _queryText = text;
        _name.text = str('name').isNotEmpty ? str('name') : text;
        _category.text = str('category');
        _brand.text = str('brand');
        _model.text = str('model_keyword');
        _minPrice.text = _num((res['min_price'] as num?)?.toDouble());
        _maxPrice.text = _num((res['max_price'] as num?)?.toDouble());
        _location.text = str('location');
        _conditions
          ..clear()
          ..addAll(str('conditions').split(',').map((c) => c.trim()).where(_conditionCodes.contains));
        _aiNote = res['used_fallback'] == true ? 'Filled by keyword matching – please check.' : 'Filled by AI – please check.';
      });
    } catch (e) {
      setState(() => _error = describeError(e));
    } finally {
      if (mounted) setState(() => _isParsing = false);
    }
  }

  Future<void> _save() async {
    final min = double.tryParse(_minPrice.text.trim());
    final max = double.tryParse(_maxPrice.text.trim());
    String? orNull(TextEditingController c) => c.text.trim().isEmpty ? null : c.text.trim();
    final data = <String, dynamic>{
      'name': orNull(_name),
      'queryText': _queryText,
      'category': orNull(_category),
      'brand': orNull(_brand),
      'modelKeyword': orNull(_model),
      'minPrice': min,
      'maxPrice': max,
      'conditions': _conditions.isEmpty ? null : _conditionCodes.where(_conditions.contains).join(','),
      'location': orNull(_location),
    };
    final hasFilter = ['category', 'brand', 'modelKeyword', 'conditions', 'location'].any((k) => data[k] != null) || min != null || max != null;
    if (!hasFilter) {
      setState(() => _error = 'Set at least one filter: category, brand, model, price, condition or location.');
      return;
    }
    if (min != null && max != null && max < min) {
      setState(() => _error = 'Max price must be greater than or equal to min price.');
      return;
    }

    setState(() {
      _isSaving = true;
      _error = null;
    });
    final navigator = Navigator.of(context);
    final messenger = ScaffoldMessenger.of(context);
    final notifications = context.read<NotificationsProvider>();
    try {
      final saved = await context.read<AlertsProvider>().saveAlert(data, id: widget.alert?.id);
      final matches = saved.newMatches ?? 0;
      if (matches > 0) notifications.refreshUnreadCount();
      navigator.pop();
      messenger.showSnackBar(SnackBar(
        content: Text(matches > 0
            ? 'Alert saved. $matches listing${matches == 1 ? '' : 's'} already match – see Notifications.'
            : 'Alert saved. We will notify you about new matches.'),
      ));
    } catch (e) {
      setState(() => _error = describeError(e));
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Widget _number(TextEditingController c, String label) => Expanded(
        child: TextFormField(controller: c, decoration: InputDecoration(labelText: label), keyboardType: TextInputType.number),
      );

  @override
  Widget build(BuildContext context) {
    final catalog = context.watch<CatalogProvider>();
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpacing.page, 0, AppSpacing.page, AppSpacing.page),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(widget.alert == null ? 'Create Alert' : 'Edit Alert', style: context.text.titleLarge),
                const SizedBox(height: AppSpacing.lg),
                // Describe in plain words -> the AI fills the filters
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(AppRadius.lg)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
                    Row(children: [
                      Icon(Icons.auto_awesome, size: 18, color: c.primaryText),
                      const SizedBox(width: 6),
                      Text('Describe what you want', style: TextStyle(fontWeight: FontWeight.w700, color: c.primaryText)),
                    ]),
                    const SizedBox(height: AppSpacing.sm),
                    TextField(
                      key: const ValueKey('ai-text'),
                      controller: _aiText,
                      decoration: const InputDecoration(hintText: 'e.g. used Yamaha guitar under 40k in Colombo'),
                      onSubmitted: (_) => _fillWithAi(),
                    ),
                    const SizedBox(height: AppSpacing.sm),
                    FilledButton.icon(
                      key: const ValueKey('fill-with-ai'),
                      icon: _isParsing
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.auto_awesome, size: 18),
                      label: Text(_isParsing ? 'Reading…' : 'Fill with AI'),
                      onPressed: _isParsing ? null : _fillWithAi,
                    ),
                    if (_aiNote != null)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpacing.sm),
                        child: Row(children: [
                          Icon(Icons.check_circle_outline, size: 16, color: c.success),
                          const SizedBox(width: 6),
                          Expanded(child: Text(_aiNote!, style: TextStyle(color: c.success, fontWeight: FontWeight.w600))),
                        ]),
                      ),
                  ]),
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Alert name (optional)')),
                const SizedBox(height: AppSpacing.md),
                SuggestionField(controller: _category, label: 'Category', suggestions: catalog.categories),
                const SizedBox(height: AppSpacing.md),
                SuggestionField(controller: _brand, label: 'Brand', suggestions: catalog.brands),
                const SizedBox(height: AppSpacing.md),
                TextFormField(controller: _model, decoration: const InputDecoration(labelText: 'Model / keyword')),
                const SizedBox(height: AppSpacing.md),
                Row(children: [_number(_minPrice, 'Min LKR'), const SizedBox(width: AppSpacing.md), _number(_maxPrice, 'Max LKR')]),
                const SizedBox(height: AppSpacing.md),
                TextFormField(controller: _location, decoration: const InputDecoration(labelText: 'Location', prefixIcon: Icon(Icons.place_outlined))),
                const SizedBox(height: AppSpacing.lg),
                Text('Conditions (any of)', style: context.text.titleSmall),
                const SizedBox(height: AppSpacing.sm),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    for (final code in _conditionCodes)
                      FilterChip(
                        label: Text(Formatters.condition(code)),
                        selected: _conditions.contains(code),
                        onSelected: (on) => setState(() => on ? _conditions.add(code) : _conditions.remove(code)),
                      ),
                  ],
                ),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: AppSpacing.md), child: InlineNotice(message: _error!, tone: NoticeTone.error)),
                const SizedBox(height: AppSpacing.xl),
                SizedBox(
                  height: 52,
                  child: FilledButton(
                    key: const ValueKey('save-alert'),
                    onPressed: _isSaving ? null : _save,
                    child: _isSaving
                        ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('Save Alert'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
