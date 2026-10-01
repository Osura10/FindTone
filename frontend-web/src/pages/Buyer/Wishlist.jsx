import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, Trash2 } from 'lucide-react';
import { apiCall } from '../../services/api';
import { ErrorState, Skeleton } from '../../components/ui';

const fmtLkr = (n) => `LKR ${Math.round(n).toLocaleString()}`;

const Wishlist = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWishlist = useCallback(async () => {
    try {
      const data = await apiCall('/wishlist');
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your wishlist.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchWishlist();
  }, [fetchWishlist]);

  // The API removes by LISTING id, not by wishlist row id.
  const handleRemove = async (e, listingId) => {
    e.stopPropagation();
    try {
      await apiCall(`/wishlist/${listingId}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.listingId !== listingId));
      toast.success('Removed from wishlist');
    } catch (err) {
      toast.error(err.message || 'Failed to remove from wishlist');
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(255, 0, 110, 0.15)', borderRadius: '10px', color: '#ff006e' }}>
          <Heart size={24} />
        </div>
        <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Wishlist</h1>
      </div>

      {error && <ErrorState compact message={error} onRetry={() => { setLoading(true); fetchWishlist(); }} />}

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="300px" borderRadius="16px" />)}
        </div>
      ) : items.length === 0 && !error ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '20px' }}>
          <Heart size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>Your wishlist is empty.</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Tap the heart on a listing to get a notification every time its price drops.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard/items')} style={{ marginTop: '1rem' }}>Browse Items</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {items.map((item) => {
            const currentPrice = item.listing.price;
            const diff = currentPrice - item.priceWhenSaved;
            const percent = item.priceWhenSaved > 0 ? Math.round((Math.abs(diff) / item.priceWhenSaved) * 100) : 0;

            return (
              <div
                key={item.id}
                data-testid={`wishlist-item-${item.listingId}`}
                className="glass-panel"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/dashboard/listings/${item.listingId}`); }}
                style={{ borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column' }}
                onClick={() => navigate(`/dashboard/listings/${item.listingId}`)}
              >
                <div style={{ height: '180px', background: '#111', position: 'relative' }}>
                  <img src={item.listing.firstImageUrl || 'https://placehold.co/400x300?text=No+Photo'} alt={item.listing.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: item.listing.status === 'SOLD' ? 'grayscale(100%)' : 'none' }} />
                  <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {item.listing.status}
                  </div>
                </div>

                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{item.listing.title}</h3>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{item.listing.brand} • {item.listing.condition}</p>

                  <div style={{ marginTop: 'auto' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-hover)' }}>{fmtLkr(currentPrice)}</div>
                    {diff < 0 && (
                      <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        ▼ LKR {Math.abs(diff).toLocaleString()} ({percent}%) lower than when you saved it
                      </div>
                    )}
                    {diff > 0 && (
                      <div style={{ color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.25rem' }}>
                        ▲ LKR {Math.abs(diff).toLocaleString()} ({percent}%) higher
                      </div>
                    )}
                    {diff === 0 && <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>No price change</div>}
                  </div>
                </div>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={(e) => handleRemove(e, item.listingId)}
                  style={{ position: 'absolute', bottom: '1rem', right: '1rem', padding: '0.5rem', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444' }}
                  title="Remove from wishlist"
                  aria-label="Remove from wishlist"
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
