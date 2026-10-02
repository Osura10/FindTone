import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Bell, ChevronDown, KeyRound, LogOut, Menu, Moon, Music2, Search, ShoppingBag, Sun, User } from 'lucide-react';
import { Avatar } from './ui';
import { useTheme } from '../hooks/useTheme';

/**
 * Sticky top bar: brand, marketplace search, theme toggle, notification bell and profile menu.
 */
const Navbar = ({ currentUser, unreadCount = 0, onMenu, onLogout, onChangePassword }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState(params.get('q') || '');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  // Close the profile menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const search = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/dashboard/items?q=${encodeURIComponent(q)}` : '/dashboard/items');
  };

  return (
    <header className="navbar">
      <button type="button" className="btn btn-ghost btn-icon only-mobile" onClick={onMenu} aria-label="Open menu">
        <Menu size={20} />
      </button>
      <Link to={isAdmin ? '/dashboard/admin' : '/dashboard/items'} className="brand" aria-label="MusicMarket home">
        <span className="brand-mark"><Music2 size={18} aria-hidden="true" /></span>
        <span className="brand-text">MusicMarket</span>
      </Link>

      <form className="navbar-search hide-sm" role="search" onSubmit={search}>
        <label htmlFor="global-search" className="sr-only">Search instruments</label>
        <div className="input-icon-wrap">
          <Search size={16} aria-hidden="true" />
          <input
            id="global-search"
            className="input"
            type="search"
            placeholder="Search guitars, keyboards, brands…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </form>

      <div className="navbar-actions">
        <button type="button" className="btn btn-ghost btn-icon only-mobile" onClick={() => navigate('/dashboard/items')} aria-label="Search the marketplace">
          <Search size={18} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-icon"
          onClick={toggle}
          aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {currentUser && !isAdmin && (
          <Link
            to="/dashboard/notifications"
            className="btn btn-ghost btn-icon"
            style={{ position: 'relative' }}
            aria-label={`Notifications, ${unreadCount} unread`}
            title="Notifications"
            data-testid="notification-bell"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="icon-badge" data-testid="unread-count">{unreadCount > 99 ? '99+' : unreadCount}</span>
            )}
          </Link>
        )}

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ paddingLeft: 6, paddingRight: 8 }}
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
          >
            <Avatar name={currentUser?.name || ''} src={currentUser?.profileImageUrl} size={30} />
            <ChevronDown size={14} className="hide-sm" aria-hidden="true" />
          </button>
          {menuOpen && (
            <div className="menu" role="menu">
              <div style={{ padding: '8px 12px 10px' }}>
                <div style={{ fontWeight: 650 }} className="truncate">{currentUser?.name || 'Account'}</div>
                <div className="text-xs muted truncate">{currentUser?.email}</div>
                {currentUser?.role && <span className="badge badge-primary" style={{ marginTop: 6, textTransform: 'capitalize' }}>{currentUser.role}</span>}
              </div>
              <hr className="divider" style={{ margin: '4px 0' }} />
              <Link role="menuitem" className="menu-item" to="/dashboard/profile" onClick={() => setMenuOpen(false)}>
                <User size={16} aria-hidden="true" /> Profile
              </Link>
              {!isAdmin && (
                <Link role="menuitem" className="menu-item" to="/dashboard/orders" onClick={() => setMenuOpen(false)}>
                  <ShoppingBag size={16} aria-hidden="true" /> My orders
                </Link>
              )}
              <button type="button" role="menuitem" className="menu-item" onClick={() => { setMenuOpen(false); onChangePassword?.(); }}>
                <KeyRound size={16} aria-hidden="true" /> Change password
              </button>
              <hr className="divider" style={{ margin: '4px 0' }} />
              <button type="button" role="menuitem" className="menu-item danger" onClick={onLogout}>
                <LogOut size={16} aria-hidden="true" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
