import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_exceptions.dart';
import '../../../core/providers/catalog_provider.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/app_network_image.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/location_section.dart';
import '../../../core/widgets/suggestion_field.dart';
import '../../auth/providers/auth_provider.dart';
import '../../marketplace/models/listing_model.dart';
import '../models/listing_form.dart';
import '../models/price_check_model.dart';
import '../providers/shop_provider.dart';
import '../../../core/theme/app_theme.dart';

const _maxPhotos = 6;
const _maxPhotoBytes = 5 * 1024 * 1024;
const _photoExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

/// Create a listing, or edit one when [listingId] is given (route /shop/edit/:id).
/// Edit mode pre-fills every field and sends ONLY the changed fields.
class CreatePostScreen extends StatefulWidget {
  final int? listingId;

  /// Widget tests turn the map off (no network for map tiles).
  final bool showMap;

  const CreatePostScreen({super.key, this.listingId, this.showMap = true});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _category = TextEditingController();
  final _brand = TextEditingController();
  final _model = TextEditingController();
  final _year = TextEditingController();
  final _price = TextEditingController();
  final _location = TextEditingController();
  final _description = TextEditingController();
  String _condition = 'good';
  String _listingType = 'Sell';
  LatLng? _position;

  ListingFormValues? _original;
  String _status = '';
  int? _sellerId;
  List<ListingImage> _existingImages = [];
  final Set<int> _removedImageIds = {};
  final List<XFile> _newPhotos = [];
  final Map<String, Future<Uint8List>> _previews = {};

  bool _loading = false;
  String? _loadError;
  bool _submitting = false;
  bool _saved = false;
  bool _checkingPrice = false;
  FairPriceResult? _priceResult;
  String? _priceError;

  bool get _isEdit => widget.listingId != null;

  @override
  void initState() {
    super.initState();
    if (_isEdit) {
      _loading = true;
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadListing());
    }
  }

  @override
  void dispose() {
    for (final c in [_title, _category, _brand, _model, _year, _price, _location, _description]) {
      c.dispose();
    }
    super.dispose();
  }

  // ── Loading (edit) ──────────────────────────────────────────────────────────

  Future<void> _loadListing() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final listing = await context.read<ShopProvider>().getOwnerListing(widget.listingId!);
      if (!mounted) return;
      final values = ListingFormValues.fromListing(listing);
      // Controllers (not initialValue) so the text appears after the data arrives.
      _title.text = values.title;
      _category.text = values.category;
      _brand.text = values.brand;
      _model.text = values.model;
      _year.text = values.year;
      _price.text = values.price;
      _location.text = values.location;
      _description.text = values.description;
      setState(() {
        _condition = values.condition;
        _listingType = values.listingType;
        _position = values.latitude != null && values.longitude != null ? LatLng(values.latitude!, values.longitude!) : null;
        _original = values;
        _existingImages = listing.images;
        _status = listing.status;
        _sellerId = listing.sellerId;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = describeError(e, 'Could not load the listing.');
        _loading = false;
      });
    }
  }

  // ── Change tracking ────────────────────────────────────────────────────────

  ListingFormValues get _values => ListingFormValues(
    title: _title.text,
    category: _category.text,
    brand: _brand.text,
    model: _model.text,
    condition: _condition,
    year: _year.text,
    listingType: _listingType,
    price: _price.text,
    location: _location.text,
    description: _description.text,
    latitude: _position?.latitude,
    longitude: _position?.longitude,
  );

  Map<String, String> get _changes => _isEdit && _original != null ? changedListingFields(_original!, _values) : const {};

  bool get _photosChanged => _removedImageIds.isNotEmpty || _newPhotos.isNotEmpty;

  bool get _isDirty {
    if (_isEdit) return _changes.isNotEmpty || _photosChanged;
    final v = _values;
    return [v.title, v.category, v.brand, v.model, v.year, v.price, v.location, v.description].any((t) => t.trim().isNotEmpty) ||
        _newPhotos.isNotEmpty ||
        _position != null;
  }

  List<ListingImage> get _keptImages => _existingImages.where((i) => !_removedImageIds.contains(i.id)).toList();
  int get _photoCount => _keptImages.length + _newPhotos.length;

  // ── Photos ─────────────────────────────────────────────────────────────────

  Future<void> _pickImages() async {
    final messenger = ScaffoldMessenger.of(context);
    try {
      final picked = await ImagePicker().pickMultiImage();
      if (picked.isEmpty) return;
      if (_photoCount + picked.length > _maxPhotos) {
        messenger.showSnackBar(const SnackBar(content: Text('You can have at most $_maxPhotos photos.')));
        return;
      }
      for (final file in picked) {
        final name = file.name.toLowerCase();
        if (!_photoExtensions.any(name.endsWith)) {
          messenger.showSnackBar(SnackBar(content: Text('"${file.name}" is not a JPG, PNG or WebP image.')));
          return;
        }
        if (await file.length() > _maxPhotoBytes) {
          messenger.showSnackBar(SnackBar(content: Text('"${file.name}" is larger than 5 MB.')));
          return;
        }
      }
      setState(() => _newPhotos.addAll(picked));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text('Could not open the photos: ${describeError(e)}')));
    }
  }

  // ── Price check ────────────────────────────────────────────────────────────

  Future<void> _checkPrice() async {
    final v = _values;
    if (cleanText(v.category).isEmpty || cleanText(v.brand).isEmpty || cleanText(v.model).isEmpty) {
      setState(() => _priceError = 'Fill in Category, Brand and Model first.');
      return;
    }
    setState(() {
      _checkingPrice = true;
      _priceError = null;
      _priceResult = null;
    });
    try {
      final result = await context.read<ShopProvider>().checkPrice({
        'brand': cleanText(v.brand),
        'model': cleanText(v.model),
        'category': cleanText(v.category),
        'condition': v.condition,
        'year': int.tryParse(v.year),
        'price': double.tryParse(v.price) ?? 0,
        'description': v.description.trim(),
      });
      if (mounted) setState(() => _priceResult = result);
    } catch (e) {
      if (mounted) setState(() => _priceError = describeError(e, 'Price check failed.'));
    } finally {
      if (mounted) setState(() => _checkingPrice = false);
    }
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  String? _extraValidation() {
    if (_photoCount < 1) return 'Please add at least 1 photo.';
    if (_photoCount > _maxPhotos) return 'You can have at most $_maxPhotos photos.';
    if (_position == null) return 'Please tap the map to drop a pin for the location.';
    return null;
  }

  String _aiSummary(ListingDetail d) {
    final parts = ['Status: ${d.status}'];
    if (d.trustScore != null) parts.add('Trust ${d.trustScore}/100');
    if (d.priceVerdict != null) parts.add('Price: ${Formatters.getVerdictText(d.priceVerdict)}');
    return parts.join(' · ');
  }

  Future<void> _submit() async {
    if (_submitting) return;
    final formOk = _formKey.currentState?.validate() ?? false;
    final problem = _extraValidation();
    if (!formOk || problem != null) {
      if (problem != null) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(problem)));
      return;
    }
    if (_isEdit && !_isDirty) return;

    final shop = context.read<ShopProvider>();
    final messenger = ScaffoldMessenger.of(context);
    final changes = _changes;
    final aiRan = !_isEdit || _photosChanged || changes.keys.any(aiFieldNames.contains);
    setState(() => _submitting = true);
    try {
      final result = _isEdit
          ? await shop.updateListing(widget.listingId!, changes, _removedImageIds.toList(), _newPhotos)
          : await shop.createListing(_values.toCreateFields(), _newPhotos);
      messenger.showSnackBar(
        SnackBar(
          duration: const Duration(seconds: 6),
          content: Text('${_isEdit ? 'Listing updated' : 'Listing created'}.${aiRan ? ' ${_aiSummary(result)}' : ''}'),
        ),
      );
      _leave(true);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(e))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Close the screen. PopScope reads canPop at build time, so rebuild first, then pop.
  void _leave(bool result) {
    if (!mounted) return;
    setState(() => _saved = true);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final navigator = Navigator.of(context);
      if (navigator.canPop()) {
        navigator.pop(result);
      } else {
        GoRouter.maybeOf(context)?.go('/');
      }
    });
  }

  Future<bool> _confirmLeave() async {
    final leave = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Leave without saving?'),
        content: const Text('Your changes will be lost.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Stay')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Leave', style: TextStyle(color: Theme.of(ctx).colorScheme.error)),
          ),
        ],
      ),
    );
    return leave ?? false;
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  Widget _photoTile({required Widget image, required VoidCallback onRemove, bool isNew = false, bool cover = false}) => Stack(
    fit: StackFit.expand,
    children: [
      Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: isNew && _isEdit ? Border.all(color: context.scheme.primary, width: 2) : null,
        ),
        child: ClipRRect(borderRadius: BorderRadius.circular(AppRadius.md), child: image),
      ),
      if (cover)
        Positioned(
          left: 6,
          bottom: 6,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.6), borderRadius: BorderRadius.circular(AppRadius.full)),
            child: const Text(
              'Cover',
              style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.w700),
            ),
          ),
        ),
      Positioned(
        top: 4,
        right: 4,
        child: Semantics(
          button: true,
          label: 'Remove photo',
          child: InkWell(
            onTap: onRemove,
            customBorder: const CircleBorder(),
            child: CircleAvatar(
              radius: 13,
              backgroundColor: Colors.black.withValues(alpha: 0.65),
              child: const Icon(Icons.close_rounded, size: 16, color: Colors.white),
            ),
          ),
        ),
      ),
    ],
  );

  /// Photo grid picker: existing photos, new photos (outlined in edit mode) and an "Add" tile.
  Widget _buildPhotos() {
    final kept = _keptImages;
    final c = context.colors;
    final tiles = <Widget>[
      for (var i = 0; i < kept.length; i++)
        _photoTile(
          cover: i == 0,
          image: AppNetworkImage(imageUrl: kept[i].url, isThumbnail: true),
          onRemove: () => setState(() => _removedImageIds.add(kept[i].id)),
        ),
      for (var i = 0; i < _newPhotos.length; i++)
        _photoTile(
          isNew: true,
          cover: kept.isEmpty && i == 0,
          image: FutureBuilder<Uint8List>(
            future: _previews.putIfAbsent(_newPhotos[i].path, _newPhotos[i].readAsBytes),
            builder: (context, snap) => snap.hasData
                ? Image.memory(snap.data!, fit: BoxFit.cover)
                : const Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))),
          ),
          onRemove: () => setState(() => _newPhotos.remove(_newPhotos[i])),
        ),
      if (_photoCount < _maxPhotos)
        Semantics(
          button: true,
          label: 'Add photos',
          child: InkWell(
            key: const ValueKey('add-photos'),
            onTap: _pickImages,
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: DottedBox(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.add_a_photo_outlined, color: c.primaryText),
                  const SizedBox(height: 4),
                  Text(
                    _photoCount == 0 ? 'Add photos' : 'Add',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: c.primaryText),
                  ),
                ],
              ),
            ),
          ),
        ),
    ];
    return LayoutBuilder(
      builder: (context, box) {
        final columns = box.maxWidth >= 520 ? 4 : 3;
        return GridView.count(
          crossAxisCount: columns,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: AppSpacing.sm,
          crossAxisSpacing: AppSpacing.sm,
          children: tiles,
        );
      },
    );
  }

  Widget _buildPriceResult() {
    final r = _priceResult!;
    final c = context.colors;
    final hasRange = r.fairPrice > 0;
    final suggested = r.fairPrice.toStringAsFixed(0);
    return Container(
      key: const ValueKey('price-check-result'),
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(color: c.primarySoft, borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.auto_awesome, size: 18, color: c.primaryText),
              const SizedBox(width: 6),
              const Expanded(
                child: Text('AI price analysis', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
              VerdictChip(verdict: r.verdict),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (hasRange) ...[
            Text('Fair range: ${Formatters.price(r.fairRange.min)} – ${Formatters.price(r.fairRange.max)}'),
            const SizedBox(height: 2),
            Text(
              'Suggested price: ${Formatters.price(r.fairPrice)}',
              style: TextStyle(fontWeight: FontWeight.w700, color: c.primaryText),
            ),
          ] else
            const Text('No reference price was found for this item.'),
          if (r.explanation.isNotEmpty) ...[const SizedBox(height: AppSpacing.sm), Text(r.explanation, style: context.text.bodySmall?.copyWith(height: 1.45))],
          if (hasRange) ...[
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonal(
                key: const ValueKey('use-suggested-price'),
                onPressed: _price.text == suggested ? null : () => setState(() => _price.text = suggested),
                child: Text(_price.text == suggested ? '✓ Suggested price used' : 'Use Suggested Price'),
              ),
            ),
          ],
        ],
      ),
    );
  }

  /// A numbered form section in a card.
  Widget _section(int number, String title, String? hint, List<Widget> children, {bool done = false}) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.lg),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Own semantics node: read as a heading, not merged into the first field's label.
            Semantics(
              container: true,
              header: true,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ExcludeSemantics(
                    child: Container(
                      width: 28,
                      height: 28,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: done ? c.success : c.primarySoft, shape: BoxShape.circle),
                      child: done
                          ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                          : Text(
                              '$number',
                              style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: c.primaryText),
                            ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: context.text.titleMedium),
                        if (hint != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(hint, style: context.text.bodySmall),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            ...children,
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _isEdit ? 'Edit Listing' : 'Create Listing';

    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: const ShimmerLoader.list(count: 4, rowHeight: 160),
      );
    }
    if (_loadError != null) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: ErrorState(message: _loadError!, onRetry: _loadListing),
      );
    }
    final myId = context.watch<AuthProvider>().userId;
    if (_isEdit && (_status == 'SOLD' || (myId != null && _sellerId != null && myId != _sellerId))) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: EmptyState(
          icon: Icons.lock_outline,
          title: _status == 'SOLD' ? 'This item is sold' : 'Not your listing',
          message: _status == 'SOLD' ? 'This item is sold, so it cannot be edited.' : 'You can only edit your own listings.',
        ),
      );
    }

    final catalog = context.watch<CatalogProvider>();
    final dirty = _isDirty;
    final c = context.colors;
    String? required(String? v) => cleanText(v).isEmpty ? 'Required' : null;
    final detailsDone = [_title, _category, _brand, _model].every((ctl) => cleanText(ctl.text).isNotEmpty);
    final priceDone = (double.tryParse(_price.text.trim()) ?? 0) > 0;

    return PopScope(
      canPop: !dirty || _saved || _submitting,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmLeave()) _leave(false);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(title),
          actions: [
            if (_isEdit && _status.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(right: AppSpacing.md),
                child: StatusChip(status: _status),
              ),
          ],
        ),
        body: Form(
          key: _formKey,
          onChanged: () => setState(() {}),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.sm, AppSpacing.page, AppSpacing.xl),
            children: [
              if (_isEdit)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpacing.lg),
                  child: InlineNotice(message: 'Change only what you need – only changed fields are saved.', tone: NoticeTone.info),
                ),
              _section(1, 'Photos ($_photoCount/$_maxPhotos)', 'JPG, PNG or WebP up to 5 MB. The first photo is the cover.', [
                _buildPhotos(),
              ], done: _photoCount > 0),
              _section(2, 'Details', 'What are you selling?', [
                TextFormField(
                  key: const ValueKey('f-title'),
                  controller: _title,
                  decoration: const InputDecoration(labelText: 'Title', hintText: 'e.g. Fender Player Stratocaster'),
                  validator: required,
                  maxLength: 120,
                ),
                const SizedBox(height: AppSpacing.sm),
                SuggestionField(
                  controller: _category,
                  label: 'Category',
                  hint: 'e.g. Electric Guitar, Sitar, Ukulele',
                  suggestions: catalog.categories,
                  validator: required,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: AppSpacing.lg),
                SuggestionField(
                  controller: _brand,
                  label: 'Brand',
                  hint: 'e.g. Yamaha, any brand',
                  suggestions: catalog.brands,
                  validator: required,
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: AppSpacing.lg),
                TextFormField(
                  key: const ValueKey('f-model'),
                  controller: _model,
                  decoration: const InputDecoration(labelText: 'Model', hintText: 'e.g. F310'),
                  validator: required,
                ),
                const SizedBox(height: AppSpacing.lg),
                DropdownButtonFormField<String>(
                  style: Theme.of(context).textTheme.bodyLarge,
                  key: const ValueKey('f-condition'),
                  initialValue: _condition,
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: 'Condition'),
                  items: [
                    'new',
                    'like_new',
                    'excellent',
                    'good',
                    'fair',
                    'poor',
                    'for_parts',
                  ].map((c) => DropdownMenuItem(value: c, child: Text(Formatters.condition(c)))).toList(),
                  onChanged: (v) => setState(() => _condition = v ?? _condition),
                ),
                const SizedBox(height: AppSpacing.lg),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        key: const ValueKey('f-year'),
                        controller: _year,
                        decoration: const InputDecoration(labelText: 'Year', hintText: 'Optional'),
                        keyboardType: TextInputType.number,
                        validator: (v) {
                          if ((v ?? '').trim().isEmpty) return null;
                          final y = int.tryParse(v!.trim());
                          final max = DateTime.now().year + 1;
                          return y == null || y < 1900 || y > max ? 'Year must be between 1900 and $max' : null;
                        },
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        style: Theme.of(context).textTheme.bodyLarge,
                        key: const ValueKey('f-type'),
                        initialValue: _listingType,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Listing Type'),
                        items: const [
                          DropdownMenuItem(value: 'Sell', child: Text('Sell')),
                          DropdownMenuItem(value: 'Trade', child: Text('Trade')),
                          DropdownMenuItem(value: 'Rent', child: Text('Rent')),
                        ],
                        onChanged: (v) => setState(() => _listingType = v ?? _listingType),
                      ),
                    ),
                  ],
                ),
              ], done: detailsDone),
              _section(3, 'Price', 'Not sure? Let the AI check the market price.', [
                TextFormField(
                  key: const ValueKey('f-price'),
                  controller: _price,
                  decoration: const InputDecoration(labelText: 'Price (LKR)', prefixText: 'LKR '),
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  validator: (v) => (double.tryParse((v ?? '').trim()) ?? 0) <= 0 ? 'Price must be greater than 0' : null,
                ),
                const SizedBox(height: AppSpacing.md),
                // Check Price: shows a spinner while the AI works.
                SizedBox(
                  height: 48,
                  child: OutlinedButton.icon(
                    key: const ValueKey('check-price'),
                    onPressed: _checkingPrice ? null : _checkPrice,
                    icon: _checkingPrice
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.trending_up_rounded),
                    label: Text(_checkingPrice ? 'Checking the market price…' : 'Check Price'),
                  ),
                ),
                if (_priceError != null)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpacing.sm),
                    child: InlineNotice(message: _priceError!, tone: NoticeTone.error),
                  ),
                if (_priceResult != null) ...[const SizedBox(height: AppSpacing.md), _buildPriceResult()],
              ], done: priceDone),
              _section(4, 'Location', 'Where can buyers see or collect it?', [
                LocationSection(
                  showMap: widget.showMap,
                  position: _position,
                  labelController: _location,
                  onPositionChanged: (p) => setState(() => _position = p),
                  onLabelChanged: (_) => setState(() {}),
                ),
              ], done: _position != null && cleanText(_location.text).isNotEmpty),
              _section(5, 'Description', 'Accessories, history, repairs and current condition.', [
                TextFormField(
                  key: const ValueKey('f-description'),
                  controller: _description,
                  decoration: const InputDecoration(labelText: 'Description', alignLabelWithHint: true),
                  maxLines: 5,
                  validator: (v) => !_isEdit && (v ?? '').trim().isEmpty ? 'Required' : null,
                ),
              ], done: _description.text.trim().isNotEmpty),
            ],
          ),
        ),
        // Sticky save bar
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            color: context.scheme.surface,
            border: Border(top: BorderSide(color: c.border)),
          ),
          child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.md, AppSpacing.page, AppSpacing.md),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_submitting)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Text(
                        'Saving${(!_isEdit || _photosChanged || _changes.keys.any(aiFieldNames.contains)) ? ' and running the AI price and trust checks – this can take up to 2 minutes' : ''}…',
                        textAlign: TextAlign.center,
                        style: context.text.bodySmall,
                      ),
                    )
                  else if (_isEdit && !dirty)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Text('Change something to enable Save.', textAlign: TextAlign.center, style: context.text.bodySmall),
                    ),
                  SizedBox(
                    height: 52,
                    child: FilledButton.icon(
                      key: const ValueKey('submit-listing'),
                      onPressed: _submitting || (_isEdit && !dirty) ? null : _submit,
                      icon: _submitting
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Icon(_isEdit ? Icons.save_outlined : Icons.add_rounded),
                      label: Text(_isEdit ? 'Save Changes' : 'Create Post'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Rounded box with a dashed-look border for the "Add photos" tile.
class DottedBox extends StatelessWidget {
  final Widget child;
  const DottedBox({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.primarySoft.withValues(alpha: c.primarySoft.a * 0.5),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: context.scheme.primary.withValues(alpha: 0.5), width: 1.5),
      ),
      child: Center(child: child),
    );
  }
}
