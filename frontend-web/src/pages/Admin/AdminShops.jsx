import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Store, Trash2, Phone, CreditCard, Search, MapPin, FileText, CheckCircle2, Clock, AlertTriangle, Check, Loader2, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { apiCall } from '../../services/api';

const AdminShops = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'approved');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const fetchShops = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/admin/users?role=shop');
      setShops(data);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to load shops list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchShops();
  }, []);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatusFilter(status);
    }
  }, [searchParams]);

  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setSearchParams({ status: filter });
  };

  const handleToggleApproval = async (shop) => {
    const newStatus = !shop.approval;
    try {
      setTogglingId(shop.id);
      await apiCall(`/admin/users/${shop.id}/approval`, {
        method: 'PUT',
        body: JSON.stringify({ approval: newStatus })
      });
      setShops((prev) =>
        prev.map((s) => (s.id === shop.id ? { ...s, approval: newStatus } : s))
      );
      showToast(
        'success',
        `Shop "${shop.name}" approval set to ${newStatus ? 'Approved' : 'Pending'}.`
      );
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to update shop approval status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      setActionLoading(true);
      await apiCall(`/admin/users/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      showToast('success', `Shop "${deleteTarget.name}" deleted successfully.`);
      setShops((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete shop.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredShops = shops.filter((s) => {
    // Status filter
    if (statusFilter === 'approved' && !s.approval) return false;
    if (statusFilter === 'pending' && s.approval) return false;

    // Search filter
    const term = searchTerm.toLowerCase();
    return (
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.ownerName && s.ownerName.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.address && s.address.toLowerCase().includes(term)) ||
      (s.shopRegisterId && s.shopRegisterId.toLowerCase().includes(term)) ||
      (s.nicCardNumber && s.nicCardNumber.toLowerCase().includes(term)) ||
      (s.phoneNumber && s.phoneNumber.toLowerCase().includes(term))
    );
  });

  const approvedCount = shops.filter((s) => s.approval).length;
  const pendingCount = shops.filter((s) => !s.approval).length;

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
            : 'linear-gradient(135deg, var(--success), rgba(5, 150, 105, 0.95))',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: '500',
          border: '1px solid var(--border-strong)'
        }}>
          {feedback.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'var(--primary-soft)', borderRadius: '10px', color: 'var(--accent-color)' }}>
              <Store size={24} />
            </div>
            <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Manage Shops</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Verify registered shops and manage business listings across the platform.
          </p>
        </div>

        <button 
          onClick={fetchShops} 
          className="btn btn-outline" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={16} /> Refresh List
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleFilterChange('approved')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '25px',
              border: statusFilter === 'approved' ? '1px solid var(--success)' : '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
              background: statusFilter === 'approved' ? 'var(--success-soft)' : 'var(--success-soft)',
              color: 'var(--success)',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircle2 size={15} /> Approved ({approvedCount})
          </button>

          <button
            onClick={() => handleFilterChange('pending')}
            style={{
              padding: '0.6rem 1.25rem',
              borderRadius: '25px',
              border: statusFilter === 'pending' ? '1px solid var(--warning)' : '1px solid color-mix(in srgb, var(--warning) 35%, transparent)',
              background: statusFilter === 'pending' ? 'var(--warning-soft)' : 'var(--warning-soft)',
              color: 'var(--warning)',
              fontSize: '0.88rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s ease'
            }}
          >
            <Clock size={15} /> Pending Verification ({pendingCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="glass-panel" style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.85rem 1.5rem',
          borderRadius: '16px',
          border: '1px solid var(--border-strong)'
        }}>
          <Search size={20} style={{ color: 'var(--text-secondary)', marginRight: '1rem' }} />
          <input 
            type="text"
            placeholder="Search shops by name, owner, registration ID, location, or NIC..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              outline: 'none',
              width: '100%',
              fontSize: '1rem'
            }}
          />
        </div>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading shops list...</p>
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px' }}>
          <Store size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-secondary)' }}>No shops found</h3>
          <p style={{ color: 'var(--text-3)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'No registered shops found.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredShops.map((shop) => (
            <div 
              key={shop.id}
              className="glass-panel"
              style={{
                padding: '1.75rem',
                borderRadius: '20px',
                border: shop.approval 
                  ? '1px solid color-mix(in srgb, var(--success) 35%, transparent)' 
                  : '1px solid color-mix(in srgb, var(--warning) 45%, transparent)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.25rem',
                transition: 'all 0.25s ease',
                background: shop.approval
                  ? 'var(--surface-2)'
                  : 'var(--warning-soft)'
              }}
            >
              <div>
                {/* Header: Image, Shop Name, Status Badge, Delete Button */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      border: shop.approval ? '2px solid color-mix(in srgb, var(--success) 60%, transparent)' : '2px solid color-mix(in srgb, var(--warning) 60%, transparent)',
                      background: 'var(--surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {shop.profileImageUrl ? (
                        <img src={shop.profileImageUrl} alt={shop.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Store size={28} color="rgba(255,255,255,0.7)" />
                      )}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', wordBreak: 'break-word' }}>{shop.name}</h3>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Owner: <strong style={{ color: 'var(--text)' }}>{shop.ownerName || 'Not specified'}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteTarget(shop)}
                    title="Delete Shop"
                    style={{
                      background: 'var(--danger-soft)',
                      border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
                      color: 'var(--danger)',
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 35%, transparent)';
                      e.currentTarget.style.color = '#fff';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'var(--danger-soft)';
                      e.currentTarget.style.color = 'var(--danger)';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Status Badge */}
                <div style={{ marginBottom: '1.25rem' }}>
                  {shop.approval ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'var(--success-soft)',
                      color: 'var(--success)',
                      border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      <CheckCircle2 size={14} /> Approved & Verified
                    </span>
                  ) : (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      background: 'var(--warning-soft)',
                      color: 'var(--warning)',
                      border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)',
                      padding: '0.3rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      textTransform: 'uppercase'
                    }}>
                      <Clock size={14} /> Pending Verification
                    </span>
                  )}
                </div>

                {/* Details List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.88rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-2)' }}>
                    <FileText size={16} color="var(--primary-hover)" />
                    <span>Reg ID: <strong style={{ color: 'var(--text)' }}>{shop.shopRegisterId || 'Not provided'}</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-2)' }}>
                    <CreditCard size={16} color="var(--warning)" />
                    <span>Owner NIC: <strong style={{ color: 'var(--text)' }}>{shop.nicCardNumber || 'Not provided'}</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-2)' }}>
                    <Phone size={16} color="var(--success)" />
                    <span>{shop.phoneNumber || 'No phone provided'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-2)' }}>
                    <MapPin size={16} color="var(--accent-color)" />
                    <span style={{ wordBreak: 'break-word' }}>{shop.address || 'No location address provided'}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Action: Verification Toggle */}
              <div style={{
                paddingTop: '1rem',
                borderTop: '1px solid var(--surface-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem'
              }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {shop.createdAt ? `Joined: ${new Date(shop.createdAt).toLocaleDateString()}` : ''}
                </span>

                <button
                  type="button"
                  disabled={togglingId === shop.id}
                  onClick={() => handleToggleApproval(shop)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    transition: 'all 0.2s ease',
                    border: '1px solid',
                    ...(shop.approval
                      ? {
                          background: 'var(--danger-soft)',
                          borderColor: 'color-mix(in srgb, var(--danger) 45%, transparent)',
                          color: 'var(--danger)'
                        }
                      : {
                          background: 'var(--success-soft)',
                          borderColor: 'var(--success)',
                          color: 'var(--success)'
                        })
                  }}
                  onMouseOver={(e) => {
                    if (shop.approval) {
                      e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 35%, transparent)';
                      e.currentTarget.style.color = '#fff';
                    } else {
                      e.currentTarget.style.background = 'var(--success)';
                      e.currentTarget.style.color = '#000';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (shop.approval) {
                      e.currentTarget.style.background = 'var(--danger-soft)';
                      e.currentTarget.style.color = 'var(--danger)';
                    } else {
                      e.currentTarget.style.background = 'var(--success-soft)';
                      e.currentTarget.style.color = 'var(--success)';
                    }
                  }}
                >
                  {togglingId === shop.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : shop.approval ? (
                    <>
                      <XCircle size={16} /> Revoke Approval
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} /> Approve Shop
                    </>
                  )}
                </button>
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
          background: 'var(--overlay)',
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
              border: '1px solid color-mix(in srgb, var(--danger) 50%, transparent)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-lg)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--danger-soft)',
                color: 'var(--danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Delete Shop Account</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                Are you sure you want to delete shop <strong style={{ color: 'var(--text)' }}>"{deleteTarget.name}"</strong>? This will remove their listings and account immediately.
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
                  background: 'var(--danger)',
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

export default AdminShops;
