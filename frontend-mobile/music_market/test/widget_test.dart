import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:music_market/features/auth/providers/auth_provider.dart';
import 'package:music_market/features/auth/screens/login_screen.dart';

void main() {
  testWidgets('Login screen validation test', (WidgetTester tester) async {
    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    // Tap login button without entering credentials
    await tester.tap(find.text('Login'));
    await tester.pump();

    // Verify validation errors
    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });
}
