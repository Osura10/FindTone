import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, User, LogOut } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const role = localStorage.getItem('role') || 'buyer'; // fallback to buyer

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  // Base items for everyone (Buyer, Admin, Shop, Seller)
  let navItems = [
    { name: 'All Items', path: '/dashboard/items', icon: LayoutDashboard },
  ];

  // Shop and Seller get the 'Create Post' option
  if (role === 'shop' || role === 'seller') {
    navItems.push({ name: 'Create Post', path: '/dashboard/create', icon: PlusCircle });
  }

  // Everyone gets a profile
  navItems.push({ name: 'Profile', path: '/dashboard/profile', icon: User });

  // Format the role for display (e.g., 'shop' -> 'Shop')
  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);

  return (
      <div className="glass-panel sidebar-container" style={{
        width: '280px',
        height: 'calc(100vh - 2rem)',
        margin: '1rem 0 1rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        padding: '2.5rem 1.5rem',
        position: 'sticky',
        top: '1rem'
      }}>
        <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
          <h2 className="text-gradient-accent" style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>MusicMarket</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '500' }}>{displayRole} Dashboard</p>
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

export default Sidebar;
