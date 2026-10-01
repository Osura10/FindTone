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
      messenger.showSnackBar(SnackBar(
        duration: const Duration(seconds: 6),
        content: Text('${_isEdit ? 'Listing updated' : 'Listing created'}.${aiRan ? ' ${_aiSummary(result)}' : ''}'),
      ));
      _leave(true);
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(e)), backgroundColor: Colors.red));
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
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Leave', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    return leave ?? false;
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  Widget _photoTile({required Widget image, required VoidCallback onRemove, bool isNew = false}) => Stack(
        children: [
          Container(
            width: 100,
            height: 100,
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: isNew && _isEdit ? Border.all(color: Colors.purpleAccent, width: 2) : null),
            child: ClipRRect(borderRadius: BorderRadius.circular(8), child: image),
          ),
          Positioned(
            top: 4,
            right: 12,
            child: Semantics(
              button: true,
              label: 'Remove photo',
              child: InkWell(
                onTap: onRemove,
                child: const CircleAvatar(radius: 12, backgroundColor: Colors.red, child: Icon(Icons.close, size: 16, color: Colors.white)),
              ),
            ),
          ),
        ],
      );

  Widget _buildPhotos() {
    final kept = _keptImages;
    return SizedBox(
      height: 100,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          for (final img in kept)
            _photoTile(
              image: AppNetworkImage(imageUrl: img.url, isThumbnail: true),
              onRemove: () => setState(() => _removedImageIds.add(img.id)),
            ),
          for (final file in _newPhotos)
            _photoTile(
              isNew: true,
              image: FutureBuilder<Uint8List>(
                future: _previews.putIfAbsent(file.path, file.readAsBytes),
                builder: (context, snap) => snap.hasData
                    ? Image.memory(snap.data!, fit: BoxFit.cover)
                    : const Center(child: CircularProgressIndicator(strokeWidth: 2)),
              ),
              onRemove: () => setState(() => _newPhotos.remove(file)),
            ),
          if (_photoCount < _maxPhotos)
            Semantics(
              button: true,
              label: 'Add photos',
              child: InkWell(
                key: const ValueKey('add-photos'),
                onTap: _pickImages,
                child: Container(
                  width: 100,
                  decoration: BoxDecoration(color: Colors.white10, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey)),
                  child: const Icon(Icons.add_a_photo, color: Colors.grey),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPriceResult() {
    final r = _priceResult!;
    final color = Formatters.getVerdictColor(r.verdict);
    final hasRange = r.fairPrice > 0;
    final suggested = r.fairPrice.toStringAsFixed(0);
    return Card(
      key: const ValueKey('price-check-result'),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: color)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(children: [
              Icon(Icons.analytics, color: color),
              const SizedBox(width: 8),
              Text(Formatters.getVerdictText(r.verdict), style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: color)),
            ]),
            const SizedBox(height: 12),
            if (hasRange) ...[
              Text('Fair range: ${Formatters.price(r.fairRange.min)} – ${Formatters.price(r.fairRange.max)}'),
              Text('Suggested price: ${Formatters.price(r.fairPrice)}', style: const TextStyle(fontWeight: FontWeight.bold)),
            ] else
              const Text('No reference price was found for this item.'),
            if (r.explanation.isNotEmpty) ...[const SizedBox(height: 8), Text(r.explanation)],
            if (hasRange) ...[
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  key: const ValueKey('use-suggested-price'),
                  onPressed: _price.text == suggested ? null : () => setState(() => _price.text = suggested),
                  child: Text(_price.text == suggested ? '✓ Suggested price used' : 'Use Suggested Price'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _isEdit ? 'Edit Listing' : 'Create Listing';

    if (_loading) {
      return Scaffold(appBar: AppBar(title: Text(title)), body: const Center(child: CircularProgressIndicator()));
    }
    if (_loadError != null) {
      return Scaffold(appBar: AppBar(title: Text(title)), body: ErrorView(message: _loadError!, onRetry: _loadListing));
    }
    final myId = context.watch<AuthProvider>().userId;
    if (_isEdit && (_status == 'SOLD' || (myId != null && _sellerId != null && myId != _sellerId))) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: EmptyState(
          icon: Icons.lock_outline,
          message: _status == 'SOLD' ? 'This item is sold, so it cannot be edited.' : 'You can only edit your own listings.',
        ),
      );
    }

    final catalog = context.watch<CatalogProvider>();
    final dirty = _isDirty;
    String? required(String? v) => cleanText(v).isEmpty ? 'Required' : null;

    return PopScope(
      canPop: !dirty || _saved || _submitting,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        if (await _confirmLeave()) _leave(false);
      },
      child: Scaffold(
        appBar: AppBar(title: Text(title)),
        body: Form(
          key: _formKey,
          onChanged: () => setState(() {}),
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Photos ($_photoCount/$_maxPhotos)', style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              _buildPhotos(),
              const SizedBox(height: 16),
              TextFormField(key: const ValueKey('f-title'), controller: _title, decoration: const InputDecoration(labelText: 'Title'), validator: required, maxLength: 120),
              SuggestionField(controller: _category, label: 'Category', hint: 'e.g. Electric Guitar, Sitar, Ukulele', suggestions: catalog.categories, validator: required, onChanged: (_) => setState(() {})),
              const SizedBox(height: 16),
              SuggestionField(controller: _brand, label: 'Brand', hint: 'e.g. Yamaha, any brand', suggestions: catalog.brands, validator: required, onChanged: (_) => setState(() {})),
              const SizedBox(height: 16),
              TextFormField(key: const ValueKey('f-model'), controller: _model, decoration: const InputDecoration(labelText: 'Model'), validator: required),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                key: const ValueKey('f-condition'),
                initialValue: _condition,
                decoration: const InputDecoration(labelText: 'Condition'),
                items: ['new', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts']
                    .map((c) => DropdownMenuItem(value: c, child: Text(Formatters.condition(c))))
                    .toList(),
                onChanged: (v) => setState(() => _condition = v ?? _condition),
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('f-year'),
                controller: _year,
                decoration: const InputDecoration(labelText: 'Year (optional)'),
                keyboardType: TextInputType.number,
                validator: (v) {
                  if ((v ?? '').trim().isEmpty) return null;
                  final y = int.tryParse(v!.trim());
                  final max = DateTime.now().year + 1;
                  return y == null || y < 1900 || y > max ? 'Year must be between 1900 and $max' : null;
                },
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                key: const ValueKey('f-type'),
                initialValue: _listingType,
                decoration: const InputDecoration(labelText: 'Listing Type'),
                items: const [
                  DropdownMenuItem(value: 'Sell', child: Text('Sell')),
                  DropdownMenuItem(value: 'Trade', child: Text('Trade')),
                  DropdownMenuItem(value: 'Rent', child: Text('Rent')),
                ],
                onChanged: (v) => setState(() => _listingType = v ?? _listingType),
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('f-price'),
                controller: _price,
                decoration: const InputDecoration(labelText: 'Price (LKR)'),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                validator: (v) => (double.tryParse((v ?? '').trim()) ?? 0) <= 0 ? 'Price must be greater than 0' : null,
              ),
              const SizedBox(height: 8),
              // Check Price: same style as the submit button, with a spinner while the AI works.
              SizedBox(
                height: 48,
                child: ElevatedButton.icon(
                  key: const ValueKey('check-price'),
                  onPressed: _checkingPrice ? null : _checkPrice,
                  icon: _checkingPrice
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.trending_up),
                  label: Text(_checkingPrice ? 'Checking the market price…' : 'Check Price'),
                ),
              ),
              if (_priceError != null) Padding(padding: const EdgeInsets.only(top: 8), child: Text(_priceError!, style: const TextStyle(color: Colors.redAccent))),
              if (_priceResult != null) ...[const SizedBox(height: 12), _buildPriceResult()],
              const SizedBox(height: 16),
              const Text('Location', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              LocationSection(
                showMap: widget.showMap,
                position: _position,
                labelController: _location,
                onPositionChanged: (p) => setState(() => _position = p),
                onLabelChanged: (_) => setState(() {}),
              ),
              const SizedBox(height: 16),
              TextFormField(
                key: const ValueKey('f-description'),
                controller: _description,
                decoration: const InputDecoration(labelText: 'Description'),
                maxLines: 4,
                validator: (v) => !_isEdit && (v ?? '').trim().isEmpty ? 'Required' : null,
              ),
              const SizedBox(height: 24),
              if (_submitting)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Text(
                    'Saving${(!_isEdit || _photosChanged || _changes.keys.any(aiFieldNames.contains)) ? ' and running the AI price and trust checks – this can take up to 2 minutes' : ''}…',
                    textAlign: TextAlign.center,
                  ),
                ),
              SizedBox(
                height: 48,
                child: ElevatedButton.icon(
                  key: const ValueKey('submit-listing'),
                  onPressed: _submitting || (_isEdit && !dirty) ? null : _submit,
                  icon: _submitting
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : Icon(_isEdit ? Icons.save : Icons.add),
                  label: Text(_isEdit ? 'Save Changes' : 'Create Post'),
                ),
              ),
              if (_isEdit && !dirty)
                const Padding(padding: EdgeInsets.only(top: 8), child: Text('Change something to enable Save.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey))),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
