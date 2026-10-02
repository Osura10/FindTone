import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';
import '../../../core/widgets/common_widgets.dart';
import '../../../core/theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  
  String _role = 'buyer'; // 'buyer' or 'shop'
  bool _isLoading = false;
  String? _errorMessage;
  bool _success = false;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  
  // Shop specific fields
  final _nicController = TextEditingController();
  final _ownerNameController = TextEditingController();
  final _addressController = TextEditingController();
  final _shopRegisterIdController = TextEditingController();

  final ApiClient _apiClient = ApiClient();

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _phoneController.dispose();
    _nicController.dispose();
    _ownerNameController.dispose();
    _addressController.dispose();
    _shopRegisterIdController.dispose();
    super.dispose();
  }

  void _onFieldChanged(String value) {
    if (_errorMessage != null) {
      setState(() {
        _errorMessage = null;
      });
    }
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final formData = FormData.fromMap({
        'Name': _nameController.text,
        'Email': _emailController.text,
        'Password': _passwordController.text,
        'Role': _role,
        'PhoneNumber': _phoneController.text,
        if (_role == 'shop') ...{
          'NicCardNumber': _nicController.text,
          'OwnerName': _ownerNameController.text,
          'Address': _addressController.text,
          'ShopRegisterId': _shopRegisterIdController.text,
        }
      });

      final response = await _apiClient.dio.post('/auth/register', data: formData);

      if (response.statusCode == 201) {
        setState(() {
          _success = true;
          _isLoading = false;
        });
      }
    } on DioException catch (e) {
      String msg = "Registration failed";
      if (e.response?.data != null) {
        if (e.response?.data is Map) {
           msg = e.response?.data['message'] ?? msg;
        } else if (e.response?.data is String) {
           msg = e.response?.data;
        }
      } else if (e.error is AppException) {
        msg = (e.error as AppException).message;
      }
      
      setState(() {
        _errorMessage = msg;
        _isLoading = false;
      });
    }
  }

  Widget _roleCard(String value, IconData icon, String title, String text) {
    final selected = _role == value;
    final c = context.colors;
    return Expanded(
      child: Semantics(
        selected: selected,
        button: true,
        child: InkWell(
          borderRadius: BorderRadius.circular(AppRadius.lg),
          onTap: () => setState(() => _role = value),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: selected ? c.primarySoft : context.scheme.surface,
              borderRadius: BorderRadius.circular(AppRadius.lg),
              border: Border.all(color: selected ? context.scheme.primary : context.scheme.outline, width: selected ? 2 : 1),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(icon, color: selected ? c.primaryText : c.textMuted),
                const Spacer(),
                Icon(selected ? Icons.radio_button_checked : Icons.radio_button_off, size: 18, color: selected ? c.primaryText : c.textMuted),
              ]),
              const SizedBox(height: AppSpacing.sm),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
              const SizedBox(height: 2),
              Text(text, style: TextStyle(fontSize: 12, color: c.textMuted, height: 1.3)),
            ]),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_success) {
      return Scaffold(
        body: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.xl),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 88,
                    height: 88,
                    decoration: BoxDecoration(color: context.colors.successSoft, shape: BoxShape.circle),
                    child: Icon(Icons.check_rounded, color: context.colors.success, size: 48),
                  ),
                  const SizedBox(height: AppSpacing.xl),
                  Text('Registration successful!', style: context.text.headlineSmall, textAlign: TextAlign.center),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    _role == 'shop' ? 'Your shop will be reviewed by an admin before you can log in.' : 'You can now log in to your account.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: context.colors.textMuted),
                  ),
                  const SizedBox(height: AppSpacing.xxl),
                  PrimaryButton(text: 'Go to Login', onPressed: () => context.go('/login')),
                ],
              ),
            ),
          ),
        ),
      );
    }

    String? required(String? val) => val == null || val.isEmpty ? 'Required' : null;

    return Scaffold(
      appBar: AppBar(title: const Text('Create account')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(AppSpacing.xl, AppSpacing.sm, AppSpacing.xl, AppSpacing.xl),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text('I want to join as', style: context.text.titleSmall),
                    const SizedBox(height: AppSpacing.sm),
                    Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      _roleCard('buyer', Icons.shopping_bag_outlined, 'Buyer', 'Browse, save and buy – and sell your own gear.'),
                      const SizedBox(width: AppSpacing.md),
                      _roleCard('shop', Icons.storefront_outlined, 'Shop', 'List your inventory. Verified by an admin.'),
                    ]),
                    const SizedBox(height: AppSpacing.xl),

                    if (_errorMessage != null) ...[
                      InlineNotice(message: _errorMessage!, tone: NoticeTone.error),
                      const SizedBox(height: AppSpacing.lg),
                    ],

                    AppTextField(
                      controller: _nameController,
                      label: _role == 'shop' ? 'Shop Name' : 'Full Name',
                      prefixIcon: _role == 'shop' ? Icons.storefront_outlined : Icons.person_outline_rounded,
                      onChanged: _onFieldChanged,
                      validator: required,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      controller: _emailController,
                      label: 'Email',
                      prefixIcon: Icons.mail_outline_rounded,
                      keyboardType: TextInputType.emailAddress,
                      onChanged: _onFieldChanged,
                      validator: (val) => val == null || val.isEmpty || !val.contains('@') ? 'Enter a valid email' : null,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      controller: _passwordController,
                      label: 'Password',
                      prefixIcon: Icons.lock_outline_rounded,
                      obscureText: true,
                      onChanged: _onFieldChanged,
                      validator: (val) => val == null || val.length < 6 ? 'Minimum 6 characters required' : null,
                    ),
                    const SizedBox(height: AppSpacing.lg),
                    AppTextField(
                      controller: _phoneController,
                      label: 'Phone Number',
                      hint: '0771234567',
                      prefixIcon: Icons.phone_outlined,
                      keyboardType: TextInputType.phone,
                      onChanged: _onFieldChanged,
                      validator: required,
                    ),

                    if (_role == 'shop') ...[
                      const SizedBox(height: AppSpacing.xl),
                      Text('Shop details', style: context.text.titleSmall),
                      const SizedBox(height: AppSpacing.md),
                      AppTextField(controller: _ownerNameController, label: 'Owner Name', prefixIcon: Icons.badge_outlined, onChanged: _onFieldChanged, validator: required),
                      const SizedBox(height: AppSpacing.lg),
                      AppTextField(controller: _nicController, label: 'NIC Card Number', prefixIcon: Icons.credit_card_outlined, onChanged: _onFieldChanged, validator: required),
                      const SizedBox(height: AppSpacing.lg),
                      AppTextField(controller: _addressController, label: 'Address', prefixIcon: Icons.place_outlined, onChanged: _onFieldChanged, validator: required),
                      const SizedBox(height: AppSpacing.lg),
                      AppTextField(controller: _shopRegisterIdController, label: 'Shop Register ID', prefixIcon: Icons.description_outlined, onChanged: _onFieldChanged, validator: required),
                    ],

                    const SizedBox(height: AppSpacing.xl),
                    PrimaryButton(text: 'Register', isLoading: _isLoading, onPressed: _handleRegister),
                    const SizedBox(height: AppSpacing.md),
                    Wrap(alignment: WrapAlignment.center, crossAxisAlignment: WrapCrossAlignment.center, children: [
                      Text('Already have an account?', style: TextStyle(color: context.colors.textMuted)),
                      TextButton(onPressed: () => context.go('/login'), child: const Text('Log in')),
                    ]),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
