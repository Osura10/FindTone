import 'package:music_market/core/utils/app_logger.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:dio/dio.dart';
import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';

import '../providers/shop_provider.dart';
import '../../marketplace/providers/marketplace_provider.dart';
import '../models/price_check_model.dart';
import '../../../core/providers/catalog_provider.dart';
import '../../../core/utils/formatters.dart';

class CreatePostScreen extends StatefulWidget {
  final int? listingId;
  const CreatePostScreen({super.key, this.listingId});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final _formKey = GlobalKey<FormState>();
  final _priceController = TextEditingController();
  final _scrollController = ScrollController();
  final List<XFile> _images = [];
  late final bool _isEdit;
  bool _isLoadingEdit = false;
  List<dynamic> _existingImages = [];

  @override
  
  @override
  void initState() {
    super.initState();
    _isEdit = widget.listingId != null;
    if (_isEdit) {
      _isLoadingEdit = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _loadListing();
      });
    }
  }

  Future<void> _loadListing() async {
    try {
      final listing = await context.read<MarketplaceProvider>().getListingDetails(widget.listingId!);
      if (listing != null && mounted) {
        setState(() {
          _title = listing.title;
          _category = listing.category;
          _brand = listing.brand;
          _model = listing.model;
          _condition = listing.condition;
          _year = listing.year;
          _listingType = listing.listingType;
          _price = listing.price;
          _priceController.text = listing.price.toStringAsFixed(0);
          _description = listing.description;
          _location = listing.location;
          _lat = listing.latitude;
          _lng = listing.longitude;
          _existingImages = listing.images;
          _isLoadingEdit = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingEdit = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load listing: $e')));
      }
    }
  }

  @override
  void dispose() {
    _priceController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  String? _title;
  String? _category;
  String? _brand;
  String? _model;
  String? _condition;
  int? _year;
  String _listingType = 'Sell';
  double? _price;
  String? _description;

  String? _location;
  double? _lat;
  double? _lng;

  bool _isCheckingPrice = false;
  FairPriceResult? _priceVerdict;

  bool _isSubmitting = false;

Future<void> _pickImages() async {
    final picker = ImagePicker();
    final picked = await picker.pickMultiImage();
    if (picked.isNotEmpty) {
      setState(() {
        if (_images.length + _existingImages.length + picked.length <= 6) {
          _images.addAll(picked);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Max 6 images total allowed')));
        }
      });
    }
  }

  
  // removeExistingImage
  void _removeExistingImage(int index) {
    setState(() {
      _existingImages.removeAt(index);
    });
  }

  void _removeImage(int index) {
    setState(() {
      _images.removeAt(index);
    });
  }

  Future<void> _pickLocation() async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => const _LocationPickerDialog(),
    );

    if (result != null) {
      setState(() {
        _location = result['address'];
        _lat = result['lat'];
        _lng = result['lng'];
      });
    }
  }

  Future<void> _checkPrice() async {
    if (!_formKey.currentState!.validate()) return;
    _formKey.currentState!.save();
    
    setState(() => _isCheckingPrice = true);
    
    final data = {
      'Brand': _brand,
      'Model': _model,
      'Category': _category,
      'Condition': _condition,
      'Year': _year,
      'Price': _price,
      'Description': _description,
    };
    
    setState(() {
      _isCheckingPrice = false;
      _priceVerdict = null;
    });

    try {
      final result = await context.read<ShopProvider>().checkPrice(data);
      if (mounted) {
        setState(() {
          _priceVerdict = result;
        });
        Future.delayed(const Duration(milliseconds: 100), () {
          if (mounted && _scrollController.hasClients) {
            _scrollController.animateTo(
              _scrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOut,
            );
          }
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_images.isEmpty && _existingImages.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please add at least 1 image.')));
      return;
    }
    if (_location == null || _lat == null || _lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select a location.')));
      return;
    }

    _formKey.currentState!.save();
    
    setState(() => _isSubmitting = true);

    String progressText = "Uploading photos...";
    bool isDone = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return StatefulBuilder(builder: (context, setDialogState) {
          if (!isDone) {
            Future.delayed(const Duration(seconds: 5), () {
              if (mounted && !isDone) {
                setDialogState(() => progressText = "Checking fair price...");
              }
            });
            Future.delayed(const Duration(seconds: 35), () {
              if (mounted && !isDone) {
                setDialogState(() => progressText = "Checking trust (this may take a while)...");
              }
            });
          }
          return AlertDialog(
            content: Row(
              children: [
                const CircularProgressIndicator(),
                const SizedBox(width: 20),
                Expanded(child: Text(progressText)),
              ],
            ),
          );
        });
      },
    );

    final data = {
      'Title': _title,
      'Category': _category,
      'Brand': _brand,
      'Model': _model,
      'Condition': _condition,
      'Year': _year?.toString() ?? '',
      'ListingType': _listingType,
      'Price': _price.toString(),
      'Location': _location,
      'Latitude': _lat.toString(),
      'Longitude': _lng.toString(),
      'Description': _description,
    };

    try {
      
      bool success;
      if (_isEdit) {
        success = await context.read<ShopProvider>().updateListing(widget.listingId!, data, _images, _existingImages);
      } else {
        success = await context.read<ShopProvider>().createListing(data, _images);
      }

      isDone = true;
      if (mounted) {
        Navigator.pop(context); // close dialog
        setState(() => _isSubmitting = false);
        
        if (success) {
          final provider = context.read<ShopProvider>();
          final newListing = provider.myListings.isNotEmpty ? provider.myListings.first : null;
          final status = newListing?.status ?? 'PENDING';
          
          String message = _isEdit ? 'Listing updated successfully' : 'Listing created successfully. Status: $status';
          if (status == 'LIVE') {
            message = 'Success! Your listing is LIVE.';
          } else if (status == 'FLAGGED') {
            message = 'Under review. Your listing is FLAGGED for trust checks.';
          } else {
            message = 'Pending AI check. Your listing will be updated shortly.';
          }

          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
          Navigator.pop(context); // Go back to My Listings
        }
      }
    } catch (e) {
      isDone = true;
      if (mounted) {
        Navigator.pop(context); // close dialog
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingEdit) {
      return Scaffold(
        appBar: AppBar(title: const Text('Edit Post')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final catalog = context.watch<CatalogProvider>();
    
    return Scaffold(
      appBar: AppBar(
        title: Text(_isEdit ? 'Edit Listing' : 'Create Listing'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          controller: _scrollController,
          padding: const EdgeInsets.all(16),
          children: [
            // Images
            const Text('Photos (1-6)', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                itemCount: _existingImages.length + _images.length + 1,
                itemBuilder: (context, index) {
                  if (index == _existingImages.length + _images.length) {
                    if (_existingImages.length + _images.length >= 6) return const SizedBox();
                    return GestureDetector(
                      onTap: _pickImages,
                      child: Container(
                        width: 100,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(
                          color: Colors.grey[200],
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.grey),
                        ),
                        child: const Icon(Icons.add_a_photo, color: Colors.grey),
                      ),
                    );
                  }
                  
                  final isExisting = index < _existingImages.length;
                  final dynamic img = isExisting ? _existingImages[index] : _images[index - _existingImages.length];
                  
                  return Stack(
                    children: [
                      Container(
                        width: 100,
                        margin: const EdgeInsets.only(right: 8),
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: isExisting
                              ? Image.network(img.url, fit: BoxFit.cover)
                              : (kIsWeb ? Image.network(img.path, fit: BoxFit.cover) : Image.file(File(img.path), fit: BoxFit.cover)),
                        ),
                      ),
                      Positioned(
                        top: 4,
                        right: 12,
                        child: GestureDetector(
                          onTap: () => isExisting ? _removeExistingImage(index) : _removeImage(index - _existingImages.length),
                          child: const CircleAvatar(
                            radius: 12,
                            backgroundColor: Colors.red,
                            child: Icon(Icons.close, size: 16, color: Colors.white),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
            const SizedBox(height: 16),
            
            TextFormField(
              initialValue: _title,
              decoration: const InputDecoration(labelText: 'Title'),
              validator: (v) => v!.isEmpty ? 'Required' : null,
              onSaved: (v) => _title = v,
            ),
            const SizedBox(height: 16),
            
Autocomplete<String>(
              initialValue: TextEditingValue(text: _category ?? ''),
              optionsBuilder: (TextEditingValue textEditingValue) {
                if (textEditingValue.text.isEmpty) {
                  return catalog.categories;
                }
                return catalog.categories.where((String option) {
                  return option.toLowerCase().contains(textEditingValue.text.toLowerCase());
                });
              },
              onSelected: (String selection) {
                setState(() => _category = selection);
              },
              fieldViewBuilder: (context, controller, focusNode, onEditingComplete) {
                return TextFormField(
                  controller: controller,
                  focusNode: focusNode,
                  decoration: const InputDecoration(labelText: 'Category (e.g. Electric Guitar)'),
                  validator: (v) => v!.isEmpty ? 'Required' : null,
                  onChanged: (v) => _category = v,
                );
              },
            ),
            const SizedBox(height: 16),
            
            DropdownButtonFormField<String>(
              initialValue: _brand,
              decoration: const InputDecoration(labelText: 'Brand'),
              items: catalog.brands.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
              validator: (v) => v == null ? 'Required' : null,
              onChanged: (v) => setState(() => _brand = v),
            ),
            const SizedBox(height: 16),
            
            TextFormField(
              initialValue: _model,
              decoration: const InputDecoration(labelText: 'Model'),
              validator: (v) => v!.isEmpty ? 'Required' : null,
              onSaved: (v) => _model = v,
            ),
            const SizedBox(height: 16),

            DropdownButtonFormField<String>(
              initialValue: _condition,
              decoration: const InputDecoration(labelText: 'Condition'),
              items: ['new', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts']
                  .map((c) => DropdownMenuItem(value: c, child: Text(Formatters.condition(c))))
                  .toList(),
              validator: (v) => v == null ? 'Required' : null,
              onChanged: (v) => setState(() => _condition = v),
            ),
            const SizedBox(height: 16),

            TextFormField(
              initialValue: _year?.toString(),
              decoration: const InputDecoration(labelText: 'Year (optional)'),
              keyboardType: TextInputType.number,
              onSaved: (v) => _year = int.tryParse(v ?? ''),
            ),
            const SizedBox(height: 16),
            
            DropdownButtonFormField<String>(
              initialValue: _listingType,
              decoration: const InputDecoration(labelText: 'Listing Type'),
              items: const [
                DropdownMenuItem(value: 'Sell', child: Text('Sell')),
                DropdownMenuItem(value: 'Rent', child: Text('Rent')),
              ],
              onChanged: (v) => setState(() => _listingType = v!),
            ),
            const SizedBox(height: 16),

            TextFormField(
              controller: _priceController,
              decoration: const InputDecoration(labelText: 'Price (LKR)'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              validator: (v) => (double.tryParse(v ?? '') ?? 0) <= 0 ? 'Invalid price' : null,
              onSaved: (v) => _price = double.tryParse(v!),
              onChanged: (v) {
                if (_priceVerdict != null && v != _priceVerdict!.fairPrice.toStringAsFixed(0)) {
                  setState(() { _priceVerdict = null; });
                }
              },
            ),
            const SizedBox(height: 16),
            
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Location'),
              subtitle: Text(_location ?? 'Not selected'),
              trailing: const Icon(Icons.map),
              onTap: _pickLocation,
            ),
            const SizedBox(height: 16),

            TextFormField(
              initialValue: _description,
              decoration: const InputDecoration(labelText: 'Description'),
              maxLines: 4,
              validator: (v) => v!.isEmpty ? 'Required' : null,
              onSaved: (v) => _description = v,
            ),
            const SizedBox(height: 24),

            if (_priceVerdict != null) ...[
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF1E1E1E), // dark glass
                  borderRadius: BorderRadius.circular(12),
                  border: Border(left: BorderSide(color: Formatters.getVerdictColor(_priceVerdict!.verdict), width: 4)),
                  boxShadow: const [
                    BoxShadow(color: Colors.black26, blurRadius: 8, offset: Offset(0, 4)),
                  ],
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.analytics, color: Formatters.getVerdictColor(_priceVerdict!.verdict), size: 24),
                          const SizedBox(width: 8),
                          Text(
                            Formatters.getVerdictText(_priceVerdict!.verdict),
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Formatters.getVerdictColor(_priceVerdict!.verdict)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      Text('Your price: ${Formatters.price(_priceVerdict!.askingPrice)}', style: const TextStyle(fontSize: 16, color: Colors.white)),
                      const SizedBox(height: 4),
                      Text('Fair range: ${Formatters.price(_priceVerdict!.fairRange.min)} - ${Formatters.price(_priceVerdict!.fairRange.max)}', style: const TextStyle(fontSize: 14, color: Colors.white70)),
                      const SizedBox(height: 16),
                      Container(
                        height: 4,
                        decoration: BoxDecoration(
                          color: Colors.grey[800],
                          borderRadius: BorderRadius.circular(2),
                        ),
                        child: Row(
                          children: [
                            Expanded(child: Container(decoration: BoxDecoration(color: Formatters.getVerdictColor(_priceVerdict!.verdict), borderRadius: BorderRadius.circular(2)))),
                          ],
                        ),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(color: Colors.grey[800], borderRadius: BorderRadius.circular(4)),
                        child: Text(
                          _priceVerdict!.deviationPercent == 0 
                              ? 'Within fair range' 
                              : '${_priceVerdict!.deviationPercent.abs()}% ${_priceVerdict!.deviationPercent < 0 ? 'below' : 'above'} market',
                          style: const TextStyle(fontSize: 12, color: Colors.white),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(_priceVerdict!.explanation, style: const TextStyle(color: Colors.white, fontSize: 14)),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Text('Confidence: ${_priceVerdict!.confidence}', style: const TextStyle(color: Colors.white54, fontSize: 12)),
                          const Spacer(),
                          const Text('Agent 01 - Fair Price AI', style: TextStyle(color: Colors.white54, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _priceController.text == _priceVerdict!.fairPrice.toStringAsFixed(0) ? null : () {
                            setState(() {
                              _priceController.text = _priceVerdict!.fairPrice.toStringAsFixed(0);
                              _priceController.selection = TextSelection.fromPosition(TextPosition(offset: _priceController.text.length));
                            });
                            ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Price set to ${Formatters.price(_priceVerdict!.fairPrice)}')));
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Formatters.getVerdictColor(_priceVerdict!.verdict),
                            foregroundColor: Colors.white,
                          ),
                          child: Text(_priceController.text == _priceVerdict!.fairPrice.toStringAsFixed(0) ? '✓ Applied' : 'Use Suggested Price'),
                        ),
                      )
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
            ],

            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isCheckingPrice ? null : _checkPrice,
                    child: _isCheckingPrice ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator()) : const Text('Check Price'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    child: _isSubmitting ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator()) : Text(_isEdit ? 'Save Changes' : 'Submit'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _LocationPickerDialog extends StatefulWidget {
  const _LocationPickerDialog();

  @override
  State<_LocationPickerDialog> createState() => _LocationPickerDialogState();
}

class _LocationPickerDialogState extends State<_LocationPickerDialog> {
  final MapController _mapController = MapController();
  LatLng _center = const LatLng(6.9271, 79.8612); // Colombo
  String _address = 'Colombo, Sri Lanka';
  bool _isLoading = false;
  Timer? _debounce;
  final TextEditingController _searchController = TextEditingController();

  Future<void> _reverseGeocode(LatLng pos) async {
    setState(() => _isLoading = true);
    try {
      final dio = Dio();
      final response = await dio.get(
        'https://nominatim.openstreetmap.org/reverse',
        queryParameters: {'lat': pos.latitude, 'lon': pos.longitude, 'format': 'json'},
        options: Options(headers: {'User-Agent': 'MusicMarketApp/1.0'}),
      );
      if (response.statusCode == 200 && response.data != null) {
        setState(() {
          _address = response.data['display_name'] ?? 'Unknown location';
          _center = pos;
        });
      }
    } catch (e) {
      logDebug('Caught error:', e);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _search(String query) async {
    if (query.isEmpty) return;
    setState(() => _isLoading = true);
    try {
      final dio = Dio();
      final response = await dio.get(
        'https://nominatim.openstreetmap.org/search',
        queryParameters: {'q': query, 'format': 'json', 'limit': 1},
        options: Options(headers: {'User-Agent': 'MusicMarketApp/1.0'}),
      );
      if (response.statusCode == 200 && (response.data as List).isNotEmpty) {
        final data = response.data[0];
        final lat = double.parse(data['lat']);
        final lon = double.parse(data['lon']);
        final pos = LatLng(lat, lon);
        
        setState(() {
          _address = data['display_name'];
          _center = pos;
        });
        _mapController.move(pos, 15.0);
      }
    } catch (e) {
      logDebug('Caught error:', e);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _useMyLocation() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return;
      }
    }
    
    if (permission == LocationPermission.deniedForever) {
      return;
    }

    setState(() => _isLoading = true);
    final position = await Geolocator.getCurrentPosition();
    final pos = LatLng(position.latitude, position.longitude);
    _mapController.move(pos, 15.0);
    await _reverseGeocode(pos);
  }

  @override
  Widget build(BuildContext context) {

    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: const InputDecoration(
                      hintText: 'Search location...',
                      isDense: true,
                    ),
                    onChanged: (val) {
                      if (_debounce?.isActive ?? false) _debounce!.cancel();
                      _debounce = Timer(const Duration(seconds: 1), () {
                        _search(val);
                      });
                    },
                  ),
                ),
                IconButton(icon: const Icon(Icons.my_location), onPressed: _useMyLocation),
              ],
            ),
          ),
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _center,
                    initialZoom: 13.0,
                    onTap: (tapPos, latLng) => _reverseGeocode(latLng),
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                      userAgentPackageName: 'com.example.app',
                    ),
                    MarkerLayer(
                      markers: [
                        Marker(
                          point: _center,
                          width: 40,
                          height: 40,
                          child: const Icon(Icons.location_pin, color: Colors.red, size: 40),
                        ),
                      ],
                    ),
                  ],
                ),
                if (_isLoading)
                  const Center(child: CircularProgressIndicator()),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(_address, style: const TextStyle(fontWeight: FontWeight.bold), maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
                    ElevatedButton(
                      onPressed: () => Navigator.pop(context, {'address': _address, 'lat': _center.latitude, 'lng': _center.longitude}),
                      child: const Text('Select'),
                    ),
                  ],
                )
              ],
            ),
          ),
        ],
      ),
    );
  }
}
