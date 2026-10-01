import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Shows an error message with a "Try again" button. Use it instead of hiding errors.
 */
export const ErrorState = ({ message, onRetry, compact = false }) => (
  <div
    role="alert"
    className={compact ? '' : 'glass-panel'}
    style={{
      padding: compact ? '0.75rem 1rem' : '2rem',
      borderRadius: compact ? '10px' : '20px',
      textAlign: compact ? 'left' : 'center',
      display: 'flex',
      flexDirection: compact ? 'row' : 'column',
      alignItems: 'center',
      gap: compact ? '0.75rem' : '1rem',
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      color: '#ff8787',
      marginBottom: compact ? '1rem' : 0
    }}
  >
    <AlertTriangle size={compact ? 18 : 36} />
    <span style={{ flex: compact ? 1 : undefined }}>{message}</span>
    {onRetry && (
      <button type="button" className="btn btn-outline" onClick={onRetry} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem' }}>
        <RefreshCw size={16} /> Try again
      </button>
    )}
  </div>
);
