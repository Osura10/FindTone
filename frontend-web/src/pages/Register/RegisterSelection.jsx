import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Store, ShoppingBag, ArrowLeft, ShieldCheck } from 'lucide-react';
import './Register.css';

const RegisterSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="register-page">
      <div className="bg-gradients">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
      </div>
      
      <div className="register-container container">
        <Link to="/" className="back-btn" style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
          <ArrowLeft size={16} />
          Back to Home
        </Link>
        <div className="register-header text-center">
          <h1 className="register-title">Join <span className="text-gradient">MusicMarket</span></h1>
          <p className="register-subtitle">Choose how you want to use the platform.</p>
        </div>

        <div className="register-options">
          <div className="register-card glass-panel" onClick={() => navigate('/register/buyer')}>
            <div className="register-icon-wrapper" style={{ background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.2), rgba(255, 0, 110, 0.2))' }}>
              <ShoppingBag size={32} className="register-icon" />
            </div>
            <h3>Buyer Registration</h3>
            <p>I want to browse, search, and buy musical instruments.</p>
            <button className="btn btn-outline w-100 mt-3">Select Buyer</button>
          </div>

          <div className="register-card glass-panel" onClick={() => navigate('/register/seller')}>
            <div className="register-icon-wrapper" style={{ background: 'linear-gradient(135deg, rgba(58, 12, 163, 0.2), rgba(123, 44, 191, 0.2))' }}>
              <User size={32} className="register-icon" />
            </div>
            <h3>Seller Registration</h3>
            <p>I want to sell my personal musical instruments safely.</p>
            <button className="btn btn-outline w-100 mt-3">Select Seller</button>
          </div>

          <div className="register-card glass-panel" onClick={() => navigate('/register/shop')}>
            <div className="register-icon-wrapper" style={{ background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.2), rgba(58, 12, 163, 0.2))' }}>
              <Store size={32} className="register-icon" />
            </div>
            <h3>Shop Registration</h3>
            <p>I represent a local shop and want to list inventory.</p>
            <button className="btn btn-outline w-100 mt-3">Select Shop</button>
          </div>

          <div className="register-card glass-panel" onClick={() => navigate('/register/admin')}>
            <div className="register-icon-wrapper" style={{ background: 'linear-gradient(135deg, rgba(10, 150, 200, 0.2), rgba(10, 50, 255, 0.2))' }}>
              <ShieldCheck size={32} className="register-icon" />
            </div>
            <h3>Admin Registration</h3>
            <p>I am a platform administrator.</p>
            <button className="btn btn-outline w-100 mt-3">Select Admin</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterSelection;
