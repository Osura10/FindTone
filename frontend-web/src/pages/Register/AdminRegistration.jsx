import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Camera } from 'lucide-react';
import { apiCall } from '../../services/api';
import './Register.css';

const AdminRegistration = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', nic: '', password: '', confirmPassword: '', profileImage: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      payload.append('role', 'admin');
      payload.append('phoneNumber', formData.phone.trim());
      payload.append('nicCardNumber', formData.nic.trim());
      
      if (formData.profileImage) {
        payload.append('ProfileImage', formData.profileImage);
      }

      await apiCall('/auth/register', {
        method: 'POST',
        body: payload
      });
      navigate('/login');
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes('already used')) {
        setErrors({ email: 'This email is already registered. Please try logging in.' });
      } else {
        setErrors({ email: err.message || 'Registration failed.' });
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
            <h2>Admin Registration</h2>
            <p className="register-subtitle mt-2">Create your administrator account.</p>
          </div>
          
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '3rem', marginBottom: '2rem' }}>
              <label>Profile Picture (Optional)</label>
              <div 
                className="profile-upload-circle mt-2" 
                onClick={() => document.getElementById('profileImageInput').click()}
                style={{
                  width: '140px', height: '140px', borderRadius: '50%', border: '2px dashed var(--primary-color)',
                  display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
                  overflow: 'hidden', position: 'relative', background: 'rgba(255,255,255,0.05)'
                }}
              >
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Camera size={48} color="var(--primary-color)" />
                )}
              </div>
              {imagePreview && (
                <button 
                  type="button" 
                  onClick={() => {
                    setImagePreview(null);
                    setFormData({ ...formData, profileImage: null });
                    document.getElementById('profileImageInput').value = '';
                  }}
                  style={{
                    background: 'transparent', border: 'none', color: '#ff4d4f', marginTop: '1rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500'
                  }}
                >
                  Remove Picture
                </button>
              )}
              <input id="profileImageInput" type="file" name="profileImage" accept="image/*" onChange={handleChange} style={{ display: 'none' }} />
            </div>

            <div className="form-group">
              <label>Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control" placeholder="Enter your full name" />
              {errors.name && <small style={{ color: 'red' }}>{errors.name}</small>}
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Enter your admin email" />
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
            
            <button type="submit" className="btn btn-primary w-100 mt-4" disabled={loading || Object.keys(errors).some((field) => errors[field])}>
              {loading ? 'Registering...' : 'Register Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminRegistration;
