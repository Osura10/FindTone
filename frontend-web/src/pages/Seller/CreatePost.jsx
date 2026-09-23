import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus } from 'lucide-react';
import { apiCall } from '../../services/api';

const CreatePost = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    brand: '',
    model: '',
    condition: 'New',
    year: '',
    listingType: 'Sell',
    price: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    // Guard: Only Shops can access Create Post
    apiCall('/auth/me').then(user => {
      if (user && user.role !== 'shop') {
        navigate('/dashboard/items');
      }
    }).catch(() => {
      navigate('/login');
    });
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Post created successfully! (Dummy action)');
    // Form submission logic will go here
  };

  const inputStyle = {
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.12)', /* Increased for better visibility */
    border: '1px solid rgba(255, 255, 255, 0.35)', /* Brighter border */
    color: '#ffffff',
    outline: 'none',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease'
  };

  const selectStyle = {
    ...inputStyle,
    background: '#1f1b2e', /* Solid background for select dropdown */
    cursor: 'pointer'
  };

  const labelStyle = { fontSize: '0.95rem', color: '#eaeaea', fontWeight: '500' };

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '3.5rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Create New Post</h1>
      </div>
      
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Photos Box */}
        <div style={{ 
          height: '200px', 
          borderRadius: '12px', 
          border: '2px dashed var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: 'rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease',
          marginBottom: '1rem'
        }}
        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary-hover)'}
        onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
        >
          <Upload size={40} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Click to upload photos</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Item Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Fender Stratocaster" required style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Category</label>
            <input type="text" name="category" value={formData.category} onChange={handleChange} placeholder="e.g. Guitars" required style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Brand</label>
            <input type="text" name="brand" value={formData.brand} onChange={handleChange} placeholder="e.g. Fender" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Model</label>
            <input type="text" name="model" value={formData.model} onChange={handleChange} placeholder="e.g. Stratocaster" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Condition</label>
            <select name="condition" value={formData.condition} onChange={handleChange} style={selectStyle}>
              <option value="New">New</option>
              <option value="Used">Used</option>
              <option value="For Parts">For Parts</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Year</label>
            <input type="number" name="year" value={formData.year} onChange={handleChange} placeholder="e.g. 2020" style={inputStyle} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Listing Type</label>
            <select name="listingType" value={formData.listingType} onChange={handleChange} style={selectStyle}>
              <option value="Sell">Sell</option>
              <option value="Rent">Rent</option>
              <option value="Trade">Trade</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Price ($)</label>
            <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="e.g. 500" required style={inputStyle} />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
            <label style={labelStyle}>Location</label>
            <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g. New York, NY" required style={inputStyle} />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={labelStyle}>Description</label>
          <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe the item, features, and condition..." rows={5} required style={{...inputStyle, resize: 'vertical'}} />
        </div>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', alignSelf: 'flex-end' }}>
          <Plus size={20} />
          Create Post
        </button>
      </form>
    </div>
  );
};

export default CreatePost;
