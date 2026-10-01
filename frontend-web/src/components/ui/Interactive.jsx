import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

/**
 * Accessible dialog: Esc and backdrop click close it, focus moves inside and returns on close.
 */
export const Modal = ({ isOpen, onClose, title, children, footer, size = 'md', closeOnBackdrop = true }) => {
  const titleId = useId();
  const dialogRef = useRef(null);
  // Keep the latest onClose in a ref so the effect below runs only when the dialog opens/closes
  // (parents usually pass a new arrow function on every render).
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const previous = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onCloseRef.current?.(); };
    document.addEventListener('keydown', onKey);
    const first = dialogRef.current?.querySelector('input, textarea, select, button:not([data-close])');
    (first || dialogRef.current)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;
  const maxWidth = size === 'lg' ? 720 : size === 'sm' ? 400 : 480;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (closeOnBackdrop && e.target === e.currentTarget) onClose?.(); }}>
      <div ref={dialogRef} className="modal" role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1} style={{ maxWidth }}>
        {title && (
          <div className="modal-header">
            <h2 id={titleId} style={{ fontSize: 'var(--text-lg)' }}>{title}</h2>
            {onClose && (
              <button type="button" data-close className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
                <X size={16} />
              </button>
            )}
          </div>
        )}
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

/**
 * Tabs: [{ id, label, count?, icon? }]. Arrow keys move between tabs (ARIA tablist pattern).
 */
export const Tabs = ({ tabs, value, onChange, ariaLabel }) => {
  const onKeyDown = (e, index) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    e.currentTarget.parentElement?.children[next]?.focus();
  };
  return (
    <div className="tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          className="tab"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {t.icon && <t.icon size={15} aria-hidden="true" />}
          {t.label}
          {t.count != null && <span className="count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
};

/** App-wide toast host styled with the design tokens (use `toast` from react-hot-toast). */
export const AppToaster = () => (
  <Toaster
    position="top-right"
    gutter={10}
    containerStyle={{ top: 76 }}
    toastOptions={{
      duration: 5000,
      style: {
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        borderRadius: '12px',
        fontSize: '0.875rem',
        maxWidth: 420,
        whiteSpace: 'pre-line'
      },
      success: { iconTheme: { primary: 'var(--success)', secondary: 'var(--surface)' } },
      error: { iconTheme: { primary: 'var(--danger)', secondary: 'var(--surface)' } }
    }}
  />
);
