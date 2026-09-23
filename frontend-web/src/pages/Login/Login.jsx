import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, LogIn, Eye, EyeOff, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiCall } from '../../services/api';
import '../Register/Register.css'; // Reusing the premium form styles

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const infoMessage = location.state?.infoMessage;
  const successMessage = location.state?.successMessage;

  const isValidEmail = (value) => value.includes('@') && value.includes('.');

  const handleLogin = async (e) => {
    e.preventDefault();
    const validationErrors = {};
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) validationErrors.email = 'Email is required';
    else if (!isValidEmail(trimmedEmail)) validationErrors.email = 'Enter a valid email';
    if (!trimmedPassword) validationErrors.password = 'Password is required';
    else if (trimmedPassword.length < 6) validationErrors.password = 'Password must be at least 6 characters';

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setPendingApprovalMsg('');
    setLoading(true);

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });
      
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('role', (data.role || '').toLowerCase());
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', (data.role || '').toLowerCase());
      
      // Redirect based on role
      const userRole = (data.role || '').toLowerCase();
      if (userRole === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/dashboard/items');
      }
    } catch (err) {
      console.error(err);
      const msg = err.message || '';
      if (msg.toLowerCase().includes('verified') || msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('approval')) {
        setPendingApprovalMsg(msg || 'Please wait until your account is verified by an administrator.');
      } else {
        setErrors({ global: msg || 'Invalid email or password. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="bg-gradients">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
      </div>
      
      <div className="container">
        <div className="register-form-container glass-panel">
          <Link to="/" className="back-btn" style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="text-center mb-4 mt-4">
            <h2>Welcome Back</h2>
            <p className="register-subtitle mt-2">Sign in to your MusicMarket account.</p>
          </div>
          
          {/* Info banner from registration (e.g. Shop/Admin pending approval) */}
          {infoMessage && !pendingApprovalMsg && !errors.global && (
            <div style={{
              backgroundColor: 'rgba(254, 228, 64, 0.12)',
              color: '#fee440',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid rgba(254, 228, 64, 0.35)',
              fontSize: '0.9rem'
            }}>
              <Clock size={20} style={{ flexShrink: 0 }} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Success banner from registration (e.g. Buyer success) */}
          {successMessage && !errors.global && !pendingApprovalMsg && (
            <div style={{
              backgroundColor: 'rgba(0, 245, 212, 0.12)',
              color: '#00f5d4',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid rgba(0, 245, 212, 0.35)',
              fontSize: '0.9rem'
            }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Pending Approval / Verification Error Banner */}
          {pendingApprovalMsg && (
            <div style={{
              backgroundColor: 'rgba(254, 228, 64, 0.15)',
              color: '#fff',
              padding: '1.1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem',
              border: '1px solid rgba(254, 228, 64, 0.5)',
              boxShadow: '0 4px 20px rgba(254, 228, 64, 0.15)'
            }}>
              <Clock size={24} color="#fee440" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ color: '#fee440', display: 'block', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
                  Account Pending Verification
                </strong>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.4 }}>
                  {pendingApprovalMsg}
                </p>
              </div>
            </div>
          )}
          
          {/* General Login Error */}
          {errors.global && (
            <div style={{
              backgroundColor: 'rgba(255, 77, 79, 0.15)',
              color: '#ff4d4f',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              border: '1px solid rgba(255, 77, 79, 0.35)',
              fontSize: '0.9rem'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <span>{errors.global}</span>
            </div>
          )}
          
          <form onSubmit={handleLogin} noValidate>
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                className="form-control" 
                placeholder="Enter your email" 
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((current) => ({ ...current, email: '' }));
                }}
              />
              {errors.email && <small style={{ color: 'red' }}>{errors.email}</small>}
            </div>
            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? "text" : "password"} 
                  className="form-control" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((current) => ({ ...current, password: '' }));
                  }}
                />
                <button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <small style={{ color: 'red' }}>{errors.password}</small>}
            </div>
            
            <button type="submit" className="btn btn-primary w-100 mt-4 d-flex justify-content-center gap-2" disabled={loading || Object.keys(errors).some((field) => errors[field])}>
              <LogIn size={20} />
              {loading ? 'Logging in...' : 'Login'}
            </button>
            
            <div className="text-center" style={{ marginTop: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)' }}>
                Don't have an account? <Link to="/register" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>Sign up</Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
