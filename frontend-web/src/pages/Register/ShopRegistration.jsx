import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout, PhotoPicker } from '../../components/AuthLayout';
import { apiCall } from '../../services/api';
import { Button, ErrorState, Input, PasswordInput } from '../../components/ui';

const ShopRegistration = () => {
  const [formData, setFormData] = useState({
    shopName: '', ownerName: '', email: '', phone: '', address: '', shopRegisterId: '', nic: '', password: '', confirmPassword: '', profileImage: null
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
    const shopName = formData.shopName?.trim();
    const ownerName = formData.ownerName?.trim();
    const email = formData.email?.trim();
    const phone = formData.phone?.trim();
    const address = formData.address?.trim();
    const shopRegisterId = formData.shopRegisterId?.trim();
    const nic = formData.nic?.trim();
    const password = formData.password;

    if (!shopName) validationErrors.shopName = 'Shop name is required';
    else if (shopName.length < 3) validationErrors.shopName = 'Shop name must be at least 3 characters';
    if (!ownerName) validationErrors.ownerName = 'Owner name is required';
    if (!email) validationErrors.email = 'Email is required';
    else if (!isValidEmail(email)) validationErrors.email = 'Enter a valid email';
    if (!phone) validationErrors.phone = 'Phone number is required';
    else if (!isValidPhone(phone)) validationErrors.phone = 'Phone number must be 10 digits';
    if (!address) validationErrors.address = 'Address is required';
    if (!shopRegisterId) validationErrors.shopRegisterId = 'Shop registration ID is required';
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
      payload.append('name', formData.shopName.trim());
      payload.append('email', formData.email.trim());
      payload.append('password', formData.password);
      payload.append('role', 'shop');
      payload.append('phoneNumber', formData.phone.trim());
      payload.append('ownerName', formData.ownerName.trim());
      payload.append('address', formData.address.trim());
      payload.append('shopRegisterId', formData.shopRegisterId.trim());
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
          infoMessage: 'Shop registration submitted successfully! Please wait until your account is verified by an administrator before logging in.'
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
      title="Register your shop"
      subtitle="List your inventory and reach buyers near you. An admin verifies new shops before the first login."
      backTo="/register"
      backLabel="Back to options"
      footer={<>Already registered? <Link to="/login">Log in</Link></>}
    >
      {errors.form && <ErrorState compact message={errors.form} />}

      <form onSubmit={handleSubmit} noValidate className="auth-form">
        <PhotoPicker
          label="Shop logo (optional)"
          preview={imagePreview}
          onChange={handleChange}
          onRemove={() => {
            setImagePreview(null);
            setFormData({ ...formData, profileImage: null });
          }}
        />

        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="section-title" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>Shop details</legend>
          <div className="form-grid">
            <Input label="Shop name" required name="shopName" value={formData.shopName} onChange={handleChange} placeholder="Kandy Music House" error={errors.shopName} />
            <Input label="Owner name" required name="ownerName" autoComplete="name" value={formData.ownerName} onChange={handleChange} placeholder="Owner's full name" error={errors.ownerName} />
            <Input label="Email" required type="email" name="email" autoComplete="email" value={formData.email} onChange={handleChange} placeholder="shop@example.com" error={errors.email} />
            <Input label="Phone number" required type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handleChange} placeholder="0812345678" hint="10 digits" error={errors.phone} />
            <Input label="Address" required name="address" autoComplete="street-address" value={formData.address} onChange={handleChange} placeholder="No. 12, Dalada Veediya, Kandy" error={errors.address} fieldClassName="span-2" />
            <Input label="Business registration ID" required name="shopRegisterId" value={formData.shopRegisterId} onChange={handleChange} placeholder="BR-2026-0001" error={errors.shopRegisterId} />
            <Input label="Owner NIC" required name="nic" value={formData.nic} onChange={handleChange} placeholder="199512345678" error={errors.nic} />
          </div>
        </fieldset>

        <fieldset className="stack" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="section-title" style={{ fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>Password</legend>
          <div className="form-grid">
            <PasswordInput label="Password" required name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} placeholder="Create a password" hint="At least 8 characters" minLength="8" error={errors.password} />
            <PasswordInput label="Confirm password" required name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat the password" minLength="8" error={errors.confirmPassword} />
          </div>
        </fieldset>

        <Button type="submit" size="lg" block loading={loading} disabled={Object.keys(errors).some((field) => errors[field])}>
          {loading ? 'Submitting…' : 'Submit for verification'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ShopRegistration;
