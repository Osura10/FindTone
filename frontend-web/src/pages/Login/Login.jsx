import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogIn } from 'lucide-react';
import '../Register/Register.css'; // Reusing the premium form styles

const Login = () => {
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
          
          <form>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" placeholder="Enter your email" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className="form-control" placeholder="Enter your password" />
            </div>
            
            <button type="button" className="btn btn-primary w-100 mt-4 d-flex justify-content-center gap-2">
              <LogIn size={20} />
              Login
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
