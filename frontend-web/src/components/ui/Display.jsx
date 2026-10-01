import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { verdictInfo } from '../../utils/format';

/** Surface with border + radius. `padded` adds the standard inner spacing. */
export const Card = ({ as: Tag = 'div', padded = true, hover = false, className = '', children, ...props }) => (
  <Tag className={['card', padded ? 'card-pad' : '', hover ? 'card-hover' : '', className].filter(Boolean).join(' ')} {...props}>
    {children}
  </Tag>
);

export const Badge = ({ variant = 'neutral', dot = false, className = '', children, ...props }) => (
  <span className={['badge', `badge-${variant}`, dot ? 'badge-dot' : '', className].filter(Boolean).join(' ')} {...props}>
    {children}
  </span>
);

const STATUS = {
  LIVE: { variant: 'success', label: 'Live' },
  PENDING: { variant: 'warning', label: 'Pending check' },
  FLAGGED: { variant: 'warning', label: 'Under review' },
  REJECTED: { variant: 'danger', label: 'Rejected' },
  SOLD: { variant: 'neutral', label: 'Sold' }
};

/** Listing status pill: LIVE / PENDING / FLAGGED / REJECTED / SOLD. */
export const StatusBadge = ({ status, className = '' }) => {
  const s = STATUS[String(status || '').toUpperCase()] || { variant: 'neutral', label: status || 'Unknown' };
  return <Badge variant={s.variant} dot className={className}>{s.label}</Badge>;
};


/** Fair-price verdict pill (owner/admin views only). */
export const VerdictBadge = ({ verdict }) => {
  const v = verdictInfo(verdict);
  return <Badge variant={v.variant}>{v.label}</Badge>;
};

/** Trust score pill: green 70+, amber 40-69 (live with warning), red below 40. */
export const TrustBadge = ({ score }) => {
  if (score == null) return <Badge variant="neutral">Not checked</Badge>;
  const variant = score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger';
  return <Badge variant={variant}>Trust {score}/100{score >= 40 && score < 70 ? ' · warning' : ''}</Badge>;
};

/** "LKR 45,000" with the currency in a smaller, muted style. */
export const PriceTag = ({ amount, size = 'md', className = '' }) => (
  <span className={`price-tag ${size} ${className}`}>
    <span className="currency">LKR</span>
    {Math.round(Number(amount) || 0).toLocaleString('en-LK')}
  </span>
);

export const Avatar = ({ name = '', src, size = 36, className = '' }) => {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  return (
    <span className={`avatar ${className}`} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden={src ? undefined : 'true'}>
      {src ? <img src={src} alt={name ? `${name} profile` : ''} /> : initials}
    </span>
  );
};

export const Skeleton = ({ width = '100%', height = '16px', radius, borderRadius, className = '', style }) => (
  <div className={`skeleton ${className}`} style={{ width, height, borderRadius: radius ?? borderRadius, ...style }} aria-hidden="true" />
);

export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="empty-state">
    {Icon && <div className="icon"><Icon size={26} aria-hidden="true" /></div>}
    {title && <h3>{title}</h3>}
    {description && <p>{description}</p>}
    {action}
  </div>
);

/** Error message with an optional "Try again" button. `compact` renders an inline alert. */
export const ErrorState = ({ message, onRetry, compact = false }) =>
  compact ? (
    <div className="alert alert-danger" role="alert">
      <AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
      <span className="grow">{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-danger-outline" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  ) : (
    <div className="empty-state" role="alert">
      <div className="icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><AlertTriangle size={26} aria-hidden="true" /></div>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );

export const PageHeader = ({ title, subtitle, actions, icon: Icon }) => (
  <header className="page-header">
    <div className="row" style={{ alignItems: 'center', flexWrap: 'nowrap' }}>
      {Icon && <span className="page-icon"><Icon size={22} aria-hidden="true" /></span>}
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="row">{actions}</div>}
  </header>
);

export const StatCard = ({ label, value, icon: Icon, hint, tone }) => (
  <div className="card stat-card">
    <span className="label">
      {Icon && (
        <span className="icon" style={tone ? { background: `var(--${tone}-soft)`, color: `var(--${tone})` } : undefined}>
          <Icon size={18} aria-hidden="true" />
        </span>
      )}
      {label}
    </span>
    <span className="value">{value}</span>
    {hint && <span className="text-xs muted">{hint}</span>}
  </div>
);
