import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Bell, CheckCircle2, Check, ExternalLink, Sparkles, TrendingDown, BadgeDollarSign, Package, Trash2 } from 'lucide-react';
import { apiCall } from '../services/api';
import { useDashboard } from '../hooks/useDashboard';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, Tabs, formatLKR } from '../components/ui';

// Icon + colour per notification type.
const TYPE_META = {
  NEW_MATCH: { icon: Sparkles, tone: 'primary' },
  PRICE_DROP: { icon: TrendingDown, tone: 'success' },
  ITEM_SOLD: { icon: BadgeDollarSign, tone: 'warning' },
  ORDER_PLACED: { icon: Package, tone: 'info' },
  LISTING_REMOVED: { icon: Trash2, tone: 'danger' }
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
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' (view only)

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
  const shown = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  return (
    <div className="page page-narrow">
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
        actions={unread > 0 && (
          <Button variant="secondary" icon={CheckCircle2} data-testid="mark-all-read" onClick={markAllAsRead}>Mark all as read</Button>
        )}
      />

      <Tabs
        ariaLabel="Filter notifications"
        value={filter}
        onChange={setFilter}
        tabs={[
          { id: 'all', label: 'All', count: notifications.length || undefined },
          { id: 'unread', label: 'Unread', count: unread || undefined }
        ]}
      />

      {error && <ErrorState compact message={error} onRetry={() => { setLoading(true); fetchNotifications(); }} />}

      {loading ? (
        <div className="stack-sm" aria-busy="true" aria-label="Loading notifications">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height="92px" radius="var(--radius-lg)" />)}
        </div>
      ) : shown.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={Bell}
            title={filter === 'unread' ? 'No unread notifications' : "You don't have any notifications"}
            description="Add items to your wishlist or create an alert to get price drops and new matches."
            action={filter === 'all' && <Button variant="secondary" onClick={() => navigate('/dashboard/alerts')}>Create an alert</Button>}
          />
        </Card>
      ) : (
        <Card padded={false} className="notif-list">
          {shown.map((n) => {
            const hasListing = Boolean(n.listingId ?? n.listing?.id);
            const meta = TYPE_META[n.type] || { icon: Bell, tone: 'primary' };
            return (
              <div
                key={n.id}
                data-testid={`notification-${n.type}`}
                className={`notif ${n.isRead ? '' : 'unread'} ${hasListing ? 'clickable' : ''}`}
                role={hasListing ? 'button' : undefined}
                tabIndex={hasListing ? 0 : undefined}
                onClick={() => open(n)}
                onKeyDown={(e) => { if (hasListing && e.key === 'Enter') open(n); }}
              >
                <div className="notif-visual">
                  {n.listing?.firstImageUrl
                    ? <img src={n.listing.firstImageUrl} alt="" />
                    : <span className="notif-icon" style={{ background: `var(--${meta.tone}-soft)`, color: `var(--${meta.tone === 'primary' ? 'primary-text' : meta.tone})` }}><meta.icon size={20} aria-hidden="true" /></span>}
                  {n.listing?.firstImageUrl && (
                    <span className="notif-type" style={{ background: `var(--${meta.tone === 'primary' ? 'primary' : meta.tone})` }}><meta.icon size={11} aria-hidden="true" /></span>
                  )}
                </div>

                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row-between" style={{ alignItems: 'flex-start', flexWrap: 'nowrap' }}>
                    <h3 className="notif-title">{n.title || n.type.replace('_', ' ')}</h3>
                    <time className="text-xs muted" style={{ whiteSpace: 'nowrap' }} dateTime={n.createdAt} title={new Date(n.createdAt).toLocaleString()}>
                      {timeAgo(n.createdAt)}
                    </time>
                  </div>
                  <p className="notif-msg">{n.message}</p>
                  <div className="row" style={{ gap: 'var(--space-4)', marginTop: 6 }}>
                    {hasListing && (
                      <span className="text-xs row" style={{ gap: 4, color: 'var(--primary-text)', fontWeight: 600 }}>
                        <ExternalLink size={13} aria-hidden="true" /> Open listing{n.listing?.price != null ? ` · ${formatLKR(n.listing.price)}` : ''}
                      </span>
                    )}
                    {!n.isRead && (
                      <button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}>
                        <Check size={13} aria-hidden="true" /> Mark as read
                      </button>
                    )}
                  </div>
                </div>

                {!n.isRead && <span className="unread-dot" aria-label="Unread" />}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
};

export default Notifications;
