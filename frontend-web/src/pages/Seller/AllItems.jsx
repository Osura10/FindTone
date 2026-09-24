import React, { useState, useEffect } from 'react';
import { Search, Package, PlusCircle, AlertCircle, RefreshCw, ShoppingBag, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiCall } from '../../services/api';

const AllItems = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [role, setRole] = useState(null);
  const [activeTab, setActiveTab] = useState('marketplace'); // 'marketplace' or 'mine'

  const initialize = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await apiCall('/auth/me');
      if (user && user.role) {
        const userRole = user.role.toLowerCase();
        setRole(userRole);
        localStorage.setItem('role', userRole);
        
        if (userRole === 'buyer') {
          setActiveTab('marketplace');
          fetchMarketplace();
        } else if (userRole === 'shop') {
          if (activeTab === 'mine') {
            fetchMyListings();
          } else {
            fetchMarketplace();
          }
        } else {
          setActiveTab('marketplace');
          fetchMarketplace();
        }
      } else {
        setError('Unable to verify your account.');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError('Session expired or unauthorized. Please log in again.');
      setLoading(false);
    }
  };

  const fetchMarketplace = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/listings?status=LIVE');
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      console.error(err);
      setError('Unable to load marketplace listings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyListings = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/listings/mine');
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      console.error(err);
      setError('Unable to load your listings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initialize();
  }, [activeTab]);

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.brand && item.brand.toLowerCase().includes(term)) ||
      (item.model && item.model.toLowerCase().includes(term)) ||
      (item.category && item.category.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'LIVE':
        return { bg: 'rgba(81, 207, 102, 0.2)', color: '#51cf66', border: 'rgba(81, 207, 102, 0.4)', label: 'LIVE' };
      case 'PENDING':
        return { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)', label: 'PENDING' };
      case 'FLAGGED':
        return { bg: 'rgba(255, 146, 43, 0.2)', color: '#ff922b', border: 'rgba(255, 146, 43, 0.4)', label: 'Under Review' };
      case 'REJECTED':
        return { bg: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', border: 'rgba(255, 107, 107, 0.4)', label: 'REJECTED' };
      case 'SOLD':
        return { bg: 'rgba(134, 142, 150, 0.2)', color: '#adb5bd', border: 'rgba(134, 142, 150, 0.4)', label: 'SOLD' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: 'rgba(255, 255, 255, 0.2)', label: status || 'UNKNOWN' };
    }
  };

  const getVerdictBadge = (verdict) => {
    switch (verdict?.toUpperCase()) {
      case 'SUSPICIOUSLY_LOW': return { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Suspicious' };
      case 'GREAT_DEAL':       return { bg: 'rgba(81,207,102,0.2)',  color: '#51cf66', border: 'rgba(81,207,102,0.4)',  label: 'Great Deal' };
      case 'FAIR':             return { bg: 'rgba(81,207,102,0.2)',  color: '#51cf66', border: 'rgba(81,207,102,0.4)',  label: 'Fair' };
      case 'SLIGHTLY_HIGH':    return { bg: 'rgba(255,212,59,0.2)',  color: '#ffd43b', border: 'rgba(255,212,59,0.4)',  label: 'Slightly High' };
      case 'OVERPRICED':       return { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Overpriced' };
      default:                 return { bg: 'rgba(134,142,150,0.2)', color: '#adb5bd', border: 'rgba(134,142,150,0.4)', label: verdict || 'UNKNOWN' };
    }
  };

  const getTrustBadge = (score) => {
    if (score == null) {
      return { bg: 'rgba(134, 142, 150, 0.2)', color: '#adb5bd', border: 'rgba(134, 142, 150, 0.4)', label: 'Not checked' };
    }
    if (score < 40) {
      return { bg: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)', label: `Trust ${score}/100` };
    }
    if (score < 70) {
      return { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)', label: `Trust ${score}/100` };
    }
    return { bg: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: 'rgba(16, 185, 129, 0.4)', label: `Trust ${score}/100` };
  };

  const fmtLkr = (n) => n != null ? `LKR ${Math.round(n).toLocaleString()}` : null;

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header and Tabs */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', gap: '1.25rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0, fontWeight: '800' }}>
          {activeTab === 'mine' ? 'Your Items' : 'Marketplace Items'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '600px', textAlign: 'center' }}>
          {activeTab === 'mine' 
            ? 'Manage your listed instruments and check evaluation status'
            : 'Browse verified instruments from trusted sellers'
          }
        </p>
        
        {role === 'shop' && (
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button 
              onClick={() => setActiveTab('marketplace')}
              className={`btn ${activeTab === 'marketplace' ? 'btn-primary' : ''}`}
              style={activeTab === 'marketplace' ? {} : { background: 'transparent', color: 'var(--text-secondary)' }}
            >
              <ShoppingBag size={16} /> Marketplace
            </button>
            <button 
              onClick={() => setActiveTab('mine')}
              className={`btn ${activeTab === 'mine' ? 'btn-primary' : ''}`}
              style={activeTab === 'mine' ? {} : { background: 'transparent', color: 'var(--text-secondary)' }}
            >
              <Store size={16} /> My Listings
            </button>
          </div>
        )}
        
        {/* Search Bar & Refresh */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '600px', marginTop: '1rem' }}>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', flex: 1, borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <Search size={22} style={{ color: 'var(--text-secondary)', marginRight: '1rem' }} />
            <input
              type="text"
              placeholder="Search instruments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                background: 'transparent', 
                border: 'none', 
                color: 'white', 
                outline: 'none', 
                width: '100%',
                fontSize: '1rem'
              }}
            />
          </div>
          <button
            onClick={() => { activeTab === 'mine' ? fetchMyListings() : fetchMarketplace(); }}
            title="Refresh listings"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.15)', border: '1px solid rgba(255, 107, 107, 0.3)', padding: '12px 16px', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <p>Loading instruments...</p>
        </div>
      ) : (
        /* Items Grid */
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {filteredItems.map(item => {
            const trustBadge = getTrustBadge(item.trustScore);
            const statusBadge = getStatusBadge(item.status);
            const displayImage = item.firstImageUrl || item.image || 'https://placehold.co/400x300?text=No+Photo';
            const vb = item.priceVerdict ? getVerdictBadge(item.priceVerdict) : null;
            
            return (
              <div 
                key={item.id} 
                className="glass-panel" 
                style={{ 
                  overflow: 'hidden', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease', 
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }} 
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'} 
                onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div style={{ height: '180px', width: '100%', overflow: 'hidden', position: 'relative', background: '#111' }}>
                  <img 
                    src={displayImage} 
                    alt={item.title || item.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                  
                  {/* Status & Trust Badges */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: '4px'
                  }}>
                    {activeTab === 'mine' && (
                      <div style={{
                        background: statusBadge.bg,
                        color: statusBadge.color,
                        border: `1px solid ${statusBadge.border}`,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        letterSpacing: '0.5px'
                      }}>
                        {statusBadge.label}
                      </div>
                    )}
                    
                    <div style={{
                      background: trustBadge.bg,
                      color: trustBadge.color,
                      border: `1px solid ${trustBadge.border}`,
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      letterSpacing: '0.5px'
                    }}>
                      {trustBadge.label}
                    </div>

                    {item.priceVerdict && vb && (
                      <div style={{
                        background: vb.bg,
                        color: vb.color,
                        border: `1px solid ${vb.border}`,
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '700'
                      }}>
                        {vb.label}
                      </div>
                    )}
                  </div>

                  {/* Condition Tag */}
                  {item.condition && (
                    <div style={{ 
                      position: 'absolute', 
                      bottom: '10px', 
                      left: '10px', 
                      background: 'rgba(0,0,0,0.75)',
                      color: '#fff',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem'
                    }}>
                      {item.condition}
                    </div>
                  )}
                </div>

                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {item.category} • {item.brand}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title || item.name}>
                    {item.title || item.name}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <p style={{ color: 'var(--primary-hover, #a855f7)', fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>
                      LKR {Number(item.price).toLocaleString()}
                    </p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.listingType || 'Sell'}
                    </span>
                  </div>
                  {item.fairPriceMin != null && item.fairPriceMax != null && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Fair: {fmtLkr(item.fairPriceMin)} – {fmtLkr(item.fairPriceMax)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Package size={48} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
              <h3 style={{ margin: 0, color: '#eaeaea' }}>
                {searchTerm
                  ? `No listings match "${searchTerm}"`
                  : activeTab === 'mine' ? "You haven't posted any instruments yet" : "No instruments available right now."}
              </h3>
              
              {role === 'shop' && activeTab === 'mine' && (
                <>
                  <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '400px' }}>
                    Start selling by creating your first post. Upload photos and provide instrument details.
                  </p>
                  <Link to="/dashboard/create" className="btn btn-primary" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    <PlusCircle size={18} /> Create a Post
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllItems;
