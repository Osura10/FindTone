import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, PhotoPicker } from '../../components/AuthLayout';
import { apiCall } from '../../services/api';
import { Button, ErrorState, Input, PasswordInput } from '../../components/ui';

const BuyerRegistration = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', nic: '', password: '', confirmPassword: '', profileImage: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      setFormData({ ...formData, [name]: file });
      if (file) {
        setImagePreview(URL.createObjectURL(file));
      } else {
        setImagePreview(null);
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
    setErrors((current) => ({ ...current, [name]: '' }));
  };

  const isValidEmail = (email) => email.includes('@') && email.includes('.');
  const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);
  const isValidNIC = (nic) => /^(\d{9}[vV]|\d{12})$/.test(nic);

  const validate = () => {
    const validationErrors = {};
    const name = formData.name?.trim();
    const email = formData.email?.trim();
    const phone = formData.phone?.trim();
    const nic = formData.nic?.trim();
    const password = formData.password;

    if (!name) validationErrors.name = 'Name is required';
    else if (name.length < 3) validationErrors.name = 'Name must be at least 3 characters';
    if (!email) validationErrors.email = 'Email is required';
    else if (!isValidEmail(email)) validationErrors.email = 'Enter a valid email';
    if (!phone) validationErrors.phone = 'Phone number is required';
    else if (!isValidPhone(phone)) validationErrors.phone = 'Phone number must be 10 digits';
    if (!nic) validationErrors.nic = 'NIC is required';
    else if (!isValidNIC(nic)) validationErrors.nic = 'Enter a valid NIC';
    if (!password) validationErrors.password = 'Password is required';
    else if (password.length < 8) validationErrors.password = 'Password must be at least 8 characters';
    if (password !== formData.confirmPassword) validationErrors.confirmPassword = 'Passwords do not match';

    return validationErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('name', formData.name.trim());
      payload.append('email', formData.email.trim());
      payload.append('password', formData.password);
      payload.append('role', 'buyer');
      payload.append('phoneNumber', formData.phone.trim());
      payload.append('nicCardNumber', formData.nic.trim());
      
      if (formData.profileImage) {
        payload.append('ProfileImage', formData.profileImage);
      }

      await apiCall('/auth/register', {
        method: 'POST',
        body: payload
      });
      navigate('/login', {
        state: {
          successMessage: 'Registration successful! You can now log in to your account.'
        }
      });
    } catch (err) {
      console.error(err);
      const msg = err.message?.toLowerCase() || '';
      if (err.status === 409 || msg.includes('already used') || msg.includes('email')) {
        setErrors({ email: 'This email is already registered. Please try logging in.' });
      } else {
        setErrors({ form: err.message || 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      wide
      title="Create a buyer account"
      subtitle="Browse, save and buy instruments – and sell your own gear too."
      backTo="/register"
      backLabel="Back to options"
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      {errors.form && <ErrorState compact message={errors.form} />}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <PhotoPicker
          preview={imagePreview}
          onChange={handleChange}
          onRemove={() => {
            setImagePreview(null);
            setFormData({ ...formData, profileImage: null });
          }}
        />

        <div className="form-grid">
          <Input label="Full name" required name="name" autoComplete="name" value={formData.name} onChange={handleChange} placeholder="Nimal Perera" error={errors.name} fieldClassName="span-2" />
          <Input label="Email" required type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" error={errors.email} />
          <Input label="Phone number" required type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handleChange} placeholder="0771234567" hint="10 digits" error={errors.phone} />
          <Input label="NIC number" required name="nic" value={formData.nic} onChange={handleChange} placeholder="199512345678 or 951234567V" error={errors.nic} fieldClassName="span-2" />
          <PasswordInput label="Password" required name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} placeholder="Create a password" hint="At least 8 characters" minLength="8" error={errors.password} />
          <PasswordInput label="Confirm password" required name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat the password" minLength="8" error={errors.confirmPassword} />
        </div>

        <Button type="submit" size="lg" block loading={loading} disabled={Object.keys(errors).some((field) => errors[field])}>
          {loading ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default BuyerRegistration;
