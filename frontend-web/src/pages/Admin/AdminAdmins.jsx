import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { 
  ShieldCheck, Trash2, Mail, Phone, CreditCard, Search, 
  CheckCircle2, Clock, AlertTriangle, Check, Loader2, 
  RefreshCw, User as UserIcon, XCircle, Shield, UserPlus
} from 'lucide-react';
import { apiCall } from '../../services/api';
import AddAdminModal from '../../components/AddAdminModal';

const AdminAdmins = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [admins, setAdmins] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'approved');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const [adminsData, meData] = await Promise.all([
        apiCall('/admin/users?role=admin'),
        apiCall('/auth/me').catch((err) => { showToast('error', `Could not load your admin account: ${err.message}`); return null; })
      ]);
      setAdmins(adminsData);
      if (meData) setCurrentUser(meData);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to load administrators list');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminCreated = (newAdmin, message) => {
    showToast('success', message || 'Administrator created successfully.');
    fetchAdmins();
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAdmins();
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

  const handleToggleApproval = async (admin) => {
    const newStatus = !admin.approval;
    try {
      setTogglingId(admin.id);
      await apiCall(`/admin/users/${admin.id}/approval`, {
        method: 'PUT',
        body: JSON.stringify({ approval: newStatus })
      });
      setAdmins((prev) =>
        prev.map((a) => (a.id === admin.id ? { ...a, approval: newStatus } : a))
      );
      showToast(
        'success',
        `Admin "${admin.name}" approval set to ${newStatus ? 'Approved' : 'Pending'}.`
      );
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to update admin approval status.');
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
      showToast('success', `Admin "${deleteTarget.name}" deleted successfully.`);
      setAdmins((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to delete administrator.');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAdmins = admins.filter((a) => {
    // Status filter
    if (statusFilter === 'approved' && !a.approval) return false;
    if (statusFilter === 'pending' && a.approval) return false;

    // Search filter
    const term = searchTerm.toLowerCase();
    return (
      (a.name && a.name.toLowerCase().includes(term)) ||
      (a.email && a.email.toLowerCase().includes(term)) ||
      (a.nicCardNumber && a.nicCardNumber.toLowerCase().includes(term)) ||
      (a.phoneNumber && a.phoneNumber.toLowerCase().includes(term))
    );
  });

  const approvedCount = admins.filter((a) => a.approval).length;
  const pendingCount = admins.filter((a) => !a.approval).length;

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
            <div style={{ padding: '0.5rem', background: 'var(--primary-soft)', borderRadius: '10px', color: 'var(--primary-hover)' }}>
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Manage Administrators</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Authorize and manage administrator accounts responsible for platform governance.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => setIsAddAdminOpen(true)} 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px', fontSize: '0.85rem' }}
          >
            <UserPlus size={16} /> Add New Admin
          </button>

          <button 
            onClick={fetchAdmins} 
            className="btn btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={16} /> Refresh List
          </button>
        </div>
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
            placeholder="Search admins by name, email, NIC, or phone number..."
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
          <p style={{ color: 'var(--text-secondary)' }}>Loading administrators list...</p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px' }}>
          <Shield size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-secondary)' }}>No administrators found</h3>
          <p style={{ color: 'var(--text-3)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {searchTerm || statusFilter !== 'all' ? 'Try adjusting your search or filter.' : 'No admin accounts registered yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredAdmins.map((admin) => {
            const isCurrentAdmin = Boolean(
              currentUser && (
                (currentUser.email && admin.email && currentUser.email.toLowerCase() === admin.email.toLowerCase()) ||
                (currentUser.id && admin.id === currentUser.id)
              )
            );

            return (
              <div 
                key={admin.id}
                className="glass-panel"
                style={{
                  padding: '1.75rem',
                  borderRadius: '20px',
                  border: isCurrentAdmin
                    ? '1px solid color-mix(in srgb, var(--success) 55%, transparent)'
                    : admin.approval 
                      ? '1px solid color-mix(in srgb, var(--primary) 40%, transparent)' 
                      : '1px solid color-mix(in srgb, var(--warning) 45%, transparent)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '1.25rem',
                  transition: 'all 0.25s ease',
                  background: isCurrentAdmin
                    ? 'var(--surface)'
                    : admin.approval
                      ? 'var(--surface-2)'
                      : 'var(--warning-soft)'
                }}
              >
                <div>
                  {/* Header: Image, Name, Status Badge, Delete Button */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: isCurrentAdmin 
                          ? '2px solid var(--success)' 
                          : admin.approval ? '2px solid var(--primary-hover)' : '2px solid color-mix(in srgb, var(--warning) 60%, transparent)',
                        background: 'var(--surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {admin.profileImageUrl ? (
                          <img src={admin.profileImageUrl} alt={admin.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <UserIcon size={28} color="rgba(255,255,255,0.7)" />
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>{admin.name}</h3>
                          {isCurrentAdmin && (
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: '700',
                              color: 'var(--success)',
                              background: 'var(--success-soft)',
                              border: '1px solid color-mix(in srgb, var(--success) 40%, transparent)',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '8px'
                            }}>
                              You
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          fontWeight: '700',
                          color: 'var(--primary-hover)',
                          background: 'var(--primary-soft)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          display: 'inline-block',
                          marginTop: '0.25rem'
                        }}>
                          Administrator
                        </span>
                      </div>
                    </div>

                    {/* Delete Button (Hidden for current logged-in admin) */}
                    {!isCurrentAdmin ? (
                      <button
                        onClick={() => setDeleteTarget(admin)}
                        title="Delete Administrator"
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
                    ) : (
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'var(--success)',
                        background: 'var(--success-soft)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '10px',
                        fontWeight: '600'
                      }}>
                        Current User
                      </span>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    {admin.approval ? (
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
                        <CheckCircle2 size={14} /> Active & Verified
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
                      <Mail size={16} color="var(--accent-color)" />
                      <span style={{ wordBreak: 'break-all' }}>{admin.email}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-2)' }}>
                      <CreditCard size={16} color="var(--warning)" />
                      <span>NIC: <strong style={{ color: 'var(--text)' }}>{admin.nicCardNumber || 'Not provided'}</strong></span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--text-2)' }}>
                      <Phone size={16} color="var(--success)" />
                      <span>{admin.phoneNumber || 'No phone provided'}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action: Verification Toggle (Hidden for current logged-in admin) */}
                <div style={{
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem'
                }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {admin.createdAt ? `Joined: ${new Date(admin.createdAt).toLocaleDateString()}` : ''}
                  </span>

                  {isCurrentAdmin ? (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.84rem',
                      fontWeight: '600',
                      color: 'var(--success)'
                    }}>
                      <CheckCircle2 size={16} /> Active Session
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={togglingId === admin.id}
                      onClick={() => handleToggleApproval(admin)}
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
                        ...(admin.approval
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
                        if (admin.approval) {
                          e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 35%, transparent)';
                          e.currentTarget.style.color = '#fff';
                        } else {
                          e.currentTarget.style.background = 'var(--success)';
                          e.currentTarget.style.color = '#000';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (admin.approval) {
                          e.currentTarget.style.background = 'var(--danger-soft)';
                          e.currentTarget.style.color = 'var(--danger)';
                        } else {
                          e.currentTarget.style.background = 'var(--success-soft)';
                          e.currentTarget.style.color = 'var(--success)';
                        }
                      }}
                    >
                      {togglingId === admin.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : admin.approval ? (
                        <>
                          <XCircle size={16} /> Revoke Approval
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} /> Approve Admin
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
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
              <h3 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Delete Administrator</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0 }}>
                Are you sure you want to remove administrator <strong style={{ color: 'var(--text)' }}>"{deleteTarget.name}"</strong>? This action cannot be undone.
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

      {/* Add Admin Modal */}
      <AddAdminModal 
        isOpen={isAddAdminOpen}
        onClose={() => setIsAddAdminOpen(false)}
        onAdminCreated={handleAdminCreated}
      />
    </div>
  );
};

export default AdminAdmins;
