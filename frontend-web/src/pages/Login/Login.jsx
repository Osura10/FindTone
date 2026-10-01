import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { apiCall } from '../../services/api';
import { AuthLayout } from '../../components/AuthLayout';
import { Button, Input, PasswordInput } from '../../components/ui';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [pendingApprovalMsg, setPendingApprovalMsg] = useState('');
  const [loading, setLoading] = useState(false);
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

    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('role');

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
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your MusicMarket account."
      footer={<>Don&apos;t have an account? <Link to="/register">Sign up</Link></>}
    >
      {/* Info banner from registration (e.g. Shop/Admin pending approval) */}
      {infoMessage && !pendingApprovalMsg && !errors.global && (
        <div className="alert alert-info" role="status">
          <Clock size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{infoMessage}</span>
        </div>
      )}

      {/* Success banner from registration (e.g. Buyer success) */}
      {successMessage && !errors.global && !pendingApprovalMsg && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Pending Approval / Verification Error Banner */}
      {pendingApprovalMsg && (
        <div className="alert alert-warning" role="alert">
          <Clock size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong style={{ display: 'block', marginBottom: 2 }}>Account pending verification</strong>
            <span>{pendingApprovalMsg}</span>
          </div>
        </div>
      )}

      {/* General Login Error */}
      {errors.global && (
        <div className="alert alert-danger" role="alert">
          <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{errors.global}</span>
        </div>
      )}

      <form onSubmit={handleLogin} noValidate className="auth-form">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          error={errors.email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((current) => ({ ...current, email: '', global: '' }));
          }}
        />
        <PasswordInput
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          error={errors.password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((current) => ({ ...current, password: '', global: '' }));
          }}
        />

        <Button type="submit" size="lg" block icon={LogIn} loading={loading} disabled={Object.keys(errors).some((field) => errors[field])}>
          {loading ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
