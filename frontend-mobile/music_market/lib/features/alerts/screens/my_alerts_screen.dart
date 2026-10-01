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
      backgroundColor: Colors.transparent,
      builder: (_) => AlertForm(alert: alert),
    );
  }

  void _snack(String text, {bool error = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text), backgroundColor: error ? Colors.red : null));
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

    Widget body;
    if (provider.isLoading && provider.alerts.isEmpty) {
      body = const Center(child: CircularProgressIndicator());
    } else if (provider.errorMessage != null && provider.alerts.isEmpty) {
      body = ErrorView(message: provider.errorMessage!, onRetry: provider.fetchAlerts);
    } else if (provider.alerts.isEmpty) {
      body = ListView(children: [
        const SizedBox(height: 120),
        const EmptyState(icon: Icons.notifications_off, message: 'No alerts yet.'),
        const SizedBox(height: 16),
        Center(child: ElevatedButton.icon(icon: const Icon(Icons.add), label: const Text('Create Alert'), onPressed: _openForm)),
      ]);
    } else {
      body = ListView.builder(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        itemCount: provider.alerts.length,
        itemBuilder: (context, index) {
          final alert = provider.alerts[index];
          return Card(
            key: ValueKey('alert-${alert.id}'),
            margin: const EdgeInsets.only(bottom: 16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    Expanded(
                      child: Text(alert.name.isNotEmpty ? alert.name : 'Alert #${alert.id}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
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
                  Text(_summary(alert), style: const TextStyle(color: Colors.grey)),
                  if (alert.lastNotifiedAt != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text('Last match: ${alert.lastNotifiedAt}'.split('.').first, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    ),
                  Row(mainAxisAlignment: MainAxisAlignment.end, children: [
                    TextButton.icon(icon: const Icon(Icons.edit, size: 16), label: const Text('Edit'), onPressed: () => _openForm(alert: alert)),
                    TextButton.icon(
                      icon: const Icon(Icons.delete, size: 16, color: Colors.red),
                      label: const Text('Delete', style: TextStyle(color: Colors.red)),
                      onPressed: () async {
                        final error = await provider.deleteAlert(alert.id);
                        _snack(error ?? 'Alert deleted', error: error != null);
                      },
                    ),
                  ]),
                ],
              ),
            ),
          );
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Alerts'),
        actions: [IconButton(tooltip: 'New alert', icon: const Icon(Icons.add), onPressed: _openForm)],
      ),
      body: RefreshIndicator(onRefresh: provider.fetchAlerts, child: body),
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
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom, left: 16, right: 16, top: 24),
      child: SafeArea(
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(widget.alert == null ? 'Create Alert' : 'Edit Alert', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('ai-text'),
                      controller: _aiText,
                      decoration: const InputDecoration(hintText: 'e.g. used Yamaha guitar under 40k in Colombo'),
                      onSubmitted: (_) => _fillWithAi(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton.icon(
                    key: const ValueKey('fill-with-ai'),
                    icon: _isParsing ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome),
                    label: Text(_isParsing ? 'Reading…' : 'Fill with AI'),
                    onPressed: _isParsing ? null : _fillWithAi,
                  ),
                ]),
                if (_aiNote != null) Padding(padding: const EdgeInsets.only(top: 6), child: Text(_aiNote!, style: const TextStyle(color: Colors.green))),
                const SizedBox(height: 16),
                TextFormField(controller: _name, decoration: const InputDecoration(labelText: 'Alert name (optional)')),
                const SizedBox(height: 12),
                SuggestionField(controller: _category, label: 'Category', suggestions: catalog.categories),
                const SizedBox(height: 12),
                SuggestionField(controller: _brand, label: 'Brand', suggestions: catalog.brands),
                const SizedBox(height: 12),
                TextFormField(controller: _model, decoration: const InputDecoration(labelText: 'Model / keyword')),
                const SizedBox(height: 12),
                Row(children: [_number(_minPrice, 'Min price (LKR)'), const SizedBox(width: 16), _number(_maxPrice, 'Max price (LKR)')]),
                const SizedBox(height: 12),
                TextFormField(controller: _location, decoration: const InputDecoration(labelText: 'Location')),
                const SizedBox(height: 12),
                const Text('Conditions (any of)'),
                Wrap(
                  spacing: 6,
                  children: [
                    for (final c in _conditionCodes)
                      FilterChip(
                        label: Text(Formatters.condition(c)),
                        selected: _conditions.contains(c),
                        onSelected: (on) => setState(() => on ? _conditions.add(c) : _conditions.remove(c)),
                      ),
                  ],
                ),
                if (_error != null) Padding(padding: const EdgeInsets.only(top: 12), child: Text(_error!, style: const TextStyle(color: Colors.redAccent))),
                const SizedBox(height: 20),
                ElevatedButton(
                  key: const ValueKey('save-alert'),
                  onPressed: _isSaving ? null : _save,
                  child: _isSaving ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2)) : const Text('Save Alert'),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
