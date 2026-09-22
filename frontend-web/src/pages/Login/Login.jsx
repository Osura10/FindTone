import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogIn, Eye, EyeOff } from 'lucide-react';
import { apiCall } from '../../services/api';
import '../Register/Register.css'; // Reusing the premium form styles

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
    setLoading(true);

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setErrors({ global: 'Invalid email or password. Please try again.' });
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
          
          {errors.global && (
            <div style={{ backgroundColor: 'rgba(255,0,0,0.1)', color: '#ff4d4d', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', textAlign: 'center', border: '1px solid rgba(255,0,0,0.3)' }}>
              {errors.global}
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
