import React from 'react';

export const Badge = ({ children, variant = 'primary', className = '', ...props }) => {
  const colors = {
    primary: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
    success: { bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    danger: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger)' },
    info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)' },
    default: { bg: 'rgba(255,255,255,0.1)', color: '#fff' }
  };
  const style = colors[variant] || colors.default;

  return (
    <span 
      className={className} 
      style={{
        background: style.bg,
        color: style.color,
        padding: '0.25rem 0.75rem',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--font-size-xs)',
        fontWeight: 'var(--font-weight-bold)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}
      {...props}
    >
      {children}
    </span>
  );
};
