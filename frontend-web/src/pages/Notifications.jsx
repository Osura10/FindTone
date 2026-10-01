import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, CheckCircle2, Check, ExternalLink } from 'lucide-react';
import { apiCall } from '../services/api';
import { useDashboard } from '../hooks/useDashboard';
import { ErrorState, Skeleton } from '../components/ui';

const ICONS = {
  NEW_MATCH: '🎸',
  PRICE_DROP: '📉',
  ITEM_SOLD: '💰',
  ORDER_PLACED: '📦',
  LISTING_REMOVED: '🗑️'
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { refreshUnread } = useDashboard();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiCall('/notifications');
      setNotifications(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await apiCall(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      refreshUnread();
    } catch (err) {
      toast.error(err.message || 'Could not mark the notification as read.');
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiCall('/notifications/read-all', { method: 'PATCH' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      refreshUnread();
    } catch (err) {
      toast.error(err.message || 'Could not mark all as read.');
    }
  };

  const open = (n) => {
    if (!n.isRead) markAsRead(n.id);
    const listingId = n.listingId ?? n.listing?.id;
    if (listingId) navigate(`/dashboard/listings/${listingId}`);
  };

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(255, 0, 110, 0.15)', borderRadius: '10px', color: '#ff006e' }}>
            <Bell size={24} />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Notifications</h1>
          {unread > 0 && <span style={{ color: 'var(--text-secondary)' }}>{unread} unread</span>}
        </div>
        {unread > 0 && (
          <button type="button" className="btn btn-outline" data-testid="mark-all-read" onClick={markAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> Mark all as read
          </button>
        )}
      </div>

      {error && <ErrorState compact message={error} onRetry={() => { setLoading(true); fetchNotifications(); }} />}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="110px" borderRadius="16px" />)}
        </div>
      ) : notifications.length === 0 && !error ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '20px' }}>
          <Bell size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>You don't have any notifications.</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Add items to your wishlist or create an alert to get price drops and new matches.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map((n) => {
            const hasListing = Boolean(n.listingId ?? n.listing?.id);
            return (
              <div
                key={n.id}
                data-testid={`notification-${n.type}`}
                className="glass-panel"
                role={hasListing ? 'button' : undefined}
                tabIndex={hasListing ? 0 : undefined}
                onClick={() => open(n)}
                onKeyDown={(e) => { if (hasListing && e.key === 'Enter') open(n); }}
                style={{
                  padding: '1.25rem 1.5rem',
                  borderRadius: '16px',
                  display: 'flex',
                  gap: '1.25rem',
                  cursor: hasListing ? 'pointer' : 'default',
                  background: !n.isRead ? 'linear-gradient(145deg, rgba(255,0,110,0.1), rgba(0,0,0,0.2))' : undefined,
                  border: !n.isRead ? '1px solid rgba(255,0,110,0.3)' : undefined
                }}
              >
                {n.listing?.firstImageUrl ? (
                  <img src={n.listing.firstImageUrl} alt="" style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ fontSize: '2rem', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                    {ICONS[n.type] || '🔔'}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <h4 style={{ margin: '0 0 0.4rem 0', fontSize: '1.05rem', fontWeight: !n.isRead ? '700' : '500' }}>
                      <span aria-hidden="true">{ICONS[n.type] || '🔔'} </span>{n.title || n.type.replace('_', ' ')}
                    </h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }} title={new Date(n.createdAt).toLocaleString()}>
                      {timeAgo(n.createdAt)}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: !n.isRead ? '#fff' : 'var(--text-secondary)', fontSize: '0.95rem' }}>{n.message}</p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    {hasListing && (
                      <span style={{ color: 'var(--primary-hover)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ExternalLink size={14} /> Open listing{n.listing?.price != null ? ` · LKR ${Math.round(n.listing.price).toLocaleString()}` : ''}
                      </span>
                    )}
                    {!n.isRead && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}>
                        <Check size={14} /> Mark as read
                      </button>
                    )}
                  </div>
                </div>

                {!n.isRead && <div aria-label="Unread" style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff006e', alignSelf: 'center', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
