import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, User, LogOut, ShieldCheck, Store, Users, ShoppingBag, ShieldAlert, BellPlus, Heart, Bell, Banknote, ListChecks } from 'lucide-react';

/**
 * Left navigation. The user and unread count come from DashboardLayout (no extra API calls here).
 */
const Sidebar = ({ currentUser, unreadCount = 0, onLogout }) => {
  const location = useLocation();
  // Until /auth/me answers, use the role saved at login so the menu does not flash.
  const role = (currentUser?.role || sessionStorage.getItem('role') || localStorage.getItem('role') || 'buyer').toLowerCase();

  const navItems = [];

  if (role === 'admin') {
    navItems.push(
      { name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard },
      { name: 'Admins', path: '/dashboard/admin/admins', icon: ShieldCheck },
      { name: 'Shops', path: '/dashboard/admin/shops', icon: Store },
      { name: 'Buyers', path: '/dashboard/admin/buyers', icon: Users },
      { name: 'Flagged Listings', path: '/dashboard/admin/listings', icon: ShieldAlert },
      { name: 'All Items', path: '/dashboard/items', icon: ShoppingBag }
    );
  } else {
    // Buyers and shops have the same features: both can buy AND sell.
    navItems.push(
      { name: 'Marketplace', path: '/dashboard/items', icon: LayoutDashboard },
      { name: 'My Listings', path: '/dashboard/items?tab=mine', icon: ListChecks },
      { name: 'Create Post', path: '/dashboard/create', icon: PlusCircle },
      { name: 'My Alerts', path: '/dashboard/alerts', icon: BellPlus },
      { name: 'Wishlist', path: '/dashboard/wishlist', icon: Heart },
      { name: 'Notifications', path: '/dashboard/notifications', icon: Bell, badge: unreadCount },
      { name: 'My Orders', path: '/dashboard/orders', icon: ShoppingBag },
      { name: 'My Sales', path: '/dashboard/sales', icon: Banknote }
    );
  }

  navItems.push({ name: 'Profile', path: '/dashboard/profile', icon: User });

  const displayRole = role.charAt(0).toUpperCase() + role.slice(1);

  // NavLink ignores "?tab=mine", so compare path + query ourselves.
  const isItemActive = (path) => {
    const [pathname, query = ''] = path.split('?');
    if (location.pathname !== pathname) return false;
    const current = new URLSearchParams(location.search).get('tab') || '';
    const wanted = new URLSearchParams(query).get('tab') || '';
    return current === wanted;
  };

  return (
    <div className="glass-panel sidebar-container" style={{
      width: '280px',
      height: 'calc(100vh - 2rem)',
      margin: '1rem 0 1rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      padding: '2.5rem 1.5rem',
      position: 'sticky',
      top: '1rem',
      overflowY: 'auto'
    }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 className="text-gradient-accent" style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '-1px', margin: 0 }}>MusicMarket</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', fontWeight: '500' }}>
          {displayRole} Portal
        </p>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end
            style={() => {
              const isActive = isItemActive(item.path);
              return {
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              color: isActive ? 'white' : 'var(--text-secondary)',
              background: isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              transition: 'all 0.3s ease',
              border: isActive ? '1px solid var(--glass-border)' : '1px solid transparent',
              fontWeight: isActive ? '600' : '400'
              };
            }}
          >
            <item.icon size={20} />
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
        onClick={onLogout}
        className="btn btn-outline"
        style={{ width: '100%', marginTop: '1rem', borderColor: 'rgba(255, 0, 110, 0.5)', color: '#ff006e' }}
      >
        <LogOut size={18} />
        Logout
      </button>
    </div>
  );
};

export default Sidebar;
