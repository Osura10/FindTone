class ChatMessageModel {
  final String role; // 'user' or 'assistant'
  final String text;
  final List<dynamic>? listings;
  final Map<String, dynamic>? alertToCreate;

  ChatMessageModel({
    required this.role,
    required this.text,
    this.listings,
    this.alertToCreate,
  });
}
