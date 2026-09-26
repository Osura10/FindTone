import React, { useState, useEffect } from 'react';
import { apiCall } from '../../services/api';
import { Heart, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Wishlist = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchWishlist = async () => {
    try {
      const data = await apiCall('/wishlist');
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (e, id) => {
    e.stopPropagation();
    try {
      await apiCall(`/wishlist/${id}`, { method: 'DELETE' });
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      alert('Failed to remove from wishlist');
    }
  };

  const fmtLkr = (n) => `LKR ${Math.round(n).toLocaleString()}`;

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(255, 0, 110, 0.15)', borderRadius: '10px', color: '#ff006e' }}>
          <Heart size={24} />
        </div>
        <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Wishlist</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto' }} />
        </div>
      ) : items.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '20px' }}>
          <Heart size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>Your wishlist is empty.</h3>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/items')} style={{ marginTop: '1rem' }}>Browse Items</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {items.map(item => {
            const currentPrice = item.listing.price;
            const diff = currentPrice - item.priceWhenSaved;
            const isLower = diff < 0;
            const percent = item.priceWhenSaved > 0 ? Math.round(Math.abs(diff) / item.priceWhenSaved * 100) : 0;

            return (
              <div 
                key={item.id} 
                className="glass-panel" 
                style={{ 
                  borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s',
                  position: 'relative', display: 'flex', flexDirection: 'column'
                }}
              >
                <div style={{ height: '180px', background: '#111', position: 'relative' }}>
                  <img 
                    src={item.listing.firstImageUrl || 'https://placehold.co/400x300?text=No+Photo'} 
                    alt={item.listing.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {item.listing.status}
                  </div>
                </div>

                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{item.listing.title}</h3>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.listing.brand} • {item.listing.condition}</p>
                  
                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-hover)' }}>
                      {fmtLkr(currentPrice)}
                    </div>
                    {isLower && (
                      <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        ▼ LKR {Math.abs(diff).toLocaleString()} ({percent}%) lower
                      </div>
                    )}
                    {diff > 0 && (
                      <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        ▲ LKR {Math.abs(diff).toLocaleString()} ({percent}%) higher
                      </div>
                    )}
                    {diff === 0 && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        No price change
                      </div>
                    )}
                    {item.listing.priceVerdict && (
                      <div style={{ marginTop: '0.5rem', display: 'inline-block', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem' }}>
                        {item.listing.priceVerdict}
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  className="btn btn-outline"
                  onClick={(e) => handleRemove(e, item.id)}
                  style={{
                    position: 'absolute', bottom: '1rem', right: '1rem', padding: '0.5rem',
                    borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444'
                  }}
                  title="Remove from wishlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
