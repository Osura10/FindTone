import React, { useState, useEffect } from 'react';
import { apiCall } from '../../services/api';
import { BellPlus, Sparkles, Loader2, Edit2, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';

const CONDITIONS = [
  { value: 'new', label: 'Brand New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'excellent', label: 'Excellent' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'for_parts', label: 'For Parts' }
];

const MyAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState([]);
  
  // AI Parse State
  const [parseText, setParseText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccessNote, setAiSuccessNote] = useState('');
  const [highlightFields, setHighlightFields] = useState(false);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', queryText: '', category: '', brand: '', modelKeyword: '', 
    minPrice: '', maxPrice: '', conditions: [], location: ''
  });

  const fetchAlerts = async () => {
    try {
      const data = await apiCall('/alerts');
      setAlerts(data || []);
    } catch (err) {
      console.error('Failed to load alerts', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const data = await apiCall('/catalog');
      setCatalog(data || []);
    } catch (err) {
      console.error('Failed to load catalog', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    fetchCatalog();
  }, []);

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

        // Helper for case-insensitive match against catalog
        const matchCatalog = (val, list) => {
          if (!val) return '';
          const found = list.find(x => x.toLowerCase() === val.toLowerCase());
          return found || val;
        };

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
          conditions: res.conditions ? res.conditions.split(',').map(s => s.trim()) : prev.conditions,
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
    try {
      const payload = {
        name: form.name,
        queryText: form.queryText || null,
        category: form.category || null,
        brand: form.brand || null,
        modelKeyword: form.modelKeyword || null,
        minPrice: form.minPrice ? parseFloat(form.minPrice) : null,
        maxPrice: form.maxPrice ? parseFloat(form.maxPrice) : null,
        conditions: form.conditions.length > 0 ? form.conditions.join(',') : null,
        location: form.location || null
      };

      if (editingId) {
        await apiCall(`/alerts/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiCall('/alerts', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      
      setForm({ name: '', queryText: '', category: '', brand: '', modelKeyword: '', minPrice: '', maxPrice: '', conditions: [], location: '' });
      setShowForm(false);
      setEditingId(null);
      setParseText('');
      fetchAlerts();
    } catch (err) {
      alert(err.message || 'Failed to save alert');
    }
  };

  const toggleAlert = async (id, currentStatus) => {
    try {
      await apiCall(`/alerts/${id}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchAlerts();
    } catch (err) {
      alert('Failed to toggle alert');
    }
  };

  const deleteAlert = async (id) => {
    if (!window.confirm('Delete this alert?')) return;
    try {
      await apiCall(`/alerts/${id}`, { method: 'DELETE' });
      fetchAlerts();
    } catch (err) {
      alert('Failed to delete alert');
    }
  };

  const handleEdit = (alert) => {
    setForm({
      name: alert.name,
      queryText: alert.queryText || '',
      category: alert.category || '',
      brand: alert.brand || '',
      modelKeyword: alert.modelKeyword || '',
      minPrice: alert.minPrice || '',
      maxPrice: alert.maxPrice || '',
      conditions: alert.conditions ? alert.conditions.split(',') : [],
      location: alert.location || ''
    });
    setEditingId(alert.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(255, 0, 110, 0.15)', borderRadius: '10px', color: '#ff006e' }}>
          <BellPlus size={24} />
        </div>
        <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>My Alerts</h1>
      </div>

      <div className="glass-panel" style={{ padding: '2rem', borderRadius: '20px', marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Describe what you're looking for</h3>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            className="input-field" 
            placeholder="e.g. used Yamaha acoustic guitar under 40k in Colombo" 
            value={parseText}
            onChange={(e) => setParseText(e.target.value)}
            style={{ flex: 1, minWidth: '250px' }}
          />
          <button 
            className="btn" 
            onClick={handleParseAi}
            disabled={aiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'linear-gradient(45deg, #833ab4, #fd1d1d, #fcb045)', color: '#fff' }}
          >
            {aiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {aiLoading ? 'AI is reading your request...' : '✨ Fill with AI'}
          </button>
        </div>
        {aiError && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.5rem' }}>{aiError}</p>}
        {aiSuccessNote && <p style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle size={16} /> {aiSuccessNote}</p>}
      </div>

      {showForm && (
        <form onSubmit={saveAlert} className="glass-panel" style={{ padding: '2rem', borderRadius: '20px', marginBottom: '2rem', transition: 'box-shadow 0.5s', boxShadow: highlightFields ? '0 0 20px rgba(16, 185, 129, 0.4)' : undefined }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>{editingId ? 'Edit Alert' : 'Alert Details'}</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Alert Name *</label>
              <input type="text" className="input-field" style={{ transition: 'border-color 0.5s', borderColor: highlightFields ? '#10b981' : undefined }} required value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Category</label>
              <select className="input-field" style={{ transition: 'border-color 0.5s', borderColor: highlightFields ? '#10b981' : undefined }} value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                <option value="">Any</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Brand</label>
              <select className="input-field" style={{ transition: 'border-color 0.5s', borderColor: highlightFields ? '#10b981' : undefined }} value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}>
                <option value="">Any</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Model / Keyword</label>
              <input type="text" className="input-field" style={{ transition: 'border-color 0.5s', borderColor: highlightFields ? '#10b981' : undefined }} value={form.modelKeyword} onChange={e => setForm({...form, modelKeyword: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Min Price (LKR)</label>
              <input type="number" min="0" className="input-field" style={{ transition: 'border-color 0.5s', borderColor: highlightFields ? '#10b981' : undefined }} value={form.minPrice} onChange={e => setForm({...form, minPrice: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Max Price (LKR)</label>
              <input type="number" min="0" className="input-field" style={{ transition: 'border-color 0.5s', borderColor: highlightFields ? '#10b981' : undefined }} value={form.maxPrice} onChange={e => setForm({...form, maxPrice: e.target.value})} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Location</label>
              <input type="text" className="input-field" style={{ transition: 'border-color 0.5s', borderColor: highlightFields ? '#10b981' : undefined }} value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Conditions (Any of)</label>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {CONDITIONS.map(c => (
                <label key={c.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={form.conditions.includes(c.value)}
                    onChange={(e) => {
                      if (e.target.checked) setForm({...form, conditions: [...form.conditions, c.value]});
                      else setForm({...form, conditions: form.conditions.filter(x => x !== c.value)});
                    }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-outline" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Alert</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto' }} />
        </div>
      ) : alerts.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '20px' }}>
          <BellPlus size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>You don't have any alerts yet.</h3>
          {!showForm && <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop: '1rem' }}>Create Alert manually</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {alerts.map(alert => (
            <div key={alert.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', opacity: alert.isActive ? 1 : 0.6 }}>
              <div>
                <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {alert.name} {!alert.isActive && <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '10px' }}>INACTIVE</span>}
                </h3>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem' }}>
                  {alert.category && <span className="chip">Category: {alert.category}</span>}
                  {alert.brand && <span className="chip">Brand: {alert.brand}</span>}
                  {alert.modelKeyword && <span className="chip">Keyword: {alert.modelKeyword}</span>}
                  {alert.minPrice != null && <span className="chip">Min LKR {alert.minPrice.toLocaleString()}</span>}
                  {alert.maxPrice != null && <span className="chip">Max LKR {alert.maxPrice.toLocaleString()}</span>}
                  {alert.location && <span className="chip">Location: {alert.location}</span>}
                  {alert.conditions && <span className="chip">Conditions: {alert.conditions.split(',').join(', ')}</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <Clock size={14} /> 
                  Last notified: {alert.lastNotifiedAt ? new Date(alert.lastNotifiedAt).toLocaleString() : 'Never'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => toggleAlert(alert.id, alert.isActive)}
                  style={{ padding: '0.5rem' }}
                  title={alert.isActive ? "Pause alert" : "Resume alert"}
                >
                  {alert.isActive ? <XCircle size={18} /> : <CheckCircle size={18} />}
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={() => handleEdit(alert)}
                  style={{ padding: '0.5rem' }}
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  className="btn btn-outline" 
                  onClick={() => deleteAlert(alert.id)}
                  style={{ padding: '0.5rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .chip {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 4px 10px;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </div>
  );
};

export default MyAlerts;
