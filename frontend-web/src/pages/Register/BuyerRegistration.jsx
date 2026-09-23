import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { apiCall } from '../../services/api';
import './Register.css';

const BuyerRegistration = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', nic: '', password: '', confirmPassword: ''
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

    if (!values.name) validationErrors.name = 'Name is required';
    else if (values.name.length < 3) validationErrors.name = 'Name must be at least 3 characters';
    if (!values.email) validationErrors.email = 'Email is required';
    else if (!isValidEmail(values.email)) validationErrors.email = 'Enter a valid email';
    if (!values.phone) validationErrors.phone = 'Phone number is required';
    else if (!isValidPhone(values.phone)) validationErrors.phone = 'Phone number must be 10 digits';
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
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role: 'buyer',
          phoneNumber: formData.phone,
          nicCardNumber: formData.nic
        })
      });
      navigate('/login');
    } catch (err) {
      console.error(err);
      if (err.status === 409 || err.message?.toLowerCase().includes('email')) {
        setErrors({ email: 'This email is already registered. Please try logging in.' });
      } else {
        setErrors({ form: err.message || 'Registration failed. Please try again.' });
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
            <h2>Buyer Registration</h2>
            <p className="register-subtitle mt-2">Create your account to start buying instruments.</p>
          </div>
          
          {errors.form && (
            <div style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.15)', border: '1px solid rgba(255, 107, 107, 0.3)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control" placeholder="Enter your full name" />
              {errors.name && <small style={{ color: 'red' }}>{errors.name}</small>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Enter your email" />
              {errors.email && <small style={{ color: 'red' }}>{errors.email}</small>}
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="form-control" placeholder="Enter your phone number" />
              {errors.phone && <small style={{ color: 'red' }}>{errors.phone}</small>}
            </div>
            <div className="form-group">
              <label>NIC Card Number</label>
              <input type="text" name="nic" value={formData.nic} onChange={handleChange} className="form-control" placeholder="Enter your NIC" />
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

export default BuyerRegistration;
