import 'package:flutter/material.dart';
import '../../../core/network/api_exceptions.dart';
import 'package:provider/provider.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:go_router/go_router.dart';
import '../providers/assistant_provider.dart';
import '../../alerts/providers/alerts_provider.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/widgets/app_network_image.dart';
import '../models/chat_message_model.dart';

class AssistantScreen extends StatefulWidget {
  const AssistantScreen({super.key});

  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  final List<String> _suggestedPrompts = [
    "Find me a good acoustic guitar under LKR 20,000",
    "I'm a beginner looking for an electric guitar",
    "Compare Yamaha F310 and FG800",
  ];

  void _sendMessage(String text) {
    if (text.trim().isEmpty) return;
    _controller.clear();
    context.read<AssistantProvider>().sendMessage(text);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    Future.delayed(const Duration(milliseconds: 100), () {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _createAlert(Map<String, dynamic> a) async {
    final messenger = ScaffoldMessenger.of(context);
    // The AI answers in snake_case; the alerts API uses camelCase (same mapping as the web).
    String? text(String k) => (a[k]?.toString().trim().isEmpty ?? true) ? null : a[k].toString().trim();
    try {
      final saved = await context.read<AlertsProvider>().saveAlert({
        'name': text('name'),
        'category': text('category'),
        'brand': text('brand'),
        'modelKeyword': text('model_keyword'),
        'minPrice': (a['min_price'] as num?)?.toDouble(),
        'maxPrice': (a['max_price'] as num?)?.toDouble(),
        'conditions': text('conditions'),
        'location': text('location'),
      });
      final matches = saved.newMatches ?? 0;
      messenger.showSnackBar(SnackBar(content: Text(matches > 0 ? 'Alert created – $matches listing(s) already match.' : 'Alert created.')));
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(describeError(e))));
    }
  }

  Widget _bubble(ChatMessageModel msg) {
    final c = context.colors;
    final isUser = msg.role == 'user';
    final maxWidth = MediaQuery.sizeOf(context).width * (isUser ? 0.8 : 0.88);

    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.md),
      child: Row(
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isUser) ...[
            CircleAvatar(radius: 14, backgroundColor: context.scheme.primary, child: const Icon(Icons.auto_awesome, size: 14, color: Colors.white)),
            const SizedBox(width: AppSpacing.sm),
          ],
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: maxWidth),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              decoration: BoxDecoration(
                color: isUser ? context.scheme.primary : context.scheme.surface,
                border: isUser ? null : Border.all(color: c.border),
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(18),
                  topRight: const Radius.circular(18),
                  bottomLeft: Radius.circular(isUser ? 18 : 4),
                  bottomRight: Radius.circular(isUser ? 4 : 18),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isUser)
                    Text(msg.text, style: const TextStyle(color: Colors.white, height: 1.4))
                  else if (msg.text.isNotEmpty)
                    MarkdownBody(
                      data: msg.text,
                      styleSheet: MarkdownStyleSheet.fromTheme(Theme.of(context)).copyWith(
                        p: TextStyle(color: context.scheme.onSurface, height: 1.45, fontSize: 14),
                      ),
                    ),

                  if (msg.listings != null && msg.listings!.isNotEmpty) ...[
                    const SizedBox(height: AppSpacing.md),
                    for (final item in msg.listings!) _resultCard(item),
                  ],

                  if (msg.alertToCreate != null) ...[
                    const SizedBox(height: AppSpacing.sm),
                    FilledButton.tonalIcon(
                      icon: const Icon(Icons.notifications_active_outlined, size: 18),
                      label: const Text('Create alert for this search'),
                      onPressed: () => _createAlert(msg.alertToCreate!),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// A listing returned by the assistant: tap opens the details page.
  Widget _resultCard(dynamic item) {
    final c = context.colors;
    final map = item is Map ? item : const {};
    final price = num.tryParse('${map['price'] ?? ''}')?.toDouble();
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Material(
        color: c.surface2,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.md),
          onTap: map['id'] != null ? () => context.push('/listing/${map['id']}') : null,
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Row(children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.sm),
                child: AppNetworkImage(imageUrl: map['image_url']?.toString(), width: 56, height: 48, isThumbnail: true),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(map['title']?.toString() ?? 'Listing', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                  const SizedBox(height: 2),
                  if (price != null) PriceTag(amount: price, size: 14),
                ]),
              ),
              Icon(Icons.chevron_right_rounded, color: c.textMuted),
            ]),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AssistantProvider>();
    final messages = provider.messages;
    final c = context.colors;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(children: [
          CircleAvatar(radius: 18, backgroundColor: context.scheme.primary, child: const Icon(Icons.auto_awesome, size: 18, color: Colors.white)),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Shopping Assistant', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
              Text(provider.isTyping ? 'typing…' : '● Online', style: TextStyle(fontSize: 12, color: c.success, fontWeight: FontWeight.w500)),
            ]),
          ),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: provider.clearSession, tooltip: 'New chat'),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: messages.isEmpty
                ? ListView(
                    padding: const EdgeInsets.all(AppSpacing.xl),
                    children: [
                      const SizedBox(height: AppSpacing.xl),
                      Center(
                        child: Container(
                          width: 76,
                          height: 76,
                          decoration: BoxDecoration(color: c.primarySoft, shape: BoxShape.circle),
                          child: Icon(Icons.auto_awesome, size: 36, color: c.primaryText),
                        ),
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      Text('AI Shopping Assistant', textAlign: TextAlign.center, style: context.text.headlineSmall),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Ask me to find instruments, compare prices, or recommend gear based on your needs.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: c.textMuted, height: 1.45),
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      Text('TRY ASKING', textAlign: TextAlign.center, style: TextStyle(fontSize: 11.5, letterSpacing: 0.8, fontWeight: FontWeight.w700, color: c.textMuted)),
                      const SizedBox(height: AppSpacing.md),
                      for (final prompt in _suggestedPrompts)
                        Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(alignment: Alignment.centerLeft, padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14)),
                            onPressed: () => _sendMessage(prompt),
                            child: Row(children: [
                              Expanded(child: Text(prompt, style: const TextStyle(fontWeight: FontWeight.w500))),
                              Icon(Icons.north_east_rounded, size: 16, color: c.textMuted),
                            ]),
                          ),
                        ),
                    ],
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.fromLTRB(AppSpacing.page, AppSpacing.lg, AppSpacing.page, AppSpacing.lg),
                    itemCount: messages.length + (provider.isTyping ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == messages.length && provider.isTyping) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: AppSpacing.md),
                          child: Row(children: [
                            CircleAvatar(radius: 14, backgroundColor: context.scheme.primary, child: const Icon(Icons.auto_awesome, size: 14, color: Colors.white)),
                            const SizedBox(width: AppSpacing.sm),
                            const TypingIndicator(),
                          ]),
                        );
                      }
                      return _bubble(messages[index]);
                    },
                  ),
          ),
          // Input bar
          Container(
            decoration: BoxDecoration(color: context.scheme.surface, border: Border(top: BorderSide(color: c.border))),
            child: SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.sm, AppSpacing.sm),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        minLines: 1,
                        maxLines: 4,
                        textInputAction: TextInputAction.send,
                        decoration: InputDecoration(
                          hintText: 'Ask the assistant…',
                          filled: true,
                          fillColor: c.surface2,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide.none),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(24), borderSide: BorderSide(color: context.scheme.primary, width: 1.5)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                        ),
                        onSubmitted: _sendMessage,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    IconButton.filled(
                      tooltip: 'Send',
                      style: IconButton.styleFrom(minimumSize: const Size(48, 48)),
                      icon: const Icon(Icons.send_rounded),
                      onPressed: provider.isTyping ? null : () => _sendMessage(_controller.text),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Three bouncing dots shown while the assistant is answering.
class TypingIndicator extends StatefulWidget {
  const TypingIndicator({super.key});

  @override
  State<TypingIndicator> createState() => _TypingIndicatorState();
}

class _TypingIndicatorState extends State<TypingIndicator> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1100))..repeat();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      label: 'Assistant is typing',
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: context.scheme.surface,
          border: Border.all(color: c.border),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(18),
            topRight: Radius.circular(18),
            bottomRight: Radius.circular(18),
            bottomLeft: Radius.circular(4),
          ),
        ),
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, _) => Row(mainAxisSize: MainAxisSize.min, children: [
            for (var i = 0; i < 3; i++)
              Builder(builder: (context) {
                // Each dot rises in turn.
                final t = (_controller.value - i * 0.15) % 1.0;
                final lift = t < 0.4 ? (t < 0.2 ? t / 0.2 : (0.4 - t) / 0.2) : 0.0;
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2.5),
                  child: Transform.translate(
                    offset: Offset(0, -4 * lift),
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(color: c.textMuted.withValues(alpha: 0.45 + 0.55 * lift), shape: BoxShape.circle),
                    ),
                  ),
                );
              }),
          ]),
        ),
      ),
    );
  }
}
