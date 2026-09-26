import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, User, LogOut, ShieldCheck, Store, Users, ShoppingBag, ShieldAlert, BellPlus, Heart, Bell } from 'lucide-react';
import { apiCall } from '../services/api';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(() => (sessionStorage.getItem('role') || localStorage.getItem('role') || 'buyer').toLowerCase());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        const data = await apiCall('/auth/me');
        if (data && data.role) {
          const userRole = data.role.toLowerCase();
          setRole(userRole);
          sessionStorage.setItem('role', userRole);
          localStorage.setItem('role', userRole);
        }
      } catch (err) {
        console.error('Failed to sync role in sidebar', err);
      }
    };

    fetchUserRole();
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (role === 'admin') return;

    const fetchUnreadCount = async () => {
      try {
        const data = await apiCall('/notifications/unread-count');
        if (data && data.unreadCount !== undefined) {
          setUnreadCount(data.unreadCount);
        }
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [role]);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  // Navigation items based on role
  let navItems = [];

  if (role === 'admin') {
    // Admin specific top menu: Dashboard, Admins, Shops, Buyers
    navItems.push(
      { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
      { name: 'Admins', path: '/dashboard/admin/admins', icon: ShieldCheck },
      { name: 'Shops', path: '/dashboard/admin/shops', icon: Store },
      { name: 'Buyers', path: '/dashboard/admin/buyers', icon: Users },
      { name: 'Flagged Listings', path: '/dashboard/admin/listings', icon: ShieldAlert },
      { name: 'All Items', path: '/dashboard/items', icon: ShoppingBag }
    );
  } else {
    // Non-admin items
    navItems.push({ name: 'All Items', path: '/dashboard/items', icon: LayoutDashboard });
    navItems.push({ name: 'My Alerts', path: '/dashboard/alerts', icon: BellPlus });
    navItems.push({ name: 'Wishlist', path: '/dashboard/wishlist', icon: Heart });
    navItems.push({ name: 'Notifications', path: '/dashboard/notifications', icon: Bell, badge: unreadCount });

    // ONLY Shop gets the 'Create Post' option
    if (role === 'shop') {
      navItems.push({ name: 'Create Post', path: '/dashboard/create', icon: PlusCircle });
    }
  }

  // Everyone gets their own Profile
  navItems.push({ name: 'Profile', path: '/dashboard/profile', icon: User });

  // Format role for display
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
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '500' }}>
          {displayRole} Portal
        </p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end
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
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <item.icon size={20} />
              {item.badge > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#ff006e',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }}></span>
              )}
            </div>
            {item.name}
            {item.badge > 0 && (
              <span style={{
                background: '#ff006e',
                color: 'white',
                fontSize: '0.75rem',
                padding: '2px 8px',
                borderRadius: '12px',
                marginLeft: 'auto',
                fontWeight: 'bold'
              }}>
                {item.badge}
              </span>
            )}
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
