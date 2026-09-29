import React from 'react';

export const Input = ({ label, error, className = '', ...props }) => {
  return (
    <div className={`input-group ${className}`} style={{ marginBottom: '1rem', width: '100%' }}>
      {label && <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{label}</label>}
      <input 
        className="input-field" 
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(0,0,0,0.2)',
          border: `1px solid ${error ? 'var(--color-danger)' : 'var(--color-border-glass)'}`,
          color: 'var(--color-text-primary)',
          outline: 'none',
          transition: 'border-color var(--transition-fast)'
        }}
        {...props} 
      />
      {error && <span style={{ color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', marginTop: '0.25rem', display: 'block' }}>{error}</span>}
    </div>
  );
};
