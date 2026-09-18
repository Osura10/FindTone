import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { apiCall } from '../../services/api';
import './Register.css';

const ShopRegistration = () => {
  const [formData, setFormData] = useState({
    shopName: '', ownerName: '', email: '', phone: '', address: '', shopRegisterId: '', nic: '', password: '', confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors((current) => ({ ...current, [e.target.name]: '' }));
  };

  const isValidEmail = (email) => email.includes('@') && email.includes('.');
  const isValidPhone = (phone) => /^[0-9]{10}$/.test(phone);
  const isValidNIC = (nic) => /^(\d{9}[vV]|\d{12})$/.test(nic);

  const validate = () => {
    const values = Object.fromEntries(Object.entries(formData).map(([key, value]) => [key, value.trim()]));
    const validationErrors = {};

    if (!values.shopName) validationErrors.shopName = 'Shop name is required';
    else if (values.shopName.length < 3) validationErrors.shopName = 'Shop name must be at least 3 characters';
    if (!values.ownerName) validationErrors.ownerName = 'Owner name is required';
    if (!values.email) validationErrors.email = 'Email is required';
    else if (!isValidEmail(values.email)) validationErrors.email = 'Enter a valid email';
    if (!values.phone) validationErrors.phone = 'Phone number is required';
    else if (!isValidPhone(values.phone)) validationErrors.phone = 'Phone number must be 10 digits';
    if (!values.address) validationErrors.address = 'Address is required';
    if (!values.shopRegisterId) validationErrors.shopRegisterId = 'Shop registration ID is required';
    if (!values.nic) validationErrors.nic = 'NIC is required';
    else if (!isValidNIC(values.nic)) validationErrors.nic = 'Enter a valid NIC';
    if (!values.password) validationErrors.password = 'Password is required';
    else if (values.password.length < 8) validationErrors.password = 'Password must be at least 8 characters';
    if (values.password !== values.confirmPassword) validationErrors.confirmPassword = 'Passwords do not match';

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
      await apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.shopName,
          email: formData.email,
          password: formData.password,
          role: 'shop',
          phoneNumber: formData.phone,
          ownerName: formData.ownerName,
          address: formData.address,
          shopRegisterId: formData.shopRegisterId,
          nicCardNumber: formData.nic
        })
      });
      navigate('/login');
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 400) {
        setErrors({ email: 'This email is already registered. Please try logging in.' });
      } else {
        setErrors({ email: 'Email already registered or registration failed.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="bg-gradients">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
      </div>
      
      <div className="container">
        <div className="register-form-container glass-panel">
          <Link to="/register" className="back-btn">
            <ArrowLeft size={16} />
            Back to Options
          </Link>
          <div className="text-center mb-4">
            <h2>Shop Registration</h2>
            <p className="register-subtitle mt-2">Create your account to list your shop's inventory.</p>
          </div>
          
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label>Shop Name</label>
              <input type="text" name="shopName" value={formData.shopName} onChange={handleChange} className="form-control" placeholder="Enter shop name" />
              {errors.shopName && <small style={{ color: 'red' }}>{errors.shopName}</small>}
            </div>
            <div className="form-group">
              <label>Owner Name</label>
              <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} className="form-control" placeholder="Enter owner's full name" />
              {errors.ownerName && <small style={{ color: 'red' }}>{errors.ownerName}</small>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Enter shop email" />
              {errors.email && <small style={{ color: 'red' }}>{errors.email}</small>}
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-control" placeholder="Enter shop phone number" />
              {errors.phone && <small style={{ color: 'red' }}>{errors.phone}</small>}
            </div>
            <div className="form-group">
              <label>Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} className="form-control" placeholder="Enter shop physical address" />
              {errors.address && <small style={{ color: 'red' }}>{errors.address}</small>}
            </div>
            <div className="form-group">
              <label>Shop Registration ID</label>
              <input type="text" name="shopRegisterId" value={formData.shopRegisterId} onChange={handleChange} className="form-control" placeholder="Enter business registration ID" />
              {errors.shopRegisterId && <small style={{ color: 'red' }}>{errors.shopRegisterId}</small>}
            </div>
            <div className="form-group">
              <label>NIC Card Number</label>
              <input type="text" name="nic" value={formData.nic} onChange={handleChange} className="form-control" placeholder="Enter owner's NIC" />
              {errors.nic && <small style={{ color: 'red' }}>{errors.nic}</small>}
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleChange} className="form-control" placeholder="Create a password" minLength="8" />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <small style={{ color: 'red' }}>{errors.password}</small>}
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <div className="password-input-wrapper">
                <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="form-control" placeholder="Confirm your password" minLength="8" />
                <button type="button" className="password-toggle-btn" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && <small style={{ color: 'red' }}>{errors.confirmPassword}</small>}
            </div>
            
            <button type="submit" className="btn btn-primary w-100 mt-3" disabled={loading || Object.keys(errors).some((field) => errors[field])}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShopRegistration;
