import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Music2, X, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const LINKS = [
  { href: '#browse', label: 'Explore' },
  { href: '#sell', label: 'Sell' },
  { href: '#shops', label: 'Shops' },
  { href: '#about', label: 'About AI' }
];

/** Public top bar on the landing page. */
const Header = () => {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="lp-header">
      <div className="lp-container lp-header-inner">
        <Link to="/" className="brand" aria-label="MusicMarket home">
          <span className="brand-mark"><Music2 size={18} aria-hidden="true" /></span>MusicMarket
        </Link>

        <nav className={`lp-nav ${open ? 'open' : ''}`} aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <div className="lp-nav-auth">
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/login')}>Log in</button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/register')}>Sign up</button>
          </div>
        </nav>

        <div className="row" style={{ gap: 6 }}>
          <button type="button" className="btn btn-ghost btn-icon" onClick={toggle} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="row hide-md" style={{ gap: 8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/login')}>Log in</button>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/register')}>Sign up</button>
          </div>
          <button type="button" className="btn btn-ghost btn-icon lp-menu-btn" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
