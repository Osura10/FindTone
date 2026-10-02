import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, Music2, ShieldCheck, Tag, Bell } from 'lucide-react';
import '../pages/Register/Register.css';

/**
 * Split screen used by Login and Register: brand panel on the left (hidden on phones), form on the right.
 */
export const AuthLayout = ({ title, subtitle, backTo = '/', backLabel = 'Back to home', wide = false, children, footer }) => (
  <div className="auth-page">
    <aside className="auth-aside" aria-hidden="true">
      <Link to="/" className="brand" style={{ color: '#fff' }} tabIndex={-1}>
        <span className="brand-mark" style={{ background: 'rgba(255,255,255,0.18)' }}><Music2 size={18} /></span>MusicMarket
      </Link>
      <div className="auth-aside-copy">
        <h2>The trusted way to buy and sell instruments in Sri Lanka.</h2>
        <ul>
          <li><ShieldCheck size={18} /> Every listing is checked by AI before it goes live</li>
          <li><Tag size={18} /> See if a price is fair before you buy</li>
          <li><Bell size={18} /> Get alerts for the gear you want</li>
        </ul>
      </div>
      <p className="auth-aside-foot">© 2026 MusicMarket</p>
    </aside>

    <main className="auth-main">
      <div className={`auth-card ${wide ? 'wide' : ''}`}>
        <Link to="/" className="brand auth-mobile-brand" aria-label="MusicMarket home">
          <span className="brand-mark"><Music2 size={18} aria-hidden="true" /></span>MusicMarket
        </Link>
        <Link to={backTo} className="auth-back"><ArrowLeft size={16} aria-hidden="true" /> {backLabel}</Link>
        <header className="auth-head">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </header>
        {children}
        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </main>
  </div>
);

/** Round profile-photo picker used on both registration forms. */
export const PhotoPicker = ({ preview, onChange, onRemove, name = 'profileImage', label = 'Profile picture (optional)' }) => {
  const inputRef = useRef(null);
  return (
    <div className="photo-picker">
      <button type="button" className="photo-picker-circle" onClick={() => inputRef.current?.click()} aria-label={preview ? 'Change profile picture' : 'Add profile picture'}>
        {preview ? <img src={preview} alt="Profile preview" /> : <Camera size={26} aria-hidden="true" />}
      </button>
      <div className="stack-sm" style={{ gap: 4 }}>
        <span className="field-label">{label}</span>
        <div className="row" style={{ gap: 8 }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()}>{preview ? 'Change' : 'Upload photo'}</button>
          {preview && (
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => { if (inputRef.current) inputRef.current.value = ''; onRemove(); }}>
              Remove
            </button>
          )}
        </div>
      </div>
      <input ref={inputRef} id="profileImageInput" type="file" name={name} accept="image/*" onChange={onChange} hidden />
    </div>
  );
};
