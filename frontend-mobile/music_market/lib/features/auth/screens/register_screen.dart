import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_exceptions.dart';
import '../../../core/widgets/app_text_field.dart';
import '../../../core/widgets/primary_button.dart';

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

  @override
  Widget build(BuildContext context) {
    if (_success) {
      return Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.check_circle, color: Colors.green, size: 80),
                const SizedBox(height: 24),
                const Text('Registration Successful!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                if (_role == 'shop')
                  const Text('Your shop will be reviewed by an admin.', textAlign: TextAlign.center),
                const SizedBox(height: 32),
                PrimaryButton(
                  text: 'Go to Login',
                  onPressed: () => context.go('/login'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Register')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'buyer', label: Text('Buyer')),
                    ButtonSegment(value: 'shop', label: Text('Shop')),
                  ],
                  selected: {_role},
                  onSelectionChanged: (Set<String> newSelection) {
                    setState(() {
                      _role = newSelection.first;
                    });
                  },
                ),
                const SizedBox(height: 24),
                
                if (_errorMessage != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 20),
                    decoration: BoxDecoration(
                      color: Colors.red.withValues(alpha: 0.1),
                      border: Border.all(color: Colors.redAccent),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent), textAlign: TextAlign.center),
                  ),

                AppTextField(
                  controller: _nameController,
                  label: _role == 'shop' ? 'Shop Name' : 'Full Name',
                  onChanged: _onFieldChanged,
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _emailController,
                  label: 'Email',
                  keyboardType: TextInputType.emailAddress,
                  onChanged: _onFieldChanged,
                  validator: (val) => val == null || val.isEmpty || !val.contains('@') ? 'Enter a valid email' : null,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _passwordController,
                  label: 'Password',
                  obscureText: true,
                  onChanged: _onFieldChanged,
                  validator: (val) => val == null || val.length < 6 ? 'Minimum 6 characters required' : null,
                ),
                const SizedBox(height: 16),
                AppTextField(
                  controller: _phoneController,
                  label: 'Phone Number',
                  keyboardType: TextInputType.phone,
                  onChanged: _onFieldChanged,
                  validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                ),
                
                if (_role == 'shop') ...[
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _nicController,
                    label: 'NIC Card Number',
                    onChanged: _onFieldChanged,
                    validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _ownerNameController,
                    label: 'Owner Name',
                    onChanged: _onFieldChanged,
                    validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _addressController,
                    label: 'Address',
                    onChanged: _onFieldChanged,
                    validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                  ),
                  const SizedBox(height: 16),
                  AppTextField(
                    controller: _shopRegisterIdController,
                    label: 'Shop Register ID',
                    onChanged: _onFieldChanged,
                    validator: (val) => val == null || val.isEmpty ? 'Required' : null,
                  ),
                ],
                
                const SizedBox(height: 32),
                PrimaryButton(
                  text: 'Register',
                  isLoading: _isLoading,
                  onPressed: _handleRegister,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
