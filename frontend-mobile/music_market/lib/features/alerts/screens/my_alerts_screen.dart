import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/alerts_provider.dart';
import '../models/alert_model.dart';

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
      context.read<AlertsProvider>().fetchAlerts();
    });
  }

  void _showFormDialog({AlertModel? alert}) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _AlertForm(alert: alert),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AlertsProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Alerts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => _showFormDialog(),
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : provider.alerts.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.notifications_off, size: 64, color: Colors.grey),
                      const SizedBox(height: 16),
                      const Text('No alerts found.', style: TextStyle(color: Colors.grey)),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        icon: const Icon(Icons.add),
                        label: const Text('Create Alert'),
                        onPressed: () => _showFormDialog(),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: provider.alerts.length,
                  itemBuilder: (context, index) {
                    final alert = provider.alerts[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    alert.queryText ?? 'Alert #${alert.id}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                ),
                                Switch(
                                  value: alert.isActive,
                                  onChanged: (val) {
                                    provider.toggleAlert(alert.id, val);
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            if (alert.category != null || alert.brand != null)
                              Text('${alert.category ?? ''} ${alert.brand ?? ''}'.trim(), style: const TextStyle(color: Colors.grey)),
                            if (alert.minPrice != null || alert.maxPrice != null)
                              Text('LKR ${alert.minPrice ?? 0} - LKR ${alert.maxPrice ?? 'Any'}', style: const TextStyle(color: Colors.blue)),
                            const SizedBox(height: 16),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                TextButton.icon(
                                  icon: const Icon(Icons.edit, size: 16),
                                  label: const Text('Edit'),
                                  onPressed: () => _showFormDialog(alert: alert),
                                ),
                                TextButton.icon(
                                  icon: const Icon(Icons.delete, size: 16, color: Colors.red),
                                  label: const Text('Delete', style: TextStyle(color: Colors.red)),
                                  onPressed: () => provider.deleteAlert(alert.id),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}

class _AlertForm extends StatefulWidget {
  final AlertModel? alert;
  const _AlertForm({this.alert});

  @override
  State<_AlertForm> createState() => _AlertFormState();
}

class _AlertFormState extends State<_AlertForm> {
  final _formKey = GlobalKey<FormState>();
  String _parseText = '';
  bool _isParsing = false;
  bool _isSaving = false;
  
  late String _queryText;
  String? _category;
  String? _brand;
  String? _modelKeyword;
  String? _minPrice;
  String? _maxPrice;
  String? _location;

  @override
  void initState() {
    super.initState();
    _queryText = widget.alert?.queryText ?? '';
    _category = widget.alert?.category;
    _brand = widget.alert?.brand;
    _modelKeyword = widget.alert?.modelKeyword;
    _minPrice = widget.alert?.minPrice?.toString();
    _maxPrice = widget.alert?.maxPrice?.toString();
    _location = widget.alert?.location;
  }

  Future<void> _parseWithAI() async {
    if (_parseText.trim().isEmpty) return;
    setState(() => _isParsing = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final res = await context.read<AlertsProvider>().parseAlertQuery(_parseText);
      setState(() {
        _queryText = _parseText;
        if (res['category'] != null) _category = res['category'];
        if (res['brand'] != null) _brand = res['brand'];
        if (res['model_keyword'] != null) _modelKeyword = res['model_keyword'];
        if (res['min_price'] != null) _minPrice = res['min_price'].toString();
        if (res['max_price'] != null) _maxPrice = res['max_price'].toString();
        if (res['location'] != null) _location = res['location'];
      });
      messenger.showSnackBar(const SnackBar(content: Text('AI populated form fields!')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    } finally {
      setState(() => _isParsing = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();
    
    setState(() => _isSaving = true);
    
    final data = {
      'queryText': _queryText,
      'category': _category?.isEmpty ?? true ? null : _category,
      'brand': _brand?.isEmpty ?? true ? null : _brand,
      'modelKeyword': _modelKeyword?.isEmpty ?? true ? null : _modelKeyword,
      'minPrice': _minPrice != null && _minPrice!.isNotEmpty ? double.tryParse(_minPrice!) : null,
      'maxPrice': _maxPrice != null && _maxPrice!.isNotEmpty ? double.tryParse(_maxPrice!) : null,
      'location': _location?.isEmpty ?? true ? null : _location,
      'isActive': widget.alert?.isActive ?? true,
    };

    try {
      if (widget.alert == null) {
        await context.read<AlertsProvider>().createAlert(data);
      } else {
        await context.read<AlertsProvider>().updateAlert(widget.alert!.id, data);
      }
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
        left: 16,
        right: 16,
        top: 24,
      ),
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
                
                if (widget.alert == null) ...[
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          decoration: const InputDecoration(hintText: 'Describe what you\'re looking for...'),
                          onChanged: (v) => _parseText = v,
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton.icon(
                        icon: _isParsing ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.auto_awesome),
                        label: const Text('Fill with AI'),
                        onPressed: _isParsing ? null : _parseWithAI,
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.purple),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                ],

                TextFormField(
                  initialValue: _queryText,
                  decoration: const InputDecoration(labelText: 'Name / Query Text'),
                  validator: (v) => v!.isEmpty ? 'Required' : null,
                  onSaved: (v) => _queryText = v!,
                ),
                const SizedBox(height: 16),
                
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        initialValue: _category,
                        decoration: const InputDecoration(labelText: 'Category'),
                        onSaved: (v) => _category = v,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        initialValue: _brand,
                        decoration: const InputDecoration(labelText: 'Brand'),
                        onSaved: (v) => _brand = v,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  initialValue: _modelKeyword,
                  decoration: const InputDecoration(labelText: 'Model / Keywords'),
                  onSaved: (v) => _modelKeyword = v,
                ),
                const SizedBox(height: 16),
                
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        initialValue: _minPrice,
                        decoration: const InputDecoration(labelText: 'Min Price (LKR)'),
                        keyboardType: TextInputType.number,
                        onSaved: (v) => _minPrice = v,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: TextFormField(
                        initialValue: _maxPrice,
                        decoration: const InputDecoration(labelText: 'Max Price (LKR)'),
                        keyboardType: TextInputType.number,
                        onSaved: (v) => _maxPrice = v,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                
                TextFormField(
                  initialValue: _location,
                  decoration: const InputDecoration(labelText: 'Location'),
                  onSaved: (v) => _location = v,
                ),
                const SizedBox(height: 24),
                
                ElevatedButton(
                  onPressed: _isSaving ? null : _save,
                  child: _isSaving ? const CircularProgressIndicator() : const Text('Save Alert'),
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
