import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Heart, TrendingDown, TrendingUp } from 'lucide-react';
import { apiCall } from '../../services/api';
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, PriceTag, Skeleton, StatusBadge, formatLKR } from '../../components/ui';

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
    <div className="page">
      <PageHeader
        icon={Heart}
        title="Wishlist"
        subtitle={!loading && items.length > 0
          ? `${items.length} saved item${items.length === 1 ? '' : 's'} · we tell you when a price drops`
          : 'Save listings to get a notification every time the price drops.'}
      />

      {error && <ErrorState compact message={error} onRetry={() => { setLoading(true); fetchWishlist(); }} />}

      {loading ? (
        <div className="listing-grid" aria-busy="true" aria-label="Loading wishlist">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="300px" radius="var(--radius-lg)" />)}
        </div>
      ) : items.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={Heart}
            title="Your wishlist is empty"
            description="Tap the heart on a listing to get a notification every time its price drops."
            action={<Button onClick={() => navigate('/dashboard/items')}>Browse instruments</Button>}
          />
        </Card>
      ) : (
        <div className="listing-grid">
          {items.map((item) => {
            const currentPrice = item.listing.price;
            const diff = currentPrice - item.priceWhenSaved;
            const percent = item.priceWhenSaved > 0 ? Math.round((Math.abs(diff) / item.priceWhenSaved) * 100) : 0;
            const sold = item.listing.status === 'SOLD';

            return (
              <article
                key={item.id}
                data-testid={`wishlist-item-${item.listingId}`}
                className={`card card-hover listing-card ${sold ? 'is-sold' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={item.listing.title}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/dashboard/listings/${item.listingId}`); }}
                onClick={() => navigate(`/dashboard/listings/${item.listingId}`)}
              >
                <div className="listing-media">
                  <img src={item.listing.firstImageUrl || 'https://placehold.co/400x300?text=No+Photo'} alt="" loading="lazy" />
                  {sold && <span className="sold-ribbon">SOLD OUT</span>}
                  <div className="overlay-top">
                    {!sold ? <StatusBadge status={item.listing.status} className="media-badge" /> : <span />}
                    <button
                      type="button"
                      className="heart-btn on"
                      onClick={(e) => handleRemove(e, item.listingId)}
                      title="Remove from wishlist"
                      aria-label="Remove from wishlist"
                    >
                      <Heart size={17} fill="currentColor" />
                    </button>
                  </div>
                </div>

                <div className="listing-body">
                  <span className="text-xs muted truncate cap">{[item.listing.brand, item.listing.condition?.replace('_', ' ')].filter(Boolean).join(' · ')}</span>
                  <h3 className="listing-title">{item.listing.title}</h3>
                  <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                    <PriceTag amount={currentPrice} size="md" />
                  </div>
                  {diff < 0 && (
                    <Badge variant="success" className="price-change">
                      <TrendingDown size={12} aria-hidden="true" /> {formatLKR(Math.abs(diff))} ({percent}%) lower than when you saved it
                    </Badge>
                  )}
                  {diff > 0 && (
                    <Badge variant="danger" className="price-change">
                      <TrendingUp size={12} aria-hidden="true" /> {formatLKR(Math.abs(diff))} ({percent}%) higher
                    </Badge>
                  )}
                  {diff === 0 && <span className="text-xs muted">No price change since you saved it</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Wishlist;
