import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, X, Image as ImageIcon, CheckCircle } from 'lucide-react';
import { apiCall } from '../../services/api';

const CATEGORIES = [
  'Acoustic Guitar',
  'Electric Guitar',
  'Bass Guitar',
  'Keyboard',
  'Drum Kit',
  'Microphone',
  'Amplifier',
  'Other'
];

const CONDITIONS = [
  { value: 'new', label: 'Brand New (Unopened)' },
  { value: 'like_new', label: 'Like New (Mint Condition)' },
  { value: 'excellent', label: 'Excellent (Minor cosmetic signs)' },
  { value: 'good', label: 'Good (Fully functional, normal wear)' },
  { value: 'fair', label: 'Fair (Visible wear, works fine)' },
  { value: 'poor', label: 'Poor (Heavy wear, needs setup)' },
  { value: 'for_parts', label: 'For Parts / Not Working' }
];

const CreatePost = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    category: 'Electric Guitar',
    brand: '',
    model: '',
    condition: 'good',
    year: '',
    listingType: 'Sell',
    price: '',
    location: '',
    description: '',
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    setError('');
  };

  const handleFiles = (files) => {
    setError('');
    const newFiles = Array.from(files);
    
    // Filter valid image types and size (< 5MB)
    const validExtensions = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = [];

    for (const file of newFiles) {
      if (!validExtensions.includes(file.type)) {
        setError(`"${file.name}" is not a valid format. Only JPG, PNG, and WebP are allowed.`);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" exceeds 5 MB limit.`);
        return;
      }
      validFiles.push(file);
    }

    if (selectedImages.length + validFiles.length > 6) {
      setError('You can upload a maximum of 6 photos per listing.');
      return;
    }

    const updatedImages = [...selectedImages, ...validFiles];
    setSelectedImages(updatedImages);

    // Create object URLs for previews
    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleRemoveImage = (index, e) => {
    e.stopPropagation();
    const updatedImages = selectedImages.filter((_, i) => i !== index);
    const updatedPreviews = imagePreviews.filter((_, i) => i !== index);
    setSelectedImages(updatedImages);
    setImagePreviews(updatedPreviews);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedImages.length === 0) {
      setError('Please upload at least 1 photo of your instrument.');
      return;
    }

    if (parseFloat(formData.price) <= 0 || isNaN(formData.price)) {
      setError('Price must be greater than 0 LKR.');
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('Title', formData.title.trim());
      data.append('Category', formData.category.trim());
      data.append('Brand', formData.brand.trim());
      data.append('Model', formData.model.trim());
      data.append('Condition', formData.condition);
      if (formData.year) data.append('Year', formData.year);
      data.append('ListingType', formData.listingType);
      data.append('Price', formData.price);
      data.append('Location', formData.location.trim());
      data.append('Description', formData.description.trim());

      // Append image files
      selectedImages.forEach((file) => {
        data.append('Images', file);
      });

      await apiCall('/listings', {
        method: 'POST',
        body: data
      });

      setSuccess('Listing created successfully! Your item is now pending review.');
      setTimeout(() => {
        navigate('/dashboard/items');
      }, 1500);
    } catch (err) {
      console.error('Create listing error:', err);
      setError(err.message || 'Failed to create listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    color: '#ffffff',
    outline: 'none',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease'
  };

  const selectStyle = {
    ...inputStyle,
    background: '#1f1b2e',
    cursor: 'pointer'
  };

  const labelStyle = { fontSize: '0.95rem', color: '#eaeaea', fontWeight: '500' };

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Create New Post</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>List your instrument for sale, trade, or rent in Sri Lanka</p>
      </div>

      {error && (
        <div style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.15)', border: '1px solid rgba(255, 107, 107, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '14px', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ color: '#51cf66', background: 'rgba(81, 207, 102, 0.15)', border: '1px solid rgba(81, 207, 102, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '14px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <CheckCircle size={18} /> {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          multiple
          accept="image/jpeg,image/png,image/webp"
          style={{ display: 'none' }}
        />

        {/* Photos Box */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ 
            minHeight: '180px', 
            borderRadius: '12px', 
            border: isDragging ? '2px dashed var(--primary-hover, #a855f7)' : '2px dashed rgba(255, 255, 255, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            backgroundColor: isDragging ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0,0,0,0.25)',
            transition: 'all 0.3s ease',
            padding: '1.5rem',
            position: 'relative'
          }}
        >
          {selectedImages.length === 0 ? (
            <>
              <Upload size={42} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
              <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '500', margin: 0 }}>Click to browse or drag & drop photos here</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>Upload 1 to 6 photos (JPG, PNG, WebP up to 5MB each)</p>
            </>
          ) : (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#eaeaea', fontSize: '0.9rem', fontWeight: '500' }}>
                  {selectedImages.length} / 6 photos selected
                </span>
                {selectedImages.length < 6 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    + Add More
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {imagePreviews.map((src, idx) => (
                  <div key={idx} style={{ position: 'relative', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                    <img src={src} alt={`Preview ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={(e) => handleRemoveImage(idx, e)}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        border: 'none',
                        color: '#ff6b6b',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer'
                      }}
                      title="Remove photo"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
            <label style={labelStyle}>Listing Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Fender Player Stratocaster Polar White"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Category *</label>
            <select name="category" value={formData.category} onChange={handleChange} style={selectStyle}>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Brand *</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. Fender, Yamaha, Gibson"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Model *</label>
            <input
              type="text"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="e.g. Stratocaster, F310"
              required
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Condition *</label>
            <select name="condition" value={formData.condition} onChange={handleChange} style={selectStyle}>
              {CONDITIONS.map(cond => (
                <option key={cond.value} value={cond.value}>{cond.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Year (Optional)</label>
            <input
              type="number"
              name="year"
              value={formData.year}
              onChange={handleChange}
              placeholder="e.g. 2022"
              min="1900"
              max="2030"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Listing Type *</label>
            <select name="listingType" value={formData.listingType} onChange={handleChange} style={selectStyle}>
              <option value="Sell">Sell</option>
              <option value="Trade">Trade</option>
              <option value="Rent">Rent</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Price (LKR) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              placeholder="e.g. 185000"
              min="1"
              required
              style={inputStyle}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Location *</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g. Colombo, Kandy, Gampaha"
              required
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={labelStyle}>Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the instrument, accessories included, history, and current condition..."
            rows={5}
            required
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading}
          style={{ marginTop: '1rem', alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.8rem', fontSize: '1rem' }}
        >
          {loading ? (
            'Uploading & Creating...'
          ) : (
            <>
              <Plus size={20} />
              Create Post
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;
