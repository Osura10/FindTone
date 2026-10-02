import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../auth/providers/auth_provider.dart';

/// Shown while the saved login is checked. AuthProvider.loadAuthData never throws,
/// so the router always moves on (to a home or to /login) – no blank screen.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final auth = context.read<AuthProvider>();
      if (auth.isAuthLoading) auth.loadAuthData();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        width: double.infinity,
        decoration: const BoxDecoration(
          gradient: LinearGradient(colors: [Color(0xFF4C1D95), Color(0xFF6D28D9), Color(0xFF7C3AED)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        ),
        child: SafeArea(
          child: Column(children: [
            const Spacer(flex: 3),
            Container(
              width: 88,
              height: 88,
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(26)),
              child: const Icon(Icons.music_note_rounded, size: 52, color: Colors.white),
            ),
            const SizedBox(height: 20),
            const Text('MusicMarket', style: TextStyle(color: Colors.white, fontSize: 30, fontWeight: FontWeight.w800, letterSpacing: -0.8)),
            const SizedBox(height: 6),
            Text('Find your perfect tone', style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 15)),
            const Spacer(flex: 2),
            const SizedBox(width: 26, height: 26, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white)),
            const SizedBox(height: 48),
          ]),
        ),
      ),
    );
  }
}
