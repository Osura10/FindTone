import 'dart:async';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

/// Short place name from a Nominatim answer, e.g. "Kollupitiya, Colombo".
String shortPlaceName(Map data) {
  final a = (data['address'] is Map) ? data['address'] as Map : const {};
  final place = a['suburb'] ?? a['neighbourhood'] ?? a['village'] ?? a['town'] ?? a['city_district'] ?? a['road'];
  final city = a['city'] ?? a['town'] ?? a['county'] ?? a['state_district'];
  final parts = <String>[];
  for (final p in [place, city]) {
    if (p != null && !parts.contains(p.toString())) parts.add(p.toString());
  }
  if (parts.isNotEmpty) return parts.join(', ');
  return (data['display_name'] ?? '').toString().split(',').take(2).join(',').trim();
}

/// ONE location section: search, map pin (tap the map), "current location" and an editable label.
/// Moving the pin fills the label using Nominatim reverse geocoding.
class LocationSection extends StatefulWidget {
  final LatLng? position;
  final ValueChanged<LatLng> onPositionChanged;
  final TextEditingController labelController;
  final ValueChanged<String>? onLabelChanged;

  /// Widget tests turn the map off (no network for tiles).
  final bool showMap;

  const LocationSection({
    super.key,
    required this.position,
    required this.onPositionChanged,
    required this.labelController,
    this.onLabelChanged,
    this.showMap = true,
  });

  @override
  State<LocationSection> createState() => _LocationSectionState();
}

class _LocationSectionState extends State<LocationSection> {
  static const _colombo = LatLng(6.9271, 79.8612);

  // Browsers do not allow setting User-Agent, so only native apps send one (Nominatim asks for it).
  final Dio _dio = Dio(BaseOptions(
    baseUrl: 'https://nominatim.openstreetmap.org',
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: kIsWeb ? null : {'User-Agent': 'FindTone-MusicMarket/1.0 (SLIIT student project)'},
  ));
  final MapController _mapController = MapController();
  final TextEditingController _search = TextEditingController();
  Timer? _debounce;
  List<Map> _results = [];
  bool _busy = false;
  String? _message;

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _setLabel(String value) {
    widget.labelController.text = value;
    widget.onLabelChanged?.call(value);
  }

  Future<void> _pick(LatLng pos) async {
    widget.onPositionChanged(pos);
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final res = await _dio.get('/reverse', queryParameters: {'format': 'json', 'zoom': 16, 'addressdetails': 1, 'lat': pos.latitude, 'lon': pos.longitude});
      final name = res.data is Map ? shortPlaceName(res.data as Map) : '';
      if (name.isNotEmpty) {
        _setLabel(name);
      } else {
        _message = 'Could not find a place name here. Please type the location.';
      }
    } catch (e) {
      _message = 'Could not look up this place. Please type the location.';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    if (value.trim().isEmpty) {
      setState(() => _results = []);
      return;
    }
    // Nominatim allows about 1 request per second, so wait until typing stops.
    _debounce = Timer(const Duration(milliseconds: 800), () async {
      setState(() {
        _busy = true;
        _message = null;
      });
      try {
        final res = await _dio.get('/search', queryParameters: {'format': 'json', 'addressdetails': 1, 'limit': 6, 'countrycodes': 'lk', 'q': value});
        _results = (res.data as List).whereType<Map>().toList();
        if (_results.isEmpty) _message = 'No places found. Try another name or tap the map.';
      } catch (e) {
        _message = 'Search failed. Tap the map instead.';
      } finally {
        if (mounted) setState(() => _busy = false);
      }
    });
  }

  void _choose(Map r) {
    final pos = LatLng(double.parse(r['lat'].toString()), double.parse(r['lon'].toString()));
    widget.onPositionChanged(pos);
    _setLabel(shortPlaceName(r));
    if (widget.showMap) _mapController.move(pos, 14);
    setState(() {
      _results = [];
      _search.clear();
    });
  }

  Future<void> _useMyLocation() async {
    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        setState(() => _message = 'Location is turned off. Tap the map instead.');
        return;
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        setState(() => _message = 'Location permission denied. Tap the map instead.');
        return;
      }
      final p = await Geolocator.getCurrentPosition();
      final pos = LatLng(p.latitude, p.longitude);
      if (widget.showMap) _mapController.move(pos, 15);
      await _pick(pos);
    } catch (e) {
      setState(() => _message = 'Could not get your location. Tap the map instead.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final pos = widget.position;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: _search,
                decoration: const InputDecoration(hintText: 'Search a town or area...', isDense: true, prefixIcon: Icon(Icons.search)),
                onChanged: _onSearchChanged,
              ),
            ),
            IconButton(tooltip: 'Current location', icon: const Icon(Icons.my_location), onPressed: _useMyLocation),
          ],
        ),
        for (final r in _results)
          ListTile(dense: true, leading: const Icon(Icons.place_outlined), title: Text(r['display_name']?.toString() ?? ''), onTap: () => _choose(r)),
        const SizedBox(height: 8),
        if (widget.showMap)
          SizedBox(
            height: 240,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: FlutterMap(
                mapController: _mapController,
                options: MapOptions(initialCenter: pos ?? _colombo, initialZoom: pos != null ? 14 : 12, onTap: (_, latLng) => _pick(latLng)),
                children: [
                  TileLayer(urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', userAgentPackageName: 'com.findtone.music_market'),
                  if (pos != null)
                    MarkerLayer(markers: [
                      Marker(point: pos, width: 40, height: 40, child: const Icon(Icons.location_pin, color: Colors.red, size: 40)),
                    ]),
                  const RichAttributionWidget(attributions: [TextSourceAttribution('© OpenStreetMap contributors')]),
                ],
              ),
            ),
          ),
        const SizedBox(height: 8),
        TextFormField(
          key: const ValueKey('location-label'),
          controller: widget.labelController,
          decoration: InputDecoration(
            labelText: 'Location name',
            hintText: pos == null ? 'Tap the map to drop a pin' : null,
            prefixIcon: const Icon(Icons.place),
            suffixIcon: _busy ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))) : null,
          ),
          onChanged: widget.onLabelChanged,
          validator: (v) => (v ?? '').trim().isEmpty ? 'Please enter a location name' : null,
        ),
        if (_message != null)
          Padding(padding: const EdgeInsets.only(top: 4), child: Text(_message!, style: const TextStyle(color: Colors.amber, fontSize: 12))),
      ],
    );
  }
}
