import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, X, CheckCircle, TrendingUp, Loader } from 'lucide-react';
import { apiCall } from '../../services/api';

const CONDITIONS = [
  { value: 'new', label: 'Brand New (Unopened)' },
  { value: 'like_new', label: 'Like New (Mint Condition)' },
  { value: 'excellent', label: 'Excellent (Minor cosmetic signs)' },
  { value: 'good', label: 'Good (Fully functional, normal wear)' },
  { value: 'fair', label: 'Fair (Visible wear, works fine)' },
  { value: 'poor', label: 'Poor (Heavy wear, needs setup)' },
  { value: 'for_parts', label: 'For Parts / Not Working' }
];

const VERDICT_STYLES = {
  SUSPICIOUSLY_LOW: { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Suspiciously Low' },
  GREAT_DEAL:       { bg: 'rgba(81,207,102,0.2)',  color: '#51cf66', border: 'rgba(81,207,102,0.4)',  label: 'Great Deal' },
  FAIR:             { bg: 'rgba(81,207,102,0.2)',  color: '#51cf66', border: 'rgba(81,207,102,0.4)',  label: 'Fair Price' },
  SLIGHTLY_HIGH:    { bg: 'rgba(255,212,59,0.2)',  color: '#ffd43b', border: 'rgba(255,212,59,0.4)',  label: 'Slightly High' },
  OVERPRICED:       { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Overpriced' },
  UNKNOWN:          { bg: 'rgba(134,142,150,0.2)', color: '#adb5bd', border: 'rgba(134,142,150,0.4)', label: 'Unknown' },
};

const fmt = (n) => Math.round(n).toLocaleString('en-LK');

const CreatePost = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    brand: '',
    model: '',
    condition: 'good',
    year: '',
    listingType: 'Sell',
    price: '',
    location: '',
    description: '',
  });

  const [categories, setCategories] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Price-check state
  const [priceChecking, setPriceChecking] = useState(false);
  const [priceCheckResult, setPriceCheckResult] = useState(null);
  const [priceCheckError, setPriceCheckError] = useState('');

  useEffect(() => {
    // Guard: Both Shops and Buyers can access Create Post
    apiCall('/auth/me').then(user => {
      if (user && !['shop', 'buyer'].includes(user.role)) {
        navigate('/dashboard/items');
      }
    }).catch(() => {
      navigate('/login');
    });

    // Fetch categories
    apiCall('/catalog').then(data => {
      if (Array.isArray(data)) {
        const uniqueCategories = [...new Set(data.map(item => item.category))].filter(Boolean);
        setCategories(uniqueCategories);
        if (uniqueCategories.length > 0) {
          setFormData(prev => ({ ...prev, category: uniqueCategories[0] }));
        }
      }
    }).catch(err => console.error('Failed to fetch catalog categories', err));
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
    // Clear price check when relevant fields change
    if (['brand', 'model', 'category', 'condition', 'price', 'year', 'description'].includes(e.target.name)) {
      setPriceCheckResult(null);
      setPriceCheckError('');
    }
  };

  const handleFiles = (files) => {
    setError('');
    const newFiles = Array.from(files);
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

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handlePriceCheck = async () => {
    const { brand, model, category, condition } = formData;
    if (!brand.trim() || !model.trim() || !category || !condition) {
      setPriceCheckError('Please fill in Brand, Model, Category, and Condition before checking the price.');
      return;
    }
    setPriceCheckError('');
    setPriceCheckResult(null);
    setPriceChecking(true);
    try {
      const result = await apiCall('/listings/price-check', {
        method: 'POST',
        body: JSON.stringify({
          brand: formData.brand.trim(),
          model: formData.model.trim(),
          category: formData.category,
          condition: formData.condition,
          year: formData.year ? parseInt(formData.year, 10) : null,
          price: formData.price ? parseFloat(formData.price) : 0,
          description: formData.description.trim(),
        }),
      });
      setPriceCheckResult(result);
    } catch (err) {
      setPriceCheckError(err.message || 'Price check failed. Please try again.');
    } finally {
      setPriceChecking(false);
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

  const verdictStyle = priceCheckResult
    ? (VERDICT_STYLES[priceCheckResult.verdict] || VERDICT_STYLES.UNKNOWN)
    : VERDICT_STYLES.UNKNOWN;

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
              <p style={{ color: '#fff', fontSize: '1rem', fontWeight: '500', margin: 0 }}>Click to browse or drag &amp; drop photos here</p>
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
            <select name="category" value={formData.category} onChange={handleChange} style={selectStyle} required>
              <option value="" disabled>Select a category</option>
              {categories.map(cat => (
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

          {/* Price field + Check Price button */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={labelStyle}>Price (LKR) *</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'stretch' }}>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g. 185000"
                min="1"
                required
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                type="button"
                id="btn-price-check"
                onClick={handlePriceCheck}
                disabled={priceChecking}
                title="Check fair market price with AI"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '0 14px',
                  cursor: priceChecking ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  opacity: priceChecking ? 0.7 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {priceChecking
                  ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Checking...</>
                  : <><TrendingUp size={15} /> Check Price</>
                }
              </button>
            </div>

            {/* Spinner hint */}
            {priceChecking && (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                Checking market price… this can take up to 30 s.
              </p>
            )}

            {/* Price-check inline error */}
            {priceCheckError && (
              <div style={{ color: '#ffd43b', background: 'rgba(255,212,59,0.12)', border: '1px solid rgba(255,212,59,0.3)', borderRadius: '8px', padding: '8px 12px', fontSize: '0.85rem', marginTop: '4px' }}>
                {priceCheckError}
              </div>
            )}
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

        {/* Price-check result card */}
        {priceCheckResult && (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${verdictStyle.border}`,
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            animation: 'fadeIn 0.4s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>AI Price Analysis</span>
              <span style={{
                background: verdictStyle.bg,
                color: verdictStyle.color,
                border: `1px solid ${verdictStyle.border}`,
                padding: '4px 14px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '700',
                letterSpacing: '0.5px'
              }}>
                {verdictStyle.label}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '2px' }}>Fair Range</div>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '1rem' }}>
                  LKR {fmt(priceCheckResult.fair_range.min)} – {fmt(priceCheckResult.fair_range.max)}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '2px' }}>Suggested Price</div>
                <div style={{ color: '#a855f7', fontWeight: '700', fontSize: '1rem' }}>
                  LKR {fmt(priceCheckResult.fair_price)}
                </div>
              </div>
              {priceCheckResult.deviation_percent !== undefined && priceCheckResult.verdict !== 'UNKNOWN' && (
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginBottom: '2px' }}>Deviation</div>
                  <div style={{ color: verdictStyle.color, fontWeight: '700', fontSize: '1rem' }}>
                    {priceCheckResult.deviation_percent > 0 ? '+' : ''}{priceCheckResult.deviation_percent.toFixed(1)}%
                  </div>
                </div>
              )}
            </div>

            {priceCheckResult.explanation && (
              <p style={{ color: '#c8c8c8', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>
                {priceCheckResult.explanation}
              </p>
            )}

            {priceCheckResult.verdict !== 'UNKNOWN' && priceCheckResult.fair_price > 0 && (
              <button
                type="button"
                id="btn-use-suggested-price"
                onClick={() => setFormData(prev => ({ ...prev, price: String(Math.round(priceCheckResult.fair_price)) }))}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(168,85,247,0.2)',
                  border: '1px solid rgba(168,85,247,0.5)',
                  color: '#c084fc',
                  borderRadius: '8px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
              >
                Use suggested price (LKR {fmt(priceCheckResult.fair_price)})
              </button>
            )}
          </div>
        )}

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
