import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Upload, Plus, X, TrendingUp, Save, AlertTriangle, Check, Sparkles } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useDashboard, isAdminUser } from '../../hooks/useDashboard';
import LocationPicker from '../../components/LocationPicker';
import {
  Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Skeleton, StatusBadge, Textarea,
  formatLKR, verdictInfo
} from '../../components/ui';

const CONDITIONS = [
  { value: 'new', label: 'Brand New (Unopened)' },
  { value: 'like_new', label: 'Like New (Mint Condition)' },
  { value: 'excellent', label: 'Excellent (Minor cosmetic signs)' },
  { value: 'good', label: 'Good (Fully functional, normal wear)' },
  { value: 'fair', label: 'Fair (Visible wear, works fine)' },
  { value: 'poor', label: 'Poor (Heavy wear, needs setup)' },
  { value: 'for_parts', label: 'For Parts / Not Working' }
];

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
  if (dto.priceVerdict) parts.push(`Price: ${verdictInfo(dto.priceVerdict).label}`);
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

  // ── Presentation helpers ───────────────────────────────────────────────────

  const changedTag = (field) => (isChanged(field) ? <span className="changed-tag">• changed</span> : null);
  const fieldClass = (k) => (isChanged(k) ? 'changed' : '');
  const verdict = priceCheckResult ? verdictInfo(priceCheckResult.verdict) : null;

  // Progress shown in the step bar (purely visual).
  const steps = [
    { id: 'sec-photos', label: 'Photos', done: photoCount > 0 },
    { id: 'sec-details', label: 'Details', done: !!(clean(formData.title) && clean(formData.category) && clean(formData.brand) && clean(formData.model)) },
    { id: 'sec-price', label: 'Price', done: Number(formData.price) > 0 },
    { id: 'sec-location', label: 'Location', done: !!position && !!clean(formData.location) },
    { id: 'sec-description', label: 'Description', done: !!formData.description.trim() }
  ];
  const sectionHead = (n, title, hint) => (
    <div className="section-head">
      <div className="row" style={{ gap: 12, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <span className={`step-badge ${steps[n - 1].done ? 'done' : ''}`} aria-hidden="true">{steps[n - 1].done ? <Check size={14} /> : n}</span>
        <div>
          <h2 className="section-title">{title}</h2>
          {hint && <p className="text-sm muted">{hint}</p>}
        </div>
      </div>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isEdit && loadState === 'loading') {
    return (
      <div data-testid="edit-skeleton" className="page page-narrow" aria-busy="true">
        <Skeleton height="40px" width="45%" />
        <Skeleton height="44px" radius="var(--radius-full)" />
        <Skeleton height="200px" radius="var(--radius-lg)" />
        <Skeleton height="320px" radius="var(--radius-lg)" />
      </div>
    );
  }

  if (isEdit && loadState === 'error') {
    return (
      <div className="page page-narrow">
        <Card><ErrorState message={loadError} onRetry={() => { setLoadState('loading'); loadListing(); }} /></Card>
      </div>
    );
  }

  const notOwner = isEdit && currentUser && sellerId != null && currentUser.id !== sellerId;
  if (isEdit && (listingStatus === 'SOLD' || notOwner)) {
    return (
      <div className="page page-narrow">
        <Card>
          <EmptyState
            icon={AlertTriangle}
            title={listingStatus === 'SOLD' ? 'This item is sold' : 'Not your listing'}
            description={listingStatus === 'SOLD' ? 'This item is sold, so it cannot be edited.' : 'You can only edit your own listings.'}
            action={<Button variant="secondary" onClick={goToMyListings}>Back to My Listings</Button>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="page page-narrow">
      <PageHeader
        title={isEdit ? 'Edit listing' : 'Sell an instrument'}
        subtitle={isEdit ? 'Change only what you need – only changed fields are saved.' : 'List your instrument for sale, trade or rent anywhere in Sri Lanka.'}
        actions={isEdit && listingStatus && <StatusBadge status={listingStatus} />}
      />

      <nav className="stepper" aria-label="Form sections">
        {steps.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className={`step ${s.done ? 'done' : ''}`}>
            <span className="num">{s.done ? <Check size={12} aria-hidden="true" /> : i + 1}</span>{s.label}
          </a>
        ))}
      </nav>

      <form onSubmit={handleSubmit} noValidate className="stack" style={{ gap: 'var(--space-5)' }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ''; }}
          multiple
          accept={PHOTO_TYPES.join(',')}
          style={{ display: 'none' }}
          data-testid="photo-input"
        />

        {/* 1. Photos */}
        <Card as="section" id="sec-photos" className="form-section">
          {sectionHead(1, 'Photos', `1 to ${MAX_PHOTOS} photos · JPG, PNG or WebP up to 5 MB each. The first photo is the cover.`)}
          <div
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            style={photosChanged && isEdit ? { borderColor: 'var(--primary)' } : undefined}
            role="button"
            tabIndex={0}
            aria-label="Add photos"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files); }}
          >
            {photoCount === 0 ? (
              <div className="stack-sm" style={{ alignItems: 'center' }}>
                <span className="page-icon"><Upload size={22} aria-hidden="true" /></span>
                <strong>Click to browse or drag &amp; drop photos here</strong>
                <span className="text-sm muted">Clear, real photos make your listing trusted faster.</span>
              </div>
            ) : (
              <div className="stack-sm" style={{ textAlign: 'left' }}>
                <div className="row-between">
                  <span className="text-sm muted">{photoCount} / {MAX_PHOTOS} photos{isEdit && photosChanged ? ' · changed' : ''}</span>
                  {photoCount < MAX_PHOTOS && (
                    <Button variant="secondary" size="sm" icon={Plus} onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>Add photos</Button>
                  )}
                </div>
                <div className="photo-grid">
                  {keptImages.map((img, i) => (
                    <div key={`old-${img.id}`} className="photo-tile">
                      <img src={img.url} alt={`Photo ${i + 1}`} />
                      {i === 0 && <span className="badge media-badge photo-cover">Cover</span>}
                      <button type="button" className="remove" aria-label="Remove photo" title="Remove photo" onClick={(e) => removeExistingImage(img.id, e)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {newPhotos.map((p, idx) => (
                    <div key={p.preview} className={`photo-tile ${isEdit ? 'new' : ''}`}>
                      <img src={p.preview} alt={`New photo ${idx + 1}`} />
                      {keptImages.length === 0 && idx === 0 && <span className="badge media-badge photo-cover">Cover</span>}
                      <button type="button" className="remove" aria-label="Remove photo" title="Remove photo" onClick={(e) => removeNewPhoto(idx, e)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Details */}
        <Card as="section" id="sec-details" className="form-section">
          {sectionHead(2, 'Details', 'What are you selling?')}
          <div className="form-grid">
            <Input
              id="f-title" name="title" label="Listing title" required extra={changedTag('title')} fieldClassName={`span-2 ${fieldClass('title')}`}
              value={formData.title} onChange={handleChange} maxLength={120} placeholder="e.g. Fender Player Stratocaster Polar White"
            />
            <Input
              id="f-category" name="category" label="Category" required extra={changedTag('category')} fieldClassName={fieldClass('category')}
              list="category-suggestions" value={formData.category} onChange={handleChange} placeholder="e.g. Electric Guitar, Sitar, Ukulele" maxLength={50} autoComplete="off"
            />
            <datalist id="category-suggestions">
              {suggestions.categories.map((c) => <option key={c} value={c} />)}
            </datalist>
            <Input
              id="f-brand" name="brand" label="Brand" required extra={changedTag('brand')} fieldClassName={fieldClass('brand')}
              list="brand-suggestions" value={formData.brand} onChange={handleChange} placeholder="e.g. Fender, Yamaha, any brand" maxLength={50} autoComplete="off"
            />
            <datalist id="brand-suggestions">
              {suggestions.brands.map((b) => <option key={b} value={b} />)}
            </datalist>

            {suggestionError && (
              <div className="alert alert-warning span-2">
                <span className="grow">{suggestionError}</span>
                <Button variant="secondary" size="sm" onClick={loadSuggestions}>Retry</Button>
              </div>
            )}

            <Input
              id="f-model" name="model" label="Model" required extra={changedTag('model')} fieldClassName={fieldClass('model')}
              value={formData.model} onChange={handleChange} maxLength={80} placeholder="e.g. Stratocaster, F310"
            />
            <Select
              id="f-condition" name="condition" label="Condition" required extra={changedTag('condition')} fieldClassName={fieldClass('condition')}
              value={formData.condition} onChange={handleChange} options={CONDITIONS}
            />
            <Input
              id="f-year" name="year" type="number" label="Year" hint="Optional" extra={changedTag('year')} fieldClassName={fieldClass('year')}
              value={formData.year} onChange={handleChange} placeholder="e.g. 2022" min="1900" max={MAX_YEAR}
            />
            <Select
              id="f-type" name="listingType" label="Listing type" required extra={changedTag('listingType')} fieldClassName={fieldClass('listingType')}
              value={formData.listingType} onChange={handleChange} options={['Sell', 'Trade', 'Rent']}
            />
          </div>
        </Card>

        {/* 3. Price */}
        <Card as="section" id="sec-price" className="form-section">
          {sectionHead(3, 'Price', 'Not sure? Let our AI check the market price for you.')}
          <div className={`field ${fieldClass('price')}`}>
            <label className="field-label" htmlFor="f-price">Price (LKR)<span className="req" aria-hidden="true">*</span>{changedTag('price')}</label>
            <div className="price-row">
              <div className="input-prefix grow">
                <span aria-hidden="true">LKR</span>
                <input id="f-price" className="input" type="number" name="price" value={formData.price} onChange={handleChange} placeholder="e.g. 185000" min="1" />
              </div>
              <Button variant="secondary" id="btn-price-check" icon={TrendingUp} loading={priceChecking} onClick={handlePriceCheck}>
                {priceChecking ? 'Checking…' : 'Check price'}
              </Button>
            </div>
            {priceChecking && <span className="field-hint">Checking the market price… this can take up to a minute.</span>}
          </div>
          {priceCheckError && <div style={{ marginTop: 'var(--space-3)' }}><ErrorState compact message={priceCheckError} onRetry={handlePriceCheck} /></div>}

          {priceCheckResult && (
            <div data-testid="price-check-result" className="price-result">
              <div className="row-between">
                <strong className="row" style={{ gap: 6 }}><Sparkles size={16} aria-hidden="true" color="var(--primary-text)" /> AI price analysis</strong>
                <Badge variant={verdict.variant}>{verdict.label}</Badge>
              </div>
              {priceCheckResult.fair_price > 0 ? (
                <dl className="spec-grid">
                  <div className="spec"><dt>Fair range</dt><dd>{formatLKR(priceCheckResult.fair_range.min)} – {formatLKR(priceCheckResult.fair_range.max)}</dd></div>
                  <div className="spec"><dt>Suggested price</dt><dd style={{ color: 'var(--primary-text)' }}>{formatLKR(priceCheckResult.fair_price)}</dd></div>
                  {priceCheckResult.verdict !== 'UNKNOWN' && formData.price && (
                    <div className="spec"><dt>Your price vs fair</dt><dd style={{ color: `var(--${verdict.variant === 'neutral' ? 'text' : verdict.variant})` }}>
                      {priceCheckResult.deviation_percent > 0 ? '+' : ''}{Number(priceCheckResult.deviation_percent).toFixed(1)}%
                    </dd></div>
                  )}
                </dl>
              ) : (
                <p className="text-sm muted">No reference price was found for this item, so there is no suggested price.</p>
              )}
              {priceCheckResult.explanation && <p className="text-sm" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>{priceCheckResult.explanation}</p>}
              {priceCheckResult.fair_price > 0 && (
                <div>
                  <Button variant="secondary" size="sm" id="btn-use-suggested-price"
                    onClick={() => setFormData((prev) => ({ ...prev, price: String(Math.round(priceCheckResult.fair_price)) }))}>
                    Use suggested price ({formatLKR(priceCheckResult.fair_price)})
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* 4. Location */}
        <Card as="section" id="sec-location" className="form-section">
          {sectionHead(4, 'Location', 'Where can buyers see or collect it?')}
          {pinChanged && <p className="changed-tag" style={{ marginLeft: 0, marginBottom: 8 }}>• pin moved</p>}
          <LocationPicker
            position={position}
            onPositionChange={setPosition}
            label={formData.location}
            onLabelChange={(value) => setFormData((prev) => ({ ...prev, location: value }))}
            changed={isChanged('location')}
          />
        </Card>

        {/* 5. Description */}
        <Card as="section" id="sec-description" className="form-section">
          {sectionHead(5, 'Description', 'Accessories, history, repairs and current condition.')}
          <Textarea
            id="f-description" name="description" label="Description" required extra={changedTag('description')} fieldClassName={fieldClass('description')}
            value={formData.description} onChange={handleChange} rows={6} maxLength={4000}
            placeholder="Describe the instrument, accessories included, history and current condition…"
            hint={`${formData.description.length} / 4000`}
          />
        </Card>

        {error && <ErrorState compact message={error} />}

        <div className="sticky-actions">
          {submitting && (
            <span className="text-sm muted grow" role="status">
              Saving{(!isEdit || changedFields.some((k) => AI_FIELDS.includes(k)) || photosChanged) ? ' and running the AI price and trust checks – this can take up to 2 minutes' : ''}…
            </span>
          )}
          {!submitting && isEdit && <span className="text-sm muted grow">{isDirty ? 'You have unsaved changes.' : 'No changes yet.'}</span>}
          <Button variant="secondary" onClick={() => (isEdit ? goToMyListings() : navigate(-1))} disabled={submitting}>Cancel</Button>
          <Button
            type="submit"
            data-testid="submit-listing"
            icon={isEdit ? Save : Plus}
            loading={submitting}
            disabled={isEdit && !isDirty}
            title={isEdit && !isDirty ? 'Change something first' : undefined}
          >
            {submitting ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save changes' : 'Create post'}
          </Button>
        </div>
      </form>

      {/* Unsaved-changes prompt for in-app navigation */}
      <Modal
        isOpen={blocker.state === 'blocked'}
        onClose={() => blocker.reset?.()}
        title="Leave without saving?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => blocker.reset()}>Stay</Button>
            <Button variant="danger" onClick={() => blocker.proceed()}>Leave</Button>
          </>
        }
      >
        <p>Your changes will be lost.</p>
      </Modal>
    </div>
  );
};

export default CreatePost;
