import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:music_market/core/widgets/suggestion_field.dart';

void main() {
  Future<TextEditingController> pump(WidgetTester tester) async {
    final controller = TextEditingController();
    await tester.pumpWidget(MaterialApp(
      home: Scaffold(
        body: SuggestionField(controller: controller, label: 'Category', suggestions: const ['Keyboard', 'Electric Guitar', 'Acoustic Guitar']),
      ),
    ));
    return controller;
  }

  testWidgets('typing shows matching suggestions as chips; tapping one fills the field', (tester) async {
    final controller = await pump(tester);

    await tester.enterText(find.byType(TextFormField), 'guit');
    await tester.pumpAndSettle();
    expect(controller.text, 'guit');
    expect(find.widgetWithText(ActionChip, 'Electric Guitar'), findsOneWidget);
    expect(find.widgetWithText(ActionChip, 'Keyboard'), findsNothing);

    await tester.tap(find.widgetWithText(ActionChip, 'Acoustic Guitar'));
    await tester.pumpAndSettle();
    expect(controller.text, 'Acoustic Guitar');
    expect(find.byType(ActionChip), findsNothing); // exact match -> no chips
  });

  testWidgets('free text that is not a suggestion is kept', (tester) async {
    final controller = await pump(tester);
    await tester.enterText(find.byType(TextFormField), 'Sitar');
    await tester.pumpAndSettle();
    expect(controller.text, 'Sitar');
    expect(find.byType(ActionChip), findsNothing);
  });

  testWidgets('the menu lists every suggestion', (tester) async {
    final controller = await pump(tester);
    await tester.tap(find.byTooltip('Category suggestions'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Keyboard').last);
    await tester.pumpAndSettle();
    expect(controller.text, 'Keyboard');
  });
}
