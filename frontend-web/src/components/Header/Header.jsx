import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Guitar, Search, Menu, User, LogIn } from 'lucide-react';
import './Header.css';

const Header = () => {
  const navigate = useNavigate();

  return (
    <header className="header glass-panel">
      <div className="header-content container">
        <div className="logo">
          <Guitar className="logo-icon" size={28} />
          <span className="logo-text">MusicMarket</span>
        </div>
        
        <nav className="desktop-nav">
          <a href="#browse" className="nav-link">Explore</a>
          <a href="#sell" className="nav-link">Sell</a>
          <a href="#shops" className="nav-link">Shops</a>
          <a href="#about" className="nav-link">About AI</a>
        </nav>

        <div className="header-actions">
          <div className="auth-buttons">
            <button className="btn btn-outline" onClick={() => navigate('/login')}>
              <LogIn size={18} />
              Login
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/register')}>
              <User size={18} />
              Sign Up
            </button>
          </div>
          <button className="mobile-menu-btn icon-btn" aria-label="Menu">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
