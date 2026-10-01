import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, Plus, X, TrendingUp, Loader, Save, AlertTriangle } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useDashboard, isAdminUser } from '../../hooks/useDashboard';
import LocationPicker from '../../components/LocationPicker';
import { Skeleton, ErrorState } from '../../components/ui';

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

const EMPTY_FORM = {
  title: '', category: '', brand: '', model: '', condition: 'good', year: '',
  listingType: 'Sell', price: '', location: '', description: ''
};

// Form field -> backend multipart field name.
const API_FIELDS = {
  title: 'Title', description: 'Description', category: 'Category', brand: 'Brand', model: 'Model',
  condition: 'Condition', year: 'Year', listingType: 'ListingType', price: 'Price', location: 'Location'
};

// Changing these makes the backend re-run the AI checks.
const AI_FIELDS = ['price', 'category', 'brand', 'model', 'condition', 'year'];

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_YEAR = new Date().getFullYear() + 1;

const fmt = (n) => Math.round(n).toLocaleString('en-LK');
const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
const samePlace = (a, b) => !!a && !!b && Math.abs(a.lat - b.lat) < 1e-6 && Math.abs(a.lng - b.lng) < 1e-6;

const listingToForm = (l) => ({
  title: l.title ?? '',
  category: l.category ?? '',
  brand: l.brand ?? '',
  model: l.model ?? '',
  condition: l.condition || 'good',
  year: l.year != null ? String(l.year) : '',
  listingType: l.listingType || 'Sell',
  price: l.price != null ? String(l.price) : '',
  location: l.location ?? '',
  description: l.description ?? ''
});

// Short text about the AI result for the toast after saving.
const aiSummary = (dto) => {
  const parts = [`Status: ${dto.status}`];
  if (dto.trustScore != null) parts.push(`Trust ${dto.trustScore}/100${dto.trustWarning ? ' (warning)' : ''}`);
  if (dto.priceVerdict) parts.push(`Price: ${(VERDICT_STYLES[dto.priceVerdict] || VERDICT_STYLES.UNKNOWN).label}`);
  return parts.join(' · ');
};

const CreatePost = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { currentUser } = useDashboard();
  const fileInputRef = useRef(null);
  const savedRef = useRef(false);        // true after a successful save, so leaving is not blocked
  const previewsRef = useRef([]);        // object URLs to free when the page closes

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [original, setOriginal] = useState(null);
  const [position, setPosition] = useState(null);
  const [originalPosition, setOriginalPosition] = useState(null);
  const [existingImages, setExistingImages] = useState([]);
  const [removedImageIds, setRemovedImageIds] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]); // [{ file, preview }]
  const [listingStatus, setListingStatus] = useState('');
  const [sellerId, setSellerId] = useState(null);

  const [loadState, setLoadState] = useState(isEdit ? 'loading' : 'ready');
  const [loadError, setLoadError] = useState('');
  const [suggestions, setSuggestions] = useState({ categories: [], brands: [] });
  const [suggestionError, setSuggestionError] = useState('');

  const [isDragging, setIsDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [priceChecking, setPriceChecking] = useState(false);
  const [priceCheckResult, setPriceCheckResult] = useState(null);
  const [priceCheckError, setPriceCheckError] = useState('');

  // ── Loading ────────────────────────────────────────────────────────────────

  const loadSuggestions = useCallback(async () => {
    try {
      const data = await apiCall('/catalog');
      const list = Array.isArray(data) ? data : [];
      setSuggestions({
        categories: [...new Set(list.map((c) => c.category).filter(Boolean))].sort(),
        brands: [...new Set(list.map((c) => c.brand).filter(Boolean))].sort()
      });
      setSuggestionError('');
    } catch (err) {
      setSuggestionError(`Suggestions are not available (${err.message}). You can still type any category or brand.`);
    }
  }, []);

  // isActive() is false when the effect that started this request was cleaned up. Without it a late
  // answer (e.g. the second StrictMode request) could overwrite what the user already typed.
  const loadListing = useCallback(async (isActive = () => true) => {
    try {
      const data = await apiCall(`/listings/${id}`);
      if (!isActive()) return;
      const form = listingToForm(data);
      setFormData(form);
      setOriginal(form);
      const pos = data.latitude != null && data.longitude != null ? { lat: data.latitude, lng: data.longitude } : null;
      setPosition(pos);
      setOriginalPosition(pos);
      setExistingImages(data.images || []);
      setRemovedImageIds([]);
      setListingStatus(data.status);
      setSellerId(data.sellerId);
      setLoadState('ready');
    } catch (err) {
      if (!isActive()) return;
      setLoadError(err.status === 404 ? 'This listing does not exist or you cannot edit it.' : (err.message || 'Could not load the listing.'));
      setLoadState('error');
    }
  }, [id]);

  // Data loading: these set state only after the request finishes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    if (!isEdit) return undefined;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadListing(() => active);
    return () => { active = false; };
  }, [isEdit, loadListing]);

  // Admins only view and delete listings; they do not create or edit them here.
  useEffect(() => {
    if (isAdminUser(currentUser)) {
      toast.error('Admins cannot create or edit listings.');
      navigate('/dashboard/items', { replace: true });
    }
  }, [currentUser, navigate]);

  // Free photo previews when the page closes.
  useEffect(() => () => previewsRef.current.forEach((u) => URL.revokeObjectURL(u)), []);

  // ── Change tracking (edit mode) ─────────────────────────────────────────────

  const changedFields = useMemo(() => {
    if (!isEdit || !original) return [];
    return Object.keys(API_FIELDS).filter((k) => {
      const now = k === 'description' ? formData[k].trim() : clean(formData[k]);
      const before = k === 'description' ? original[k].trim() : clean(original[k]);
      // The API cannot clear these (an empty value means "not sent"), so empty is not a change.
      if (now === '' && (k === 'year' || k === 'description')) return false;
      if (k === 'price' || k === 'year') return now !== '' && Number(now) !== Number(before);
      return now !== before;
    });
  }, [isEdit, original, formData]);

  const pinChanged = isEdit && !!position && !samePlace(position, originalPosition);
  const photosChanged = removedImageIds.length > 0 || newPhotos.length > 0;
  const isDirty = isEdit
    ? changedFields.length > 0 || pinChanged || photosChanged
    : Object.keys(EMPTY_FORM).some((k) => clean(formData[k]) !== clean(EMPTY_FORM[k])) || newPhotos.length > 0 || !!position;

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    isDirty && !savedRef.current && currentLocation.pathname !== nextLocation.pathname);

  // Closing the tab / reloading with unsaved changes asks the browser to confirm.
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const isChanged = (k) => changedFields.includes(k);

  // ── Form handlers ──────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
    if (['brand', 'model', 'category', 'condition', 'price', 'year', 'description'].includes(name)) {
      setPriceCheckResult(null);
      setPriceCheckError('');
    }
  };

  const keptImages = existingImages.filter((img) => !removedImageIds.includes(img.id));
  const photoCount = keptImages.length + newPhotos.length;

  const addFiles = (files) => {
    setError('');
    const picked = Array.from(files);
    for (const file of picked) {
      if (!PHOTO_TYPES.includes(file.type)) {
        setError(`"${file.name}" is not a valid format. Only JPG, PNG and WebP are allowed.`);
        return;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        setError(`"${file.name}" is larger than 5 MB.`);
        return;
      }
    }
    if (photoCount + picked.length > MAX_PHOTOS) {
      setError(`You can have at most ${MAX_PHOTOS} photos per listing.`);
      return;
    }
    const added = picked.map((file) => {
      const preview = URL.createObjectURL(file);
      previewsRef.current.push(preview);
      return { file, preview };
    });
    setNewPhotos((prev) => [...prev, ...added]);
  };

  const removeNewPhoto = (index, e) => {
    e.stopPropagation();
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeExistingImage = (imageId, e) => {
    e.stopPropagation();
    setRemovedImageIds((prev) => [...prev, imageId]);
  };

  const handlePriceCheck = async () => {
    const { brand, model, category, condition } = formData;
    if (!clean(brand) || !clean(model) || !clean(category) || !condition) {
      setPriceCheckError('Please fill in Category, Brand, Model and Condition before checking the price.');
      return;
    }
    setPriceCheckError('');
    setPriceCheckResult(null);
    setPriceChecking(true);
    try {
      const result = await apiCall('/listings/price-check', {
        method: 'POST',
        body: JSON.stringify({
          brand: clean(brand),
          model: clean(model),
          category: clean(category),
          condition,
          year: formData.year ? parseInt(formData.year, 10) : null,
          price: formData.price ? parseFloat(formData.price) : 0,
          description: formData.description.trim()
        })
      });
      setPriceCheckResult(result);
    } catch (err) {
      setPriceCheckError(err.message || 'Price check failed. Please try again.');
    } finally {
      setPriceChecking(false);
    }
  };

  // Same rules as the backend, so most mistakes are caught before upload.
  const validate = () => {
    if (!clean(formData.title)) return 'Please enter a title.';
    if (!clean(formData.category)) return 'Please enter a category.';
    if (!clean(formData.brand)) return 'Please enter a brand.';
    if (!clean(formData.model)) return 'Please enter a model.';
    if (!isEdit && !formData.description.trim()) return 'Please enter a description.';
    const price = Number(formData.price);
    if (!formData.price || Number.isNaN(price) || price <= 0) return 'Price must be greater than 0 LKR.';
    if (formData.year) {
      const y = Number(formData.year);
      if (!Number.isInteger(y) || y < 1900 || y > MAX_YEAR) return `Year must be between 1900 and ${MAX_YEAR}.`;
    }
    if (!position) return 'Please drop a pin on the map for the location.';
    if (!clean(formData.location)) return 'Please enter a location name.';
    if (photoCount < 1) return 'Please add at least 1 photo.';
    if (photoCount > MAX_PHOTOS) return `You can have at most ${MAX_PHOTOS} photos.`;
    return null;
  };

  const goToMyListings = () => navigate('/dashboard/items?tab=mine', { state: { refreshAt: Date.now() } });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    if (isEdit && !isDirty) return;

    const data = new FormData();
    if (isEdit) {
      // Send ONLY what changed.
      changedFields.forEach((k) => data.append(API_FIELDS[k], k === 'description' ? formData[k].trim() : clean(formData[k])));
      if (pinChanged) {
        data.append('Latitude', position.lat);
        data.append('Longitude', position.lng);
      }
      removedImageIds.forEach((imageId) => data.append('RemoveImageIds', imageId));
      newPhotos.forEach(({ file }) => data.append('NewImages', file));
    } else {
      Object.keys(API_FIELDS).forEach((k) => {
        const value = k === 'description' ? formData[k].trim() : clean(formData[k]);
        if (value !== '') data.append(API_FIELDS[k], value);
      });
      data.append('Latitude', position.lat);
      data.append('Longitude', position.lng);
      newPhotos.forEach(({ file }) => data.append('Images', file));
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await apiCall(isEdit ? `/listings/${id}` : '/listings', { method: isEdit ? 'PATCH' : 'POST', body: data });
      savedRef.current = true;
      const aiRan = !isEdit || photosChanged || changedFields.some((k) => AI_FIELDS.includes(k));
      toast.success(
        `${isEdit ? 'Listing updated' : 'Listing created'}.${aiRan ? `\n${aiSummary(result)}` : ''}`,
        { duration: 7000 }
      );
      goToMyListings();
    } catch (err) {
      setError(err.message || (isEdit ? 'Failed to save changes.' : 'Failed to create the listing.'));
    } finally {
      setSubmitting(false);
    }
  };

  // ── Styles ─────────────────────────────────────────────────────────────────

  const inputStyle = {
    padding: '0.8rem 1rem',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.12)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    color: '#ffffff',
    outline: 'none',
    fontSize: '1rem',
    width: '100%',
    boxSizing: 'border-box'
  };
  const changedStyle = (k) => (isChanged(k) ? { ...inputStyle, border: '1px solid #a855f7', boxShadow: '0 0 0 1px #a855f7' } : inputStyle);
  const selectStyle = (k) => ({ ...changedStyle(k), background: '#1f1b2e', cursor: 'pointer' });
  const labelStyle = { fontSize: '0.95rem', color: '#eaeaea', fontWeight: '500' };
  const changedTag = (field) => (isChanged(field) ? <span style={{ color: '#c084fc', fontSize: '0.75rem', marginLeft: '6px' }}>• changed</span> : null);

  const verdictStyle = priceCheckResult ? (VERDICT_STYLES[priceCheckResult.verdict] || VERDICT_STYLES.UNKNOWN) : VERDICT_STYLES.UNKNOWN;

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isEdit && loadState === 'loading') {
    return (
      <div data-testid="edit-skeleton" style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <Skeleton height="44px" width="50%" />
        <Skeleton height="180px" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height="48px" />)}
        </div>
        <Skeleton height="280px" />
      </div>
    );
  }

  if (isEdit && loadState === 'error') {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <ErrorState message={loadError} onRetry={() => { setLoadState('loading'); loadListing(); }} />
      </div>
    );
  }

  const notOwner = isEdit && currentUser && sellerId != null && currentUser.id !== sellerId;
  if (isEdit && (listingStatus === 'SOLD' || notOwner)) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <ErrorState message={listingStatus === 'SOLD' ? 'This item is sold, so it cannot be edited.' : 'You can only edit your own listings.'} />
        <button type="button" className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={goToMyListings}>Back to My Listings</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>{isEdit ? 'Edit Post' : 'Create New Post'}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          {isEdit ? 'Change only what you need. Only changed fields are saved.' : 'List your instrument for sale, trade, or rent in Sri Lanka'}
        </p>
      </div>

      {error && <ErrorState compact message={error} />}

      <form onSubmit={handleSubmit} noValidate className="glass-panel" style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
          multiple
          accept={PHOTO_TYPES.join(',')}
          style={{ display: 'none' }}
          data-testid="photo-input"
        />

        {/* Photos */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
          style={{
            minHeight: '160px', borderRadius: '12px', padding: '1.5rem', cursor: 'pointer',
            border: isDragging ? '2px dashed #a855f7' : `2px dashed ${photosChanged && isEdit ? '#a855f7' : 'rgba(255, 255, 255, 0.3)'}`,
            backgroundColor: isDragging ? 'rgba(168, 85, 247, 0.15)' : 'rgba(0,0,0,0.25)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {photoCount === 0 ? (
            <>
              <Upload size={42} style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem' }} />
              <p style={{ color: '#fff', margin: 0 }}>Click to browse or drag &amp; drop photos here</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>1 to 6 photos (JPG, PNG, WebP up to 5 MB each)</p>
            </>
          ) : (
            <div style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ color: '#eaeaea', fontSize: '0.9rem' }}>{photoCount} / {MAX_PHOTOS} photos</span>
                {photoCount < MAX_PHOTOS && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                    + Add photos
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {keptImages.map((img) => (
                  <div key={`old-${img.id}`} style={{ position: 'relative', height: '100px', borderRadius: '8px', overflow: 'hidden' }}>
                    <img src={img.url} alt="Listing" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" aria-label="Remove photo" title="Remove photo" onClick={(e) => removeExistingImage(img.id, e)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff6b6b', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {newPhotos.map((p, idx) => (
                  <div key={p.preview} style={{ position: 'relative', height: '100px', borderRadius: '8px', overflow: 'hidden', outline: isEdit ? '2px solid #a855f7' : 'none' }}>
                    <img src={p.preview} alt={`New photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" aria-label="Remove photo" title="Remove photo" onClick={(e) => removeNewPhoto(idx, e)}
                      style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ff6b6b', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
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
            <label htmlFor="f-title" style={labelStyle}>Listing Title *{changedTag('title')}</label>
            <input id="f-title" type="text" name="title" value={formData.title} onChange={handleChange} maxLength={120}
              placeholder="e.g. Fender Player Stratocaster Polar White" style={changedStyle('title')} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="f-category" style={labelStyle}>Category *{changedTag('category')}</label>
            <input id="f-category" type="text" name="category" list="category-suggestions" value={formData.category} onChange={handleChange}
              placeholder="e.g. Electric Guitar, Sitar, Ukulele" maxLength={50} style={changedStyle('category')} autoComplete="off" />
            <datalist id="category-suggestions">
              {suggestions.categories.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="f-brand" style={labelStyle}>Brand *{changedTag('brand')}</label>
            <input id="f-brand" type="text" name="brand" list="brand-suggestions" value={formData.brand} onChange={handleChange}
              placeholder="e.g. Fender, Yamaha, any brand" maxLength={50} style={changedStyle('brand')} autoComplete="off" />
            <datalist id="brand-suggestions">
              {suggestions.brands.map((b) => <option key={b} value={b} />)}
            </datalist>
          </div>

          {suggestionError && (
            <div style={{ gridColumn: 'span 2', color: '#ffd43b', fontSize: '0.85rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {suggestionError}
              <button type="button" className="btn btn-outline" style={{ padding: '2px 10px' }} onClick={loadSuggestions}>Retry</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="f-model" style={labelStyle}>Model *{changedTag('model')}</label>
            <input id="f-model" type="text" name="model" value={formData.model} onChange={handleChange} maxLength={80}
              placeholder="e.g. Stratocaster, F310" style={changedStyle('model')} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="f-condition" style={labelStyle}>Condition *{changedTag('condition')}</label>
            <select id="f-condition" name="condition" value={formData.condition} onChange={handleChange} style={selectStyle('condition')}>
              {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="f-year" style={labelStyle}>Year (optional){changedTag('year')}</label>
            <input id="f-year" type="number" name="year" value={formData.year} onChange={handleChange}
              placeholder="e.g. 2022" min="1900" max={MAX_YEAR} style={changedStyle('year')} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label htmlFor="f-type" style={labelStyle}>Listing Type *{changedTag('listingType')}</label>
            <select id="f-type" name="listingType" value={formData.listingType} onChange={handleChange} style={selectStyle('listingType')}>
              <option value="Sell">Sell</option>
              <option value="Trade">Trade</option>
              <option value="Rent">Rent</option>
            </select>
          </div>

          {/* Price + Check Price */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
            <label htmlFor="f-price" style={labelStyle}>Price (LKR) *{changedTag('price')}</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input id="f-price" type="number" name="price" value={formData.price} onChange={handleChange}
                placeholder="e.g. 185000" min="1" style={{ ...changedStyle('price'), flex: 1 }} />
              <button type="button" id="btn-price-check" onClick={handlePriceCheck} disabled={priceChecking}
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: '8px', color: '#fff', padding: '0 14px', cursor: priceChecking ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', whiteSpace: 'nowrap', opacity: priceChecking ? 0.7 : 1 }}>
                {priceChecking ? <><Loader size={15} className="animate-spin" /> Checking...</> : <><TrendingUp size={15} /> Check Price</>}
              </button>
            </div>
            {priceChecking && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0 0' }}>Checking the market price… this can take up to a minute.</p>}
            {priceCheckError && <ErrorState compact message={priceCheckError} onRetry={handlePriceCheck} />}
          </div>
        </div>

        {priceCheckResult && (
          <div data-testid="price-check-result" style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${verdictStyle.border}`, borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontWeight: '700', color: '#fff' }}>AI Price Analysis</span>
              <span style={{ background: verdictStyle.bg, color: verdictStyle.color, border: `1px solid ${verdictStyle.border}`, padding: '4px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '700' }}>
                {verdictStyle.label}
              </span>
            </div>
            {priceCheckResult.fair_price > 0 ? (
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Fair Range</div>
                  <div style={{ color: '#fff', fontWeight: '700' }}>LKR {fmt(priceCheckResult.fair_range.min)} – {fmt(priceCheckResult.fair_range.max)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Suggested Price</div>
                  <div style={{ color: '#a855f7', fontWeight: '700' }}>LKR {fmt(priceCheckResult.fair_price)}</div>
                </div>
                {priceCheckResult.verdict !== 'UNKNOWN' && formData.price && (
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>Your price vs fair</div>
                    <div style={{ color: verdictStyle.color, fontWeight: '700' }}>
                      {priceCheckResult.deviation_percent > 0 ? '+' : ''}{Number(priceCheckResult.deviation_percent).toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No reference price was found for this item, so there is no suggested price.</div>
            )}
            {priceCheckResult.explanation && <p style={{ color: '#c8c8c8', fontSize: '0.88rem', margin: 0, lineHeight: 1.6 }}>{priceCheckResult.explanation}</p>}
            {priceCheckResult.fair_price > 0 && (
              <button type="button" id="btn-use-suggested-price"
                onClick={() => setFormData((prev) => ({ ...prev, price: String(Math.round(priceCheckResult.fair_price)) }))}
                style={{ alignSelf: 'flex-start', background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.5)', color: '#c084fc', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontWeight: '600' }}>
                Use Suggested Price (LKR {fmt(priceCheckResult.fair_price)})
              </button>
            )}
          </div>
        )}

        {/* One location section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={labelStyle}>Location *{changedTag('location')}{pinChanged && <span style={{ color: '#c084fc', fontSize: '0.75rem', marginLeft: '6px' }}>• pin moved</span>}</span>
          <LocationPicker
            position={position}
            onPositionChange={setPosition}
            label={formData.location}
            onLabelChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
            inputStyle={changedStyle('location')}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label htmlFor="f-description" style={labelStyle}>Description *{changedTag('description')}</label>
          <textarea id="f-description" name="description" value={formData.description} onChange={handleChange} rows={5} maxLength={4000}
            placeholder="Describe the instrument, accessories included, history and current condition..."
            style={{ ...changedStyle('description'), resize: 'vertical' }} />
        </div>

        {submitting && (
          <p style={{ color: 'var(--text-secondary)', margin: 0, textAlign: 'right' }}>
            Saving{(!isEdit || changedFields.some((k) => AI_FIELDS.includes(k)) || photosChanged) ? ' and running the AI price and trust checks – this can take up to 2 minutes' : ''}…
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" className="btn btn-outline" onClick={() => (isEdit ? goToMyListings() : navigate(-1))} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" data-testid="submit-listing"
            disabled={submitting || (isEdit && !isDirty)}
            title={isEdit && !isDirty ? 'Change something first' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.8rem 1.8rem', opacity: submitting || (isEdit && !isDirty) ? 0.6 : 1 }}>
            {submitting ? <Loader size={18} className="animate-spin" /> : isEdit ? <Save size={18} /> : <Plus size={18} />}
            {submitting ? (isEdit ? 'Saving...' : 'Creating...') : isEdit ? 'Save Changes' : 'Create Post'}
          </button>
        </div>
      </form>

      {/* Unsaved-changes prompt for in-app navigation */}
      {blocker.state === 'blocked' && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(8, 6, 15, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
          <div className="glass-panel" style={{ maxWidth: '420px', padding: '2rem', borderRadius: '20px', textAlign: 'center' }}>
            <AlertTriangle size={40} style={{ color: '#ffd43b', marginBottom: '0.75rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Leave without saving?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Your changes will be lost.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => blocker.reset()}>Stay</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1, background: '#ff6b6b' }} onClick={() => blocker.proceed()}>Leave</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePost;
