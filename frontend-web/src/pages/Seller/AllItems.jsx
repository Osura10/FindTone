import React, { useState, useEffect } from 'react';
import { Search, Package, PlusCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiCall } from '../../services/api';

const AllItems = () => {
  const [items, setItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiCall('/listings/mine');
      setItems(Array.isArray(data) ? data : (data.items || []));
    } catch (err) {
      console.error('Failed to fetch user listings:', err);
      setError('Unable to load your listings. Please make sure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
        return { bg: 'rgba(81, 207, 102, 0.2)', color: '#51cf66', border: 'rgba(81, 207, 102, 0.4)' };
      case 'PENDING':
        return { bg: 'rgba(255, 212, 59, 0.2)', color: '#ffd43b', border: 'rgba(255, 212, 59, 0.4)' };
      case 'FLAGGED':
        return { bg: 'rgba(255, 146, 43, 0.2)', color: '#ff922b', border: 'rgba(255, 146, 43, 0.4)' };
      case 'REJECTED':
        return { bg: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', border: 'rgba(255, 107, 107, 0.4)' };
      case 'SOLD':
        return { bg: 'rgba(134, 142, 150, 0.2)', color: '#adb5bd', border: 'rgba(134, 142, 150, 0.4)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', gap: '1.25rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Your Items</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Manage your listed instruments and check evaluation status</p>
        
        {/* Search Bar & Refresh */}
        <div style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '600px' }}>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', flex: 1, borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <Search size={22} style={{ color: 'var(--text-secondary)', marginRight: '1rem' }} />
            <input
              type="text"
              placeholder="Search your inventory..."
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
            onClick={fetchItems}
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

      {/* Loading State */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
          <p>Loading your inventory...</p>
        </div>
      ) : (
        /* Items Grid */
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {filteredItems.map(item => {
            const badge = getStatusBadge(item.status);
            const displayImage = item.firstImageUrl || item.image || 'https://placehold.co/400x300?text=No+Photo';
            
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
                  
                  {/* Status Badge */}
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: badge.bg,
                    color: badge.color,
                    border: `1px solid ${badge.border}`,
                    padding: '0.25rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    letterSpacing: '0.5px'
                  }}>
                    {item.status || 'LIVE'}
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
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Package size={48} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
              <h3 style={{ margin: 0, color: '#eaeaea' }}>
                {searchTerm ? `No listings match "${searchTerm}"` : "You haven't posted any instruments yet"}
              </h3>
              <p style={{ color: 'var(--text-secondary)', margin: 0, maxWidth: '400px' }}>
                Start selling by creating your first post. Upload photos and provide instrument details.
              </p>
              <Link to="/seller/create" className="btn btn-primary" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={18} /> Create a Post
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AllItems;
