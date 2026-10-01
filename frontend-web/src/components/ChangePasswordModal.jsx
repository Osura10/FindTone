import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { KeyRound, X, Loader2 } from 'lucide-react';
import { apiCall } from '../services/api';

const ChangePasswordModal = ({ isOpen, onClose, onPasswordChanged }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await apiCall('/auth/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ newPassword })
      });

      if (onPasswordChanged) {
        onPasswordChanged();
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--overlay)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999999,
        padding: '1.5rem',
        animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={() => !loading && onClose()}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '2.5rem',
          position: 'relative',
          borderRadius: '24px',
          border: '1px solid color-mix(in srgb, var(--warning) 50%, transparent)',
          background: 'var(--surface)',
          boxShadow: 'var(--shadow-lg)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Bar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, var(--warning), var(--primary-text))'
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
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

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div style={{
            padding: '0.75rem',
            borderRadius: '14px',
            background: 'var(--warning-soft)',
            color: 'var(--warning)',
            border: '1px solid color-mix(in srgb, var(--warning) 40%, transparent)'
          }}>
            <KeyRound size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>Change Temporary Password</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Set a secure personalized password for your account
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: 'var(--danger-soft)',
            color: 'var(--danger)',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            border: '1px solid color-mix(in srgb, var(--danger) 45%, transparent)',
            fontSize: '0.88rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
              New Password
            </label>
            <input 
              type="password"
              className="form-control"
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text)',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'block' }}>
              Confirm New Password
            </label>
            <input 
              type="password"
              className="form-control"
              placeholder="Re-type new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text)',
                fontSize: '0.95rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose} 
              disabled={loading}
              style={{ flex: 1, borderRadius: '12px' }}
            >
              Later
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading || !newPassword || !confirmPassword}
              style={{ flex: 1, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Set Password'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default ChangePasswordModal;
