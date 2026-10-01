import '../../marketplace/models/listing_model.dart';

/// Trim and collapse inner spaces (same rule as the web and the backend).
String cleanText(String? value) => (value ?? '').trim().replaceAll(RegExp(r'\s+'), ' ');

/// Plain values of the create/edit listing form (no Flutter types, easy to test).
class ListingFormValues {
  final String title;
  final String category;
  final String brand;
  final String model;
  final String condition;
  final String year;
  final String listingType;
  final String price;
  final String location;
  final String description;
  final double? latitude;
  final double? longitude;

  const ListingFormValues({
    this.title = '',
    this.category = '',
    this.brand = '',
    this.model = '',
    this.condition = 'good',
    this.year = '',
    this.listingType = 'Sell',
    this.price = '',
    this.location = '',
    this.description = '',
    this.latitude,
    this.longitude,
  });

  factory ListingFormValues.fromListing(ListingDetail l) => ListingFormValues(
        title: l.title,
        category: l.category,
        brand: l.brand,
        model: l.model,
        condition: l.condition.isEmpty ? 'good' : l.condition,
        year: l.year?.toString() ?? '',
        listingType: l.listingType.isEmpty ? 'Sell' : l.listingType,
        price: _plainNumber(l.price),
        location: l.location,
        description: l.description,
        latitude: l.latitude,
        longitude: l.longitude,
      );

  /// "45000" instead of "45000.0" so the price field looks like what the user typed.
  static String _plainNumber(double v) => v == v.roundToDouble() ? v.toStringAsFixed(0) : v.toString();

  /// Backend multipart name -> form value.
  Map<String, String> get _textFields => {
        'Title': cleanText(title),
        'Category': cleanText(category),
        'Brand': cleanText(brand),
        'Model': cleanText(model),
        'Condition': condition,
        'Year': cleanText(year),
        'ListingType': listingType,
        'Price': cleanText(price),
        'Location': cleanText(location),
        'Description': description.trim(),
      };

  /// All fields for POST /api/listings (empty optional fields are left out).
  Map<String, String> toCreateFields() {
    final fields = Map<String, String>.from(_textFields)..removeWhere((_, v) => v.isEmpty);
    if (latitude != null && longitude != null) {
      fields['Latitude'] = latitude.toString();
      fields['Longitude'] = longitude.toString();
    }
    return fields;
  }
}

/// Fields that make the backend re-run the AI price + trust checks.
const aiFieldNames = {'Price', 'Category', 'Brand', 'Model', 'Condition', 'Year'};

/// Only the fields the user really changed, ready for PATCH /api/listings/{id}.
/// - text is compared after trimming/collapsing spaces
/// - price/year are compared as numbers ("45000" == "45000.0")
/// - an emptied Year/Description is ignored (the API cannot clear them)
/// - Latitude/Longitude are sent (together) only when the pin moved
Map<String, String> changedListingFields(ListingFormValues original, ListingFormValues current) {
  final before = original._textFields;
  final now = current._textFields;
  final changed = <String, String>{};

  now.forEach((key, value) {
    final old = before[key] ?? '';
    if (value.isEmpty && (key == 'Year' || key == 'Description')) return;
    if (key == 'Price' || key == 'Year') {
      final a = double.tryParse(value);
      final b = double.tryParse(old);
      if (a != null && a != b) changed[key] = value;
      return;
    }
    if (value != old) changed[key] = value;
  });

  final lat = current.latitude;
  final lng = current.longitude;
  final moved = lat != null &&
      lng != null &&
      (original.latitude == null ||
          original.longitude == null ||
          (lat - original.latitude!).abs() > 1e-6 ||
          (lng - original.longitude!).abs() > 1e-6);
  if (moved) {
    changed['Latitude'] = lat.toString();
    changed['Longitude'] = lng.toString();
  }
  return changed;
}
