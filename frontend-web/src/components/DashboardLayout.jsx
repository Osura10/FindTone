import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { AlertTriangle, KeyRound, CheckCircle2, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import ChangePasswordModal from './ChangePasswordModal';
import { apiCall } from '../services/api';
import ErrorBoundary from './ErrorBoundary';
import ShoppingAssistant, { ShoppingAssistantLauncher } from './ShoppingAssistant/ShoppingAssistant';

const UNREAD_POLL_MS = 30000;

const clearSession = () => {
  ['token', 'role'].forEach((k) => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
};

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Load the logged-in user once; every dashboard page reads it from the outlet context.
  const refreshUser = useCallback(async () => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    setUserError('');
    try {
      const data = await apiCall('/auth/me');
      setCurrentUser(data);
      const role = data.role?.toLowerCase() || '';
      sessionStorage.setItem('role', role);
      localStorage.setItem('role', role);
    } catch (err) {
      if (err.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
        return;
      }
      setUserError(err.message || 'Could not load your account.');
    } finally {
      setUserLoading(false);
    }
  }, [navigate]);

  // Unread notifications for the bell and the sidebar badge (admins have none).
  const refreshUnread = useCallback(async () => {
    try {
      const data = await apiCall('/notifications/unread-count');
      setUnreadCount(data?.unreadCount ?? 0);
    } catch (err) {
      // A failed background poll keeps the last known count; the next poll tries again.
      console.warn('Unread count poll failed:', err.message);
      if (err.status === 401) {
        clearSession();
        navigate('/login', { replace: true });
      }
    }
  }, [navigate]);

  useEffect(() => {
    // Async loader: state is set after the request finishes, not synchronously here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUser();
  }, [refreshUser]);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (!currentUser || isAdmin) return undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshUnread();
    const timer = setInterval(refreshUnread, UNREAD_POLL_MS);
    return () => clearInterval(timer);
  }, [currentUser, isAdmin, refreshUnread]);

  const handlePasswordChanged = () => {
    setPasswordChangeSuccess(true);
    setCurrentUser((prev) => (prev ? { ...prev, isDefaultPassword: false } : prev));
    setTimeout(() => setPasswordChangeSuccess(false), 5000);
  };

  return (
    <>
      {/* Background gradients for the modern look */}
      <div className="bg-gradients">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
        <div className="gradient-sphere sphere-3"></div>
      </div>
      
      <div style={{ display: 'flex', minHeight: '100vh', width: '100%', margin: 0 }}>
        <Sidebar currentUser={currentUser} unreadCount={unreadCount} onLogout={() => { clearSession(); navigate('/login'); }} />
        
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>

          {/* Top bar: notification bell with the unread count (buyers and shops only) */}
          {currentUser && !isAdmin && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.5rem' }}>
              <Link
                to="/dashboard/notifications"
                aria-label={`Notifications, ${unreadCount} unread`}
                title="Notifications"
                data-testid="notification-bell"
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span data-testid="unread-count" style={{ position: 'absolute', top: '-4px', right: '-4px', minWidth: '20px', height: '20px', padding: '0 5px', borderRadius: '10px', background: '#ff006e', color: '#fff', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            </div>
          )}

          {userError && (
            <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.35)', color: '#ff8787', marginBottom: '1rem' }}>
              <AlertTriangle size={18} />
              <span style={{ flex: 1 }}>{userError}</span>
              <button type="button" className="btn btn-outline" onClick={refreshUser} style={{ padding: '0.4rem 0.9rem' }}>Try again</button>
            </div>
          )}
          
          {/* Security Alert: Temporary Default Password Warning */}
          {currentUser?.isDefaultPassword && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(254, 228, 64, 0.18), rgba(255, 0, 110, 0.15))',
              border: '1px solid rgba(254, 228, 64, 0.45)',
              borderRadius: '16px',
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              boxShadow: '0 8px 24px rgba(254, 228, 64, 0.12)',
              backdropFilter: 'blur(10px)',
              animation: 'fadeInUp 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  padding: '0.5rem',
                  borderRadius: '10px',
                  background: 'rgba(254, 228, 64, 0.2)',
                  color: '#fee440',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <strong style={{ color: '#fee440', fontSize: '0.98rem', display: 'block' }}>
                    Security Notice: Temporary Password Active
                  </strong>
                  <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '0.88rem' }}>
                    Your password is currently set to your default NIC number. Please update your password to secure your account.
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="btn btn-primary"
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.88rem',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap'
                }}
              >
                <KeyRound size={16} /> Change Password Now
              </button>
            </div>
          )}

          {/* Success Toast when password is changed */}
          {passwordChangeSuccess && (
            <div style={{
              background: 'rgba(0, 245, 212, 0.15)',
              border: '1px solid rgba(0, 245, 212, 0.4)',
              color: '#00f5d4',
              borderRadius: '14px',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9rem'
            }}>
              <CheckCircle2 size={20} />
              <span>Password updated successfully! Your account is now secured.</span>
            </div>
          )}

          <div style={{ flex: 1 }}>
            <Outlet context={{ currentUser, userLoading, unreadCount, refreshUnread, refreshUser }} />
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onPasswordChanged={handlePasswordChanged}
      />

      {/* Shopping Assistant floating UI - Only for buyers and shops */}
      {currentUser && !isAdmin && (
        <ErrorBoundary>
          {!isAssistantOpen && (
            <ShoppingAssistantLauncher onClick={() => setIsAssistantOpen(true)} />
          )}
          {isAssistantOpen && (
            <ShoppingAssistant onClose={() => setIsAssistantOpen(false)} />
          )}
        </ErrorBoundary>
      )}
    </>
  );
};

export default DashboardLayout;
