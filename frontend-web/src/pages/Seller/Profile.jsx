import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Briefcase, User, Key, Map, X, Camera, Trash2, AlertTriangle, Shield, Store, Check, Loader2 } from 'lucide-react';
import { apiCall } from '../../services/api';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Modals state: 'phone' | 'password' | 'location' | 'image' | 'delete' | null
  const [activeModal, setActiveModal] = useState(null);

  // Inputs
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [locationInput, setLocationInput] = useState('');

  const fetchProfile = async () => {
    try {
      const data = await apiCall('/auth/me');
      setUser(data);
      setPhoneInput(data.phoneNumber || '');
      setLocationInput(data.address || '');
    } catch (err) {
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProfile();
  }, []);

  const refreshProfile = async () => {
    try {
      const data = await apiCall('/auth/me');
      setUser(data);
      setPhoneInput(data.phoneNumber || '');
      setLocationInput(data.address || '');
    } catch (err) {
      showToast('error', err.message || 'Could not refresh your profile.');
    }
  };

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const closeModal = () => {
    if (actionLoading) return;
    setActiveModal(null);
    setPasswordInput('');
    setConfirmPasswordInput('');
  };

  const handleUpdatePhone = async (e) => {
    e?.preventDefault();
    if (!phoneInput) return;
    try {
      setActionLoading(true);
      await apiCall('/auth/profile/phone', {
        method: 'PUT',
        body: JSON.stringify({ phoneNumber: phoneInput })
      });
      showToast('success', 'Phone number updated successfully!');
      closeModal();
      await refreshProfile();
    } catch (err) {
      showToast('error', err.message || 'Failed to update phone number');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e?.preventDefault();
    if (!passwordInput || !confirmPasswordInput) {
      showToast('error', 'Please fill in all password fields');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      showToast('error', 'Passwords do not match');
      return;
    }
    if (passwordInput.length < 6) {
      showToast('error', 'Password must be at least 6 characters');
      return;
    }
    try {
      setActionLoading(true);
      await apiCall('/auth/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ newPassword: passwordInput })
      });
      showToast('success', 'Password changed successfully!');
      closeModal();
    } catch (err) {
      showToast('error', err.message || 'Failed to update password');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateLocation = async (e) => {
    e?.preventDefault();
    if (!locationInput) return;
    try {
      setActionLoading(true);
      await apiCall('/auth/profile/location', {
        method: 'PUT',
        body: JSON.stringify({ address: locationInput })
      });
      showToast('success', 'Store location updated successfully!');
      closeModal();
      await refreshProfile();
    } catch (err) {
      showToast('error', err.message || 'Failed to update location');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const payload = new FormData();
    payload.append('ProfileImage', file);
    try {
      setActionLoading(true);
      await apiCall('/auth/profile/image', { method: 'PUT', body: payload });
      showToast('success', 'Profile picture updated successfully!');
      closeModal();
      await refreshProfile();
    } catch (err) {
      showToast('error', err.message || 'Failed to update picture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      setActionLoading(true);
      await apiCall('/auth/profile/image', { method: 'DELETE' });
      showToast('success', 'Profile picture removed!');
      closeModal();
      await refreshProfile();
    } catch (err) {
      showToast('error', err.message || 'Failed to delete picture');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setActionLoading(true);
      await apiCall('/auth/account', { method: 'DELETE' });
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('role');
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      navigate('/login');
    } catch (err) {
      showToast('error', err.message || 'Failed to delete account');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in-up" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Loading Profile...</h2>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="animate-fade-in-up" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem', border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)' }}>
          <AlertTriangle size={48} color="var(--danger)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Failed to Load Profile</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error || 'Unable to fetch your profile information.'}</p>
          <button className="btn btn-primary" onClick={fetchProfile}>Retry</button>
        </div>
      </div>
    );
  }

  const displayRole = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const getRoleIcon = () => {
    switch (user.role) {
      case 'admin': return <Shield size={14} />;
      case 'shop': return <Store size={14} />;
      default: return <User size={14} />;
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1000px', margin: '0 auto' }}>

      {/* Toast Notification */}
      {feedback.text && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 9999,
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
          border: '1px solid var(--border-strong)',
          animation: 'fadeInUp 0.3s ease'
        }}>
          {feedback.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Main Profile Header Card */}
      <div className="glass-panel" style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '3rem',
        borderRadius: '24px',
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-2)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Glow ambient background elements */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '280px',
          height: '280px',
          background: 'radial-gradient(circle, var(--primary-color) 0%, transparent 70%)',
          opacity: '0.25',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-60px',
          left: '-60px',
          width: '220px',
          height: '220px',
          background: 'radial-gradient(circle, var(--accent-color) 0%, transparent 70%)',
          opacity: '0.15',
          filter: 'blur(45px)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>

          {/* Avatar Section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
            <div
              onClick={() => setActiveModal('image')}
              style={{
                width: '160px',
                height: '160px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid var(--border-strong)',
                boxShadow: '0 0 30px color-mix(in srgb, var(--primary) 55%, transparent)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                background: 'var(--surface-2)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.03)';
                e.currentTarget.style.borderColor = 'var(--primary-hover)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = 'var(--border-strong)';
              }}
              title="Click to change profile picture"
            >
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt="Profile"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', background: 'var(--primary-soft)' }}>
                  <User size={72} color="rgba(255,255,255,0.8)" />
                </div>
              )}

              {/* Overlay Badge */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'var(--surface-2)',
                opacity: 0,
                transition: 'opacity 0.25s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                color: 'var(--text)',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0'}
              >
                <Camera size={24} />
                <span>Edit Photo</span>
              </div>
            </div>

            {/* Role Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
              padding: '0.4rem 1.1rem',
              borderRadius: '30px',
              fontSize: '0.8rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px color-mix(in srgb, var(--primary) 45%, transparent)',
              border: '1px solid var(--border-strong)'
            }}>
              {getRoleIcon()}
              <span>{displayRole}</span>
            </div>
          </div>

          {/* Details Section */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            {/* Header / Name */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <h1 style={{ fontSize: '2.4rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                  {user.role === 'shop' ? user.ownerName : user.name}
                </h1>
              </div>
              {user.role === 'shop' && (
                <p style={{ color: 'var(--text-secondary)', margin: '0.35rem 0 0 0', fontSize: '1.15rem', fontWeight: '500' }}>
                  Shop Name: <span style={{ color: 'var(--text)' }}>{user.name}</span>
                </p>
              )}
            </div>

            {/* Information Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.25rem'
            }}>

              {/* Email Card */}
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--surface-2)',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--primary-soft)',
                  borderRadius: '12px',
                  color: 'var(--accent-color)'
                }}>
                  <Mail size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</p>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', wordBreak: 'break-all' }}>{user.email}</p>
                </div>
              </div>

              {/* Phone Card */}
              <div style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--surface-2)',
                padding: '1rem 1.25rem',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                <div style={{
                  padding: '0.75rem',
                  background: 'var(--success-soft)',
                  borderRadius: '12px',
                  color: 'var(--success)'
                }}>
                  <Phone size={20} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone Number</p>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{user.phoneNumber || 'Not provided'}</p>
                </div>
              </div>

              {/* Shop-specific info */}
              {user.role === 'shop' && (
                <>
                  <div style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--surface-2)',
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      padding: '0.75rem',
                      background: 'var(--warning-soft)',
                      borderRadius: '12px',
                      color: 'var(--warning)'
                    }}>
                      <MapPin size={20} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Store Address</p>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{user.address || 'Not provided'}</p>
                    </div>
                  </div>

                  <div style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--surface-2)',
                    padding: '1rem 1.25rem',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      padding: '0.75rem',
                      background: 'var(--primary-soft)',
                      borderRadius: '12px',
                      color: 'var(--primary)'
                    }}>
                      <Briefcase size={20} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Registration ID</p>
                      <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem' }}>{user.shopRegisterId || 'Not provided'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Bar */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--surface-2)',
              width: '100%'
            }}>
              {/* Primary Actions Row (Single Line) */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                flexWrap: 'nowrap',
                width: '100%'
              }}>
                <button
                  className="btn btn-outline"
                  onClick={() => { setPhoneInput(user.phoneNumber || ''); setActiveModal('phone'); }}
                  style={{
                    flex: 1,
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border-strong)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Phone size={16} /> Update Phone Number
                </button>

                <button
                  className="btn btn-outline"
                  onClick={() => setActiveModal('password')}
                  style={{
                    flex: 1,
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    padding: '0.65rem 0.75rem',
                    background: 'var(--surface-2)',
                    borderColor: 'var(--border-strong)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Key size={16} /> Update Password
                </button>

                {user.role === 'shop' && (
                  <button
                    className="btn btn-outline"
                    onClick={() => { setLocationInput(user.address || ''); setActiveModal('location'); }}
                    style={{
                      flex: 1,
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      padding: '0.65rem 0.75rem',
                      background: 'var(--surface-2)',
                      borderColor: 'var(--border-strong)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Map size={16} /> Update Location
                  </button>
                )}
              </div>

              {/* Delete Button Row (Centered Below) */}
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <button
                  className="btn"
                  onClick={() => setActiveModal('delete')}
                  style={{
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    padding: '0.6rem 1.75rem',
                    background: 'var(--danger-soft)',
                    color: 'var(--danger)',
                    border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--danger-soft)';
                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--danger) 70%, transparent)';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--danger-soft)';
                    e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--danger) 40%, transparent)';
                    e.currentTarget.style.color = 'var(--danger)';
                  }}
                >
                  <Trash2 size={16} /> Delete Account
                </button>
              </div>

            </div>

          </div>
        </div>
      </div>

      {/* MODERN POP-UP MODALS */}
      {activeModal && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh',
          background: 'var(--overlay)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          padding: '1.5rem',
          animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
          onClick={closeModal}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              padding: '2.5rem',
              position: 'relative',
              borderRadius: '24px',
              border: '1px solid var(--border-strong)',
              background: 'var(--surface)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top decorative gradient line */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: activeModal === 'delete'
                ? 'linear-gradient(90deg, var(--danger), var(--danger))'
                : 'linear-gradient(90deg, var(--primary-color), var(--accent-color))'
            }} />

            {/* Close Button */}
            <button
              onClick={closeModal}
              disabled={actionLoading}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-secondary)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'var(--border-strong)';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              <X size={18} />
            </button>

            {/* MODAL 1: UPDATE PHONE */}
            {activeModal === 'phone' && (
              <form onSubmit={handleUpdatePhone} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'var(--success-soft)', color: 'var(--success)' }}>
                    <Phone size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700' }}>Update Phone</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Enter your active contact phone number</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="e.g. +1 555 234 5678"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    required
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text)',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={closeModal} style={{ flex: 1, borderRadius: '12px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading || !phoneInput} style={{ flex: 1, borderRadius: '12px' }}>
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 2: UPDATE PASSWORD */}
            {activeModal === 'password' && (
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'var(--primary-soft)', color: 'var(--primary-hover)' }}>
                    <Key size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700' }}>Change Password</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Update your account login credentials</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>New Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="At least 6 characters"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    required
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Confirm Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Re-enter new password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    required
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={closeModal} style={{ flex: 1, borderRadius: '12px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading || !passwordInput || !confirmPasswordInput} style={{ flex: 1, borderRadius: '12px' }}>
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 3: UPDATE LOCATION */}
            {activeModal === 'location' && (
              <form onSubmit={handleUpdateLocation} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'var(--warning-soft)', color: 'var(--warning)' }}>
                    <MapPin size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700' }}>Update Location</h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Specify the physical address of your shop</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Shop Address</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 123 Music Ave, Nashville, TN"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    required
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: '12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text)',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-strong)'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <button type="button" className="btn btn-outline" onClick={closeModal} style={{ flex: 1, borderRadius: '12px' }}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={actionLoading || !locationInput} style={{ flex: 1, borderRadius: '12px' }}>
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Save Address'}
                  </button>
                </div>
              </form>
            )}

            {/* MODAL 4: PROFILE PICTURE */}
            {activeModal === 'image' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <div style={{ padding: '0.65rem', borderRadius: '12px', background: 'var(--primary-soft)', color: 'var(--accent-color)' }}>
                    <Camera size={22} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700' }}>Manage Profile Picture</h3>
                </div>

                <div style={{
                  width: '110px',
                  height: '110px',
                  borderRadius: '50%',
                  margin: '0 auto',
                  overflow: 'hidden',
                  border: '3px solid var(--border-strong)',
                  boxShadow: '0 0 20px color-mix(in srgb, var(--primary) 50%, transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-2)'
                }}>
                  {user.profileImageUrl ? (
                    <img src={user.profileImageUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={50} color="var(--primary-color)" />
                  )}
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                  Upload a new photo or remove your current picture. Supported formats: JPG, PNG, WEBP.
                </p>

                <input
                  type="file"
                  id="modalProfileImageInput"
                  style={{ display: 'none' }}
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => document.getElementById('modalProfileImageInput').click()}
                    disabled={actionLoading}
                    style={{ borderRadius: '12px', padding: '0.85rem' }}
                  >
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <><Camera size={18} /> Upload New Photo</>}
                  </button>

                  {user.profileImageUrl && (
                    <button
                      className="btn"
                      onClick={handleDeleteImage}
                      disabled={actionLoading}
                      style={{
                        borderRadius: '12px',
                        padding: '0.85rem',
                        background: 'var(--danger-soft)',
                        color: 'var(--danger)',
                        border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)'
                      }}
                    >
                      <Trash2 size={18} /> Remove Picture
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeModal}
                    style={{ borderRadius: '12px', padding: '0.65rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* MODAL 5: DELETE ACCOUNT CONFIRMATION */}
            {activeModal === 'delete' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'var(--danger-soft)',
                  border: '1px solid color-mix(in srgb, var(--danger) 40%, transparent)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto',
                  boxShadow: '0 0 25px color-mix(in srgb, var(--danger) 40%, transparent)'
                }}>
                  <AlertTriangle size={32} />
                </div>

                <div>
                  <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: '800', color: 'var(--text)' }}>
                    Delete Your Account?
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.6rem', lineHeight: '1.5' }}>
                    Are you sure you want to permanently delete your account? This will erase your profile data and delete your profile picture from Cloudinary. <strong style={{ color: 'var(--danger)' }}>This action cannot be undone.</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={closeModal}
                    disabled={actionLoading}
                    style={{ flex: 1, borderRadius: '12px', padding: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={handleDeleteAccount}
                    disabled={actionLoading}
                    style={{
                      flex: 1.2,
                      borderRadius: '12px',
                      padding: '0.85rem',
                      background: 'linear-gradient(135deg, var(--danger), #dc2626)',
                      color: 'white',
                      border: 'none',
                      fontWeight: '700',
                      boxShadow: '0 4px 15px color-mix(in srgb, var(--danger) 50%, transparent)'
                    }}
                  >
                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : 'Yes, Delete Account'}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default Profile;
