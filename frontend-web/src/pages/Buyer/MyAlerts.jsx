import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { apiCall } from '../../services/api';
import { useDashboard } from '../../hooks/useDashboard';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Skeleton, formatLKR } from '../../components/ui';
import { BellPlus, Sparkles, Edit2, Trash2, CheckCircle, Clock, Check, Pause, Play, Plus } from 'lucide-react';

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'for_parts', label: 'For Parts' }
];

const EMPTY_ALERT = { name: '', queryText: '', category: '', brand: '', modelKeyword: '', minPrice: '', maxPrice: '', conditions: [], location: '' };

const MyAlerts = () => {
  const { refreshUnread } = useDashboard();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [catalogError, setCatalogError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // AI Parse State
  const [parseText, setParseText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccessNote, setAiSuccessNote] = useState('');
  const [highlightFields, setHighlightFields] = useState(false);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_ALERT);
  const [confirmDelete, setConfirmDelete] = useState(null); // alert waiting for delete confirmation

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await apiCall('/alerts');
      setAlerts(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message || 'Could not load your alerts.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCatalog = useCallback(async () => {
    try {
      const data = await apiCall('/catalog');
      setCatalog(Array.isArray(data) ? data : []);
      setCatalogError('');
    } catch (err) {
      setCatalogError(`Suggestions are not available (${err.message}). You can still type any value.`);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAlerts();
    fetchCatalog();
  }, [fetchAlerts, fetchCatalog]);

  const categories = [...new Set(catalog.map(c => c.category))];
  const brands = [...new Set(catalog.map(c => c.brand))];

  const handleParseAi = async () => {
    if (!parseText.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiSuccessNote('');
    setHighlightFields(false);

    try {
      const res = await apiCall('/alerts/parse', {
        method: 'POST',
        body: JSON.stringify({ text: parseText })
      });
      if (res) {
        // If nothing was extracted
        if (!res.category && !res.brand && !res.model_keyword && !res.min_price && !res.max_price && !res.conditions && !res.location) {
          setAiError('Could not understand the request. Please fill the form manually.');
          setShowForm(true);
          return;
        }

        // Use the catalog spelling when the AI value matches it (ignoring case).
        const matchCatalog = (val, list) => list.find((x) => x.toLowerCase() === val.toLowerCase()) || val;

        const parsedName = res.name || parseText;
        const suggestedName = parsedName.charAt(0).toUpperCase() + parsedName.slice(1);

        setForm(prev => ({
          ...prev,
          name: suggestedName,
          queryText: parseText,
          category: res.category ? matchCatalog(res.category, categories) : prev.category,
          brand: res.brand ? matchCatalog(res.brand, brands) : prev.brand,
          modelKeyword: res.model_keyword || prev.modelKeyword,
          minPrice: res.min_price != null ? res.min_price : prev.minPrice,
          maxPrice: res.max_price != null ? res.max_price : prev.maxPrice,
          conditions: res.conditions ? res.conditions.split(',').map(c => c.trim()).filter(c => CONDITIONS.some(k => k.value === c)) : prev.conditions,
          location: res.location || prev.location
        }));

        setShowForm(true);
        setEditingId(null);
        setAiSuccessNote(res.used_fallback ? 'Filled by keyword matching' : 'Filled by AI');
        setHighlightFields(true);
        setTimeout(() => setHighlightFields(false), 2000);
      }
    } catch (err) {
      setAiError(err.message || 'AI service is unavailable right now.');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAlert = async (e) => {
    e.preventDefault();
    if (saving) return;
    const min = form.minPrice === '' ? null : Number(form.minPrice);
    const max = form.maxPrice === '' ? null : Number(form.maxPrice);
    if (min != null && max != null && max < min) {
      setSaveError('Max price must be greater than or equal to min price.');
      return;
    }
    const payload = {
      name: form.name.trim() || null,
      queryText: form.queryText.trim() || null,
      category: form.category.trim() || null,
      brand: form.brand.trim() || null,
      modelKeyword: form.modelKeyword.trim() || null,
      minPrice: min,
      maxPrice: max,
      conditions: form.conditions.length > 0 ? form.conditions.join(',') : null,
      location: form.location.trim() || null
    };
    const hasFilter = payload.category || payload.brand || payload.modelKeyword || payload.location || payload.conditions || min != null || max != null;
    if (!hasFilter) {
      setSaveError('Set at least one filter: category, brand, model, price, condition or location.');
      return;
    }

    setSaving(true);
    setSaveError('');
    try {
      const saved = await apiCall(editingId ? `/alerts/${editingId}` : '/alerts', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      const matches = saved?.newMatches ?? 0;
      toast.success(matches > 0
        ? `Alert saved. ${matches} listing${matches === 1 ? '' : 's'} already match – see Notifications.`
        : 'Alert saved. We will notify you about new matches.', { duration: 6000 });
      if (matches > 0) refreshUnread();
      setForm(EMPTY_ALERT);
      setShowForm(false);
      setEditingId(null);
      setParseText('');
      fetchAlerts();
    } catch (err) {
      setSaveError(err.message || 'Failed to save the alert.');
    } finally {
      setSaving(false);
    }
  };

  const toggleAlert = async (id, currentStatus) => {
    try {
      const saved = await apiCall(`/alerts/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      const matches = saved?.newMatches ?? 0;
      toast.success(currentStatus ? 'Alert paused' : `Alert resumed${matches > 0 ? ` – ${matches} listing${matches === 1 ? '' : 's'} match now` : ''}`);
      if (matches > 0) refreshUnread();
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || 'Failed to change the alert.');
    }
  };

  // Called after the user confirms in the dialog.
  const deleteAlert = async (id) => {
    try {
      await apiCall(`/alerts/${id}`, { method: 'DELETE' });
      toast.success('Alert deleted');
      fetchAlerts();
    } catch (err) {
      toast.error(err.message || 'Failed to delete the alert.');
    }
  };

  const handleEdit = (alert) => {
    setForm({
      name: alert.name,
      queryText: alert.queryText || '',
      category: alert.category || '',
      brand: alert.brand || '',
      modelKeyword: alert.modelKeyword || '',
      minPrice: alert.minPrice ?? '',
      maxPrice: alert.maxPrice ?? '',
      conditions: alert.conditions ? alert.conditions.split(',') : [],
      location: alert.location || ''
    });
    setEditingId(alert.id);
    setSaveError('');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openManualForm = () => { setForm(EMPTY_ALERT); setEditingId(null); setSaveError(''); setShowForm(true); };
  const setField = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const aiField = highlightFields ? 'ai-filled' : '';

  return (
    <div className="page page-narrow">
      <PageHeader
        icon={BellPlus}
        title="My Alerts"
        subtitle="Tell us what you want – we notify you the moment a matching instrument is listed."
        actions={!showForm && <Button variant="secondary" icon={Plus} onClick={openManualForm}>New alert</Button>}
      />

      {/* Describe in plain words → AI fills the form */}
      <Card className="stack ai-card">
        <div className="row" style={{ gap: 10, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <span className="page-icon" style={{ width: 38, height: 38 }}><Sparkles size={18} aria-hidden="true" /></span>
          <div>
            <h2 className="section-title">Describe what you&apos;re looking for</h2>
            <p className="text-sm muted">Our AI turns your sentence into alert filters you can check before saving.</p>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <div className="grow" style={{ minWidth: 220 }}>
            <label htmlFor="ai-text" className="sr-only">Describe the instrument you want</label>
            <input
              id="ai-text"
              type="text"
              className="input"
              placeholder="e.g. used Yamaha acoustic guitar under 40k in Colombo"
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleParseAi(); } }}
            />
          </div>
          <Button data-testid="fill-with-ai" icon={Sparkles} loading={aiLoading} onClick={handleParseAi}>
            {aiLoading ? 'AI is reading your request…' : 'Fill with AI'}
          </Button>
        </div>
        {!showForm && (
          <button type="button" className="link-btn" style={{ alignSelf: 'flex-start', fontSize: 'var(--text-sm)' }} onClick={openManualForm}>
            Or create an alert manually
          </button>
        )}
        {aiError && <ErrorState compact message={aiError} />}
        {aiSuccessNote && <span className="text-sm row" style={{ gap: 6, color: 'var(--success)', fontWeight: 600 }}><CheckCircle size={16} aria-hidden="true" /> {aiSuccessNote} – check the filters below.</span>}
      </Card>

      {showForm && (
        <Card as="form" onSubmit={saveAlert} className={`stack ${highlightFields ? 'ai-glow' : ''}`} noValidate>
          <div className="row-between">
            <h2 className="section-title">{editingId ? 'Edit alert' : 'Alert details'}</h2>
            <span className="text-xs muted">All filters are optional – set at least one.</span>
          </div>

          <div className="form-grid">
            <Input id="a-name" label="Alert name" placeholder="Made from the filters if empty" value={form.name} onChange={setField('name')} fieldClassName={`span-2 ${aiField}`} />
            <Input id="a-category" label="Category" list="alert-categories" placeholder="Any" autoComplete="off" value={form.category} onChange={setField('category')} fieldClassName={aiField} />
            <datalist id="alert-categories">{categories.map(c => <option key={c} value={c} />)}</datalist>
            <Input id="a-brand" label="Brand" list="alert-brands" placeholder="Any" autoComplete="off" value={form.brand} onChange={setField('brand')} fieldClassName={aiField} />
            <datalist id="alert-brands">{brands.map(b => <option key={b} value={b} />)}</datalist>
            <Input label="Model / keyword" placeholder="e.g. F310" value={form.modelKeyword} onChange={setField('modelKeyword')} fieldClassName={aiField} />
            <Input label="Location" placeholder="Anywhere" value={form.location} onChange={setField('location')} fieldClassName={aiField} />
            <Input label="Min price (LKR)" type="number" min="0" placeholder="0" value={form.minPrice} onChange={setField('minPrice')} fieldClassName={aiField} />
            <Input label="Max price (LKR)" type="number" min="0" placeholder="No limit" value={form.maxPrice} onChange={setField('maxPrice')} fieldClassName={aiField} />
          </div>

          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="field-label" style={{ marginBottom: 8 }}>Conditions (any of)</legend>
            <div className="row" style={{ gap: 8 }}>
              {CONDITIONS.map(c => {
                const on = form.conditions.includes(c.value);
                return (
                  <label key={c.value} className={`toggle-chip ${on ? 'on' : ''}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={(e) => {
                        if (e.target.checked) setForm({ ...form, conditions: [...form.conditions, c.value] });
                        else setForm({ ...form, conditions: form.conditions.filter(x => x !== c.value) });
                      }}
                    />
                    {on && <Check size={13} aria-hidden="true" />} {c.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {catalogError && <div className="alert alert-warning">{catalogError}</div>}
          {saveError && <ErrorState compact message={saveError} />}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
            <Button variant="secondary" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_ALERT); setSaveError(''); }} disabled={saving}>Cancel</Button>
            <Button type="submit" data-testid="save-alert" icon={BellPlus} loading={saving}>{saving ? 'Saving…' : editingId ? 'Save changes' : 'Save alert'}</Button>
          </div>
        </Card>
      )}

      <div className="row-between">
        <h2 className="section-title">Your alerts{!loading && alerts.length > 0 ? ` (${alerts.length})` : ''}</h2>
      </div>

      {loadError && <ErrorState compact message={loadError} onRetry={() => { setLoading(true); fetchAlerts(); }} />}

      {loading ? (
        <div className="stack-sm" aria-busy="true" aria-label="Loading alerts">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} height="120px" radius="var(--radius-lg)" />)}
        </div>
      ) : alerts.length === 0 && !loadError ? (
        <Card>
          <EmptyState
            icon={BellPlus}
            title="You don't have any alerts yet"
            description="Describe what you want above, or set the filters yourself."
            action={!showForm && <Button onClick={openManualForm}>Create an alert manually</Button>}
          />
        </Card>
      ) : (
        <div className="stack-sm">
          {alerts.map(alert => (
            <Card key={alert.id} className={`alert-item ${alert.isActive ? '' : 'paused'}`}>
              <div className="stack-sm grow" style={{ minWidth: 0, gap: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>{alert.name}</h3>
                  <Badge variant={alert.isActive ? 'success' : 'neutral'} dot>{alert.isActive ? 'Active' : 'Paused'}</Badge>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  {alert.category && <span className="chip">Category: {alert.category}</span>}
                  {alert.brand && <span className="chip">Brand: {alert.brand}</span>}
                  {alert.modelKeyword && <span className="chip">Keyword: {alert.modelKeyword}</span>}
                  {alert.minPrice != null && <span className="chip">Min {formatLKR(alert.minPrice)}</span>}
                  {alert.maxPrice != null && <span className="chip">Max {formatLKR(alert.maxPrice)}</span>}
                  {alert.location && <span className="chip">Location: {alert.location}</span>}
                  {alert.conditions && <span className="chip cap">Conditions: {alert.conditions.split(',').map((c) => c.replace('_', ' ')).join(', ')}</span>}
                </div>
                <span className="text-xs muted row" style={{ gap: 6 }}>
                  <Clock size={13} aria-hidden="true" />
                  Last notified: {alert.lastNotifiedAt ? new Date(alert.lastNotifiedAt).toLocaleString() : 'never'}
                </span>
              </div>

              <div className="row alert-actions" style={{ gap: 6 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={alert.isActive ? Pause : Play}
                  onClick={() => toggleAlert(alert.id, alert.isActive)}
                  title={alert.isActive ? 'Pause alert' : 'Resume alert'}
                >
                  {alert.isActive ? 'Pause' : 'Resume'}
                </Button>
                <Button variant="secondary" size="sm" icon={Edit2} iconOnly aria-label="Edit alert" title="Edit alert" onClick={() => handleEdit(alert)} />
                <Button variant="danger-outline" size="sm" icon={Trash2} iconOnly aria-label="Delete alert" title="Delete alert" onClick={() => setConfirmDelete(alert)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="Delete this alert?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { const id = confirmDelete.id; setConfirmDelete(null); deleteAlert(id); }}>Delete</Button>
          </>
        }
      >
        <p>“<strong>{confirmDelete?.name}</strong>” will stop sending you notifications.</p>
      </Modal>
    </div>
  );
};

export default MyAlerts;
