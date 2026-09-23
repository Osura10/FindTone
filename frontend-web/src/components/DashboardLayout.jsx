import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AlertTriangle, KeyRound, CheckCircle2 } from 'lucide-react';
import Sidebar from './Sidebar';
import ChangePasswordModal from './ChangePasswordModal';
import { apiCall } from '../services/api';

const DashboardLayout = () => {
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const fetchUser = async () => {
    try {
      const data = await apiCall('/auth/me');
      setCurrentUser(data);
    } catch (err) {
      console.error('Failed to load user profile in layout:', err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [location.pathname]);

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
        <Sidebar />
        
        <div style={{ flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
          
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
            <Outlet />
          </div>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onPasswordChanged={handlePasswordChanged}
      />
    </>
  );
};

export default DashboardLayout;
