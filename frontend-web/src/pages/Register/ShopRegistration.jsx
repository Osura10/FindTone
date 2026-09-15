import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiCall } from '../../services/api';
import './Register.css';

const ShopRegistration = () => {
  const [formData, setFormData] = useState({
    shopName: '', ownerName: '', email: '', phone: '', address: '', shopRegisterId: '', nic: '', password: '', confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }

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
      setError(err.message || 'Registration failed');
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
          
          {error && <div className="alert alert-danger" style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', color: '#ff4d4d', padding: '1rem', borderRadius: '8px', border: '1px solid #ff4d4d', marginBottom: '1rem' }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Shop Name</label>
              <input type="text" name="shopName" value={formData.shopName} onChange={handleChange} required className="form-control" placeholder="Enter shop name" />
            </div>
            <div className="form-group">
              <label>Owner Name</label>
              <input type="text" name="ownerName" value={formData.ownerName} onChange={handleChange} required className="form-control" placeholder="Enter owner's full name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required className="form-control" placeholder="Enter shop email" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} required className="form-control" placeholder="Enter shop phone number" />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input type="text" name="address" value={formData.address} onChange={handleChange} required className="form-control" placeholder="Enter shop physical address" />
            </div>
            <div className="form-group">
              <label>Shop Registration ID</label>
              <input type="text" name="shopRegisterId" value={formData.shopRegisterId} onChange={handleChange} required className="form-control" placeholder="Enter business registration ID" />
            </div>
            <div className="form-group">
              <label>NIC Card Number</label>
              <input type="text" name="nic" value={formData.nic} onChange={handleChange} required className="form-control" placeholder="Enter owner's NIC" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} required className="form-control" placeholder="Create a password" minLength="8" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required className="form-control" placeholder="Confirm your password" minLength="8" />
            </div>
            
            <button type="submit" className="btn btn-primary w-100 mt-3" disabled={loading}>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ShopRegistration;
