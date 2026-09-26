import React, { useState, useEffect } from 'react';
import { apiCall } from '../services/api';
import { Bell, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const data = await apiCall('/notifications');
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await apiCall(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiCall('/notifications/read-all', { method: 'PATCH' });
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    if (type === 'NEW_MATCH') return '🎸';
    if (type === 'PRICE_DROP') return '📉';
    return '🔔';
  };

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now - d) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ padding: '0.5rem', background: 'rgba(255, 0, 110, 0.15)', borderRadius: '10px', color: '#ff006e' }}>
            <Bell size={24} />
          </div>
          <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Notifications</h1>
        </div>
        {notifications.some(n => !n.isRead) && (
          <button className="btn btn-outline" onClick={handleMarkAllAsRead} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={18} /> Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto' }} />
        </div>
      ) : notifications.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: '20px' }}>
          <Bell size={48} style={{ opacity: 0.3, margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)' }}>You don't have any notifications.</h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {notifications.map(n => (
            <div 
              key={n.id} 
              className="glass-panel" 
              onClick={() => {
                if (!n.isRead) handleMarkAsRead(n.id);
                if (n.listingId || (n.listing && n.listing.id)) {
                  navigate(`/dashboard/items`);
                }
              }}
              style={{ 
                padding: '1.5rem', 
                borderRadius: '16px', 
                display: 'flex', 
                gap: '1.5rem', 
                cursor: !n.isRead ? 'pointer' : 'default',
                background: !n.isRead ? 'linear-gradient(145deg, rgba(255,0,110,0.1), rgba(0,0,0,0.2))' : undefined,
                border: !n.isRead ? '1px solid rgba(255,0,110,0.3)' : undefined,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '50px', flexShrink: 0 }}>
                {getIcon(n.type)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: !n.isRead ? '700' : '500' }}>
                    {n.title}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{timeAgo(n.createdAt)}</span>
                </div>
                
                <p style={{ margin: '0 0 1rem 0', color: !n.isRead ? '#fff' : 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  {n.message}
                </p>
                
                {n.listing && (
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(0,0,0,0.2)', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!n.isRead) handleMarkAsRead(n.id);
                      navigate(`/dashboard/items`); // They can find it there
                    }}
                  >
                    <img 
                      src={n.listing.firstImageUrl || 'https://placehold.co/100x100?text=No+Photo'} 
                      alt="Listing thumbnail" 
                      style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} 
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{n.listing.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {n.listing.price != null ? `LKR ${n.listing.price.toLocaleString()}` : ''}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {!n.isRead && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff006e' }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
