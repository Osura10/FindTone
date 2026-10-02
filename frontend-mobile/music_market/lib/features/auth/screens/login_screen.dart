import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import 'package:flutter/foundation.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    // Show why we are on the login page (session expired, admin blocked, server offline...).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final message = context.read<AuthProvider>().takeStatusMessage();
      if (message != null) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
      }
    });
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onFieldChanged(String value) {
    context.read<AuthProvider>().clearError();
  }

  Future<void> _handleLogin() async {
    if (_formKey.currentState!.validate()) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final success = await authProvider.login(
        _emailController.text,
        _passwordController.text,
      );
      
      // On success the router redirect opens the right home screen for the role.
      if (success && mounted) context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(AppSpacing.xl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Form(
                key: _formKey,
                child: AutofillGroup(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Align(alignment: Alignment.centerLeft, child: BrandMark(size: 40)),
                      const SizedBox(height: AppSpacing.xxl),
                      Text('Welcome back', style: context.text.headlineMedium),
                      const SizedBox(height: 6),
                      Text('Log in to buy, sell and get price-drop alerts.', style: context.text.bodyLarge?.copyWith(color: context.colors.textMuted)),
                      const SizedBox(height: AppSpacing.xl),

                      if (authProvider.errorMessage != null) ...[
                        InlineNotice(
                          message: authProvider.errorMessage!,
                          tone: authProvider.pendingApproval ? NoticeTone.warning : NoticeTone.error,
                        ),
                        const SizedBox(height: AppSpacing.lg),
                      ],

                      AppTextField(
                        controller: _emailController,
                        label: 'Email',
                        hint: 'you@example.com',
                        prefixIcon: Icons.mail_outline_rounded,
                        keyboardType: TextInputType.emailAddress,
                        textInputAction: TextInputAction.next,
                        autofillHints: const [AutofillHints.email],
                        onChanged: _onFieldChanged,
                        validator: (val) {
                          if (val == null || val.isEmpty) return 'Email is required';
                          if (!val.contains('@')) return 'Enter a valid email';
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.lg),
                      AppTextField(
                        controller: _passwordController,
                        label: 'Password',
                        prefixIcon: Icons.lock_outline_rounded,
                        obscureText: true,
                        textInputAction: TextInputAction.done,
                        autofillHints: const [AutofillHints.password],
                        onChanged: _onFieldChanged,
                        onSubmitted: (_) => _handleLogin(),
                        validator: (val) {
                          if (val == null || val.isEmpty) return 'Password is required';
                          return null;
                        },
                      ),
                      const SizedBox(height: AppSpacing.xl),
                      PrimaryButton(
                        text: 'Login',
                        icon: Icons.login_rounded,
                        isLoading: authProvider.isLoading,
                        onPressed: _handleLogin,
                      ),
                      if (kDebugMode)
                        Padding(
                          padding: const EdgeInsets.only(top: AppSpacing.sm),
                          child: TextButton.icon(
                            icon: const Icon(Icons.wifi_tethering, size: 18),
                            onPressed: () async {
                              try {
                                final res = await ApiClient().dio.get('/catalog');
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('OK: ${res.statusCode}')));
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: ${describeError(e)}')));
                                }
                              }
                            },
                            label: const Text('Test connection'),
                          ),
                        ),
                      const SizedBox(height: AppSpacing.lg),
                      Wrap(
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text("Don't have an account?", style: TextStyle(color: context.colors.textMuted)),
                          TextButton(
                            onPressed: () => context.push('/register'),
                            child: const Text('Create one'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
