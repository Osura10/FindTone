import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, User, LogOut } from 'lucide-react';

const SellerSidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const navItems = [
    { name: 'All Items', path: '/seller/items', icon: LayoutDashboard },
    { name: 'Create Post', path: '/seller/create', icon: PlusCircle },
    { name: 'Profile', path: '/seller/profile', icon: User },
  ];

  return (
    <div className="glass-panel sidebar-container" style={{
      width: '260px',
      height: 'calc(100vh - 2rem)',
      margin: '1rem 0 1rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      padding: '2.5rem 1.5rem',
      position: 'sticky',
      top: '1rem'
    }}>
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h2 className="text-gradient-accent" style={{ fontSize: '2.2rem', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>MusicMarket</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '500' }}>Seller Dashboard</p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'white' : 'var(--text-secondary)',
              background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              border: isActive ? '1px solid var(--glass-border)' : '1px solid transparent',
              fontWeight: isActive ? '600' : '400'
            })}
          >
            <item.icon size={20} />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={handleLogout}
        className="btn btn-outline"
        style={{ width: '100%', marginTop: 'auto', borderColor: 'rgba(255, 0, 110, 0.5)', color: '#ff006e' }}
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
};

export default SellerSidebar;
