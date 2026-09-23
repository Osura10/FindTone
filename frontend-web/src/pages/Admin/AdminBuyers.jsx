import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  Users, Trash2, Mail, Phone, CreditCard, Search, 
  AlertTriangle, Check, Loader2, RefreshCw, User as UserIcon
} from 'lucide-react';
import { apiCall } from '../../services/api';

const AdminBuyers = () => {
  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const fetchBuyers = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/admin/users?role=buyer');
      setBuyers(data);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to load buyers list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuyers();
  }, []);

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(true);
      await apiCall(`/admin/users/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      showToast('success', `Buyer "${deleteTarget.name}" deleted successfully.`);
      setBuyers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete buyer.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredBuyers = buyers.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      (b.name && b.name.toLowerCase().includes(term)) ||
      (b.email && b.email.toLowerCase().includes(term)) ||
      (b.nicCardNumber && b.nicCardNumber.toLowerCase().includes(term)) ||
      (b.phoneNumber && b.phoneNumber.toLowerCase().includes(term))
    );
  });

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Toast Notification */}
      {feedback.text && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 99999,
          background: feedback.type === 'error'
            ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(185, 28, 28, 0.95))'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.95))',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: '500',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {feedback.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(0, 245, 212, 0.15)', borderRadius: '10px', color: '#00f5d4' }}>
              <Users size={24} />
            </div>
            <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Registered Buyers</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Total registered buyer accounts: <strong style={{ color: '#fff' }}>{buyers.length}</strong>
          </p>
        </div>

        <button 
          onClick={fetchBuyers} 
          className="btn btn-outline" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={16} /> Refresh List
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-panel" style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.85rem 1.5rem',
        borderRadius: '16px',
        marginBottom: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        <Search size={20} style={{ color: 'var(--text-secondary)', marginRight: '1rem' }} />
        <input 
          type="text"
          placeholder="Search buyers by name, email, NIC, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#fff',
            outline: 'none',
            width: '100%',
            fontSize: '1rem'
          }}
        />
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading buyers list...</p>
        </div>
      ) : filteredBuyers.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px' }}>
          <Users size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-secondary)' }}>No buyers found</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {searchTerm ? 'Try adjusting your search criteria.' : 'No registered buyer accounts on the platform yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {filteredBuyers.map((buyer) => (
            <div 
              key={buyer.id}
              className="glass-panel"
              style={{
                padding: '1.75rem',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
                transition: 'all 0.25s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.3)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
              }}
            >
              <div>
                {/* Header with Avatar and Delete Button */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      border: '2px solid rgba(0, 245, 212, 0.4)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {buyer.profileImageUrl ? (
                        <img src={buyer.profileImageUrl} alt={buyer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <UserIcon size={28} color="rgba(255,255,255,0.7)" />
                      )}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>{buyer.name}</h3>
                      <span style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        fontWeight: '700',
                        color: '#00f5d4',
                        background: 'rgba(0, 245, 212, 0.1)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        display: 'inline-block',
                        marginTop: '0.25rem'
                      }}>
                        Buyer
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteTarget(buyer)}
                    title="Delete User"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#f87171',
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                      e.currentTarget.style.color = '#f87171';
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Details List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'rgba(255,255,255,0.85)' }}>
                    <Mail size={16} color="var(--accent-color)" />
                    <span style={{ wordBreak: 'break-all' }}>{buyer.email}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'rgba(255,255,255,0.85)' }}>
                    <Phone size={16} color="#00f5d4" />
                    <span>{buyer.phoneNumber || 'No phone provided'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'rgba(255,255,255,0.85)' }}>
                    <CreditCard size={16} color="#fee440" />
                    <span>NIC: <strong style={{ color: '#fff' }}>{buyer.nicCardNumber || 'Not provided'}</strong></span>
                  </div>
                </div>
              </div>

              <div style={{
                paddingTop: '0.85rem',
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)'
              }}>
                Registered: {buyer.createdAt ? new Date(buyer.createdAt).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && createPortal(
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(8, 6, 15, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          padding: '1.5rem'
        }}
          onClick={() => !actionLoading && setDeleteTarget(null)}
        >
          <div 
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '2.5rem',
              borderRadius: '24px',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              background: 'linear-gradient(145deg, rgba(30, 24, 45, 0.98), rgba(18, 14, 28, 0.99))',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Delete Buyer Account</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                Are you sure you want to permanently delete <strong style={{ color: '#fff' }}>"{deleteTarget.name}"</strong>? This action cannot be undone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-outline"
                disabled={actionLoading}
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, borderRadius: '12px' }}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn"
                disabled={actionLoading}
                onClick={handleDeleteUser}
                style={{
                  flex: 1,
                  borderRadius: '12px',
                  background: '#ef4444',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminBuyers;
