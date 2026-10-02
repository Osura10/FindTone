import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, PlusCircle, User, LogOut, ShieldCheck, Store, Users, ShoppingBag, ShieldAlert,
  BellPlus, Heart, Bell, Banknote, ListChecks, X, Music2
} from 'lucide-react';

/** Menu sections per role. Buyers and shops have the same features: both can buy AND sell. */
const sectionsFor = (role, unreadCount) =>
  role === 'admin'
    ? [
        { title: 'Overview', items: [{ name: 'Dashboard', path: '/dashboard/admin', icon: LayoutDashboard }] },
        { title: 'Moderation', items: [{ name: 'Review queue', path: '/dashboard/admin/listings', icon: ShieldAlert }, { name: 'All listings', path: '/dashboard/items', icon: ShoppingBag }] },
        {
          title: 'Users',
          items: [
            { name: 'Shops', path: '/dashboard/admin/shops', icon: Store },
            { name: 'Buyers', path: '/dashboard/admin/buyers', icon: Users },
            { name: 'Admins', path: '/dashboard/admin/admins', icon: ShieldCheck }
          ]
        },
        { title: 'Account', items: [{ name: 'Profile', path: '/dashboard/profile', icon: User }] }
      ]
    : [
        {
          title: 'Shop',
          items: [
            { name: 'Marketplace', path: '/dashboard/items', icon: LayoutDashboard },
            { name: 'Wishlist', path: '/dashboard/wishlist', icon: Heart },
            { name: 'My Alerts', path: '/dashboard/alerts', icon: BellPlus },
            { name: 'My Orders', path: '/dashboard/orders', icon: ShoppingBag }
          ]
        },
        {
          title: 'Sell',
          items: [
            { name: 'My Listings', path: '/dashboard/items?tab=mine', icon: ListChecks },
            { name: 'Create Post', path: '/dashboard/create', icon: PlusCircle },
            { name: 'My Sales', path: '/dashboard/sales', icon: Banknote }
          ]
        },
        {
          title: 'Account',
          items: [
            { name: 'Notifications', path: '/dashboard/notifications', icon: Bell, badge: unreadCount },
            { name: 'Profile', path: '/dashboard/profile', icon: User }
          ]
        }
      ];

/**
 * Role-aware navigation. On small screens it becomes a drawer (open/onClose from the layout).
 */
const Sidebar = ({ currentUser, unreadCount = 0, open = false, onClose, onLogout }) => {
  const location = useLocation();
  // Until /auth/me answers, use the role saved at login so the menu does not flash.
  const role = (currentUser?.role || sessionStorage.getItem('role') || localStorage.getItem('role') || 'buyer').toLowerCase();

  // NavLink ignores "?tab=mine", so compare path + tab ourselves.
  const isActive = (path) => {
    const [pathname, query = ''] = path.split('?');
    if (location.pathname !== pathname) return false;
    return (new URLSearchParams(location.search).get('tab') || '') === (new URLSearchParams(query).get('tab') || '');
  };

  return (
    <>
      <div className={`drawer-backdrop ${open ? 'open' : ''}`} onClick={onClose} aria-hidden="true" />
      <nav className={`sidebar ${open ? 'open' : ''}`} aria-label="Main">
        <div className="row-between only-mobile" style={{ padding: '0 var(--space-2) var(--space-2)' }}>
          <span className="brand">
            <span className="brand-mark"><Music2 size={18} aria-hidden="true" /></span>MusicMarket
          </span>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {sectionsFor(role, unreadCount).map((section) => (
          <div key={section.title}>
            <div className="sidebar-section">{section.title}</div>
            {section.items.map((item) => {
              const active = isActive(item.path);
              return (
                <Link key={item.name} to={item.path} className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <item.icon size={18} aria-hidden="true" />
                  {item.name}
                  {item.badge > 0 && <span className="count" aria-label={`${item.badge} unread`}>{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        ))}

        <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)' }}>
          <button type="button" onClick={onLogout} className="nav-item w-100" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--danger)' }}>
            <LogOut size={18} aria-hidden="true" /> Log out
          </button>
        </div>
      </nav>
    </>
  );
};

export default Sidebar;
