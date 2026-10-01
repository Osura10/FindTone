import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { ErrorState } from './ui';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer after navigating.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  const logout = () => {
    clearSession();
    navigate('/login');
  };

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
    <div className="app-shell">
      <a href="#main" className="skip-link">Skip to content</a>
      <Navbar
        currentUser={currentUser}
        unreadCount={unreadCount}
        onMenu={() => setSidebarOpen(true)}
        onLogout={logout}
        onChangePassword={() => setIsPasswordModalOpen(true)}
      />

      <div className="app-body">
        <Sidebar currentUser={currentUser} unreadCount={unreadCount} open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logout} />

        <main id="main" className="main">
          <div className="page" style={{ gap: 'var(--space-4)', marginBottom: currentUser?.isDefaultPassword || passwordChangeSuccess || userError ? 'var(--space-6)' : 0 }}>
            {/* Security notice: the admin password is still the default NIC number */}
            {currentUser?.isDefaultPassword && (
              <div className="alert alert-warning" role="status">
                <AlertTriangle size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
                <div className="grow">
                  <strong>Temporary password active.</strong>{' '}
                  Your password is still your NIC number. Change it to secure your account.
                </div>
                <button type="button" onClick={() => setIsPasswordModalOpen(true)} className="btn btn-sm btn-primary">
                  <KeyRound size={14} aria-hidden="true" /> Change password
                </button>
              </div>
            )}
            {passwordChangeSuccess && (
              <div className="alert alert-success" role="status">
                <CheckCircle2 size={20} aria-hidden="true" />
                <span className="grow">Password updated. Your account is now secured.</span>
              </div>
            )}
            {userError && <ErrorState compact message={userError} onRetry={refreshUser} />}
          </div>

          <Outlet context={{ currentUser, userLoading, unreadCount, refreshUnread, refreshUser }} />
        </main>
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
    </div>
  );
};

export default DashboardLayout;
