import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:go_router/go_router.dart';
import '../providers/assistant_provider.dart';
import '../../alerts/providers/alerts_provider.dart';

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

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<AssistantProvider>();
    final messages = provider.messages;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Shopping Assistant'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              provider.clearSession();
            },
            tooltip: 'New Chat',
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: messages.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.auto_awesome, size: 64, color: Colors.purple),
                          const SizedBox(height: 16),
                          const Text(
                            'AI Shopping Assistant',
                            style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Ask me to find instruments, compare prices, or recommend gear based on your needs.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: Colors.grey),
                          ),
                          const SizedBox(height: 32),
                          ..._suggestedPrompts.map((prompt) => Padding(
                                padding: const EdgeInsets.only(bottom: 8.0),
                                child: ActionChip(
                                  label: Text(prompt),
                                  onPressed: () => _sendMessage(prompt),
                                ),
                              )),
                        ],
                      ),
                    ),
                  )
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length + (provider.isTyping ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == messages.length && provider.isTyping) {
                        return const Align(
                          alignment: Alignment.centerLeft,
                          child: Padding(
                            padding: EdgeInsets.symmetric(vertical: 8.0),
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }
                      final msg = messages[index];
                      final isUser = msg.role == 'user';

                      return Align(
                        alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 16),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: isUser ? Colors.blue : Colors.grey.withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.85,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              if (!isUser && msg.text.isNotEmpty)
                                MarkdownBody(
                                  data: msg.text,
                                  styleSheet: MarkdownStyleSheet(
                                    p: const TextStyle(color: Colors.white),
                                  ),
                                ),
                              if (isUser) Text(msg.text, style: const TextStyle(color: Colors.white)),
                              
                              if (msg.listings != null && msg.listings!.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                SizedBox(
                                  height: 120,
                                  child: ListView.builder(
                                    scrollDirection: Axis.horizontal,
                                    itemCount: msg.listings!.length,
                                    itemBuilder: (context, lIndex) {
                                      final item = msg.listings![lIndex];
                                      return GestureDetector(
                                        onTap: () {
                                          if (item['id'] != null) {
                                            context.push('/listing/${item['id']}');
                                          }
                                        },
                                        child: Container(
                                          width: 200,
                                          margin: const EdgeInsets.only(right: 8),
                                          decoration: BoxDecoration(
                                            color: Colors.black.withValues(alpha: 0.5),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: Colors.grey.withValues(alpha: 0.5)),
                                          ),
                                          child: Row(
                                            children: [
                                              if (item['image_url'] != null)
                                                ClipRRect(
                                                  borderRadius: const BorderRadius.horizontal(left: Radius.circular(8)),
                                                  child: Image.network(item['image_url'], width: 80, height: 120, fit: BoxFit.cover),
                                                ),
                                              Expanded(
                                                child: Padding(
                                                  padding: const EdgeInsets.all(8.0),
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    mainAxisAlignment: MainAxisAlignment.center,
                                                    children: [
                                                      Text(
                                                        item['title'] ?? 'Listing',
                                                        maxLines: 2,
                                                        overflow: TextOverflow.ellipsis,
                                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                                      ),
                                                      const SizedBox(height: 4),
                                                      Text(
                                                        'LKR ${item['price']}',
                                                        style: const TextStyle(color: Colors.blue, fontSize: 12, fontWeight: FontWeight.bold),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                ),
                              ],

                              if (msg.alertToCreate != null) ...[
                                const SizedBox(height: 12),
                                ElevatedButton.icon(
                                  icon: const Icon(Icons.notifications_active),
                                  label: const Text('Create Alert for this search'),
                                  onPressed: () async {
                                    final messenger = ScaffoldMessenger.of(context);
                                    try {
                                      await context.read<AlertsProvider>().createAlert(msg.alertToCreate!);
                                      messenger.showSnackBar(const SnackBar(content: Text('Alert created successfully!')));
                                    } catch (e) {
                                      messenger.showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
                                    }
                                  },
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
          Container(
            padding: const EdgeInsets.all(8.0),
            color: Theme.of(context).scaffoldBackgroundColor,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _controller,
                    decoration: const InputDecoration(
                      hintText: 'Ask the assistant...',
                      border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(24))),
                      contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: Colors.blue,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: () => _sendMessage(_controller.text),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
