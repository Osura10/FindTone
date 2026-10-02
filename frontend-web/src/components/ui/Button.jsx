import React from 'react';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  'danger-outline': 'btn-danger-outline'
};
const SIZES = { sm: 'btn-sm', md: '', lg: 'btn-lg' };

/**
 * Button with variants (primary / secondary / ghost / danger), sizes and a loading state.
 * `icon` is a lucide icon component; with `iconOnly` pass an `aria-label`.
 */
export const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, icon: Icon, iconOnly = false, block = false, className = '', children, disabled, type = 'button', ...props },
  ref
) {
  const classes = ['btn', VARIANTS[variant] || '', SIZES[size] || '', iconOnly ? 'btn-icon' : '', block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ');
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  return (
    <button ref={ref} type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading ? <Loader2 size={iconSize} className="animate-spin" aria-hidden="true" /> : Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      {!iconOnly && children}
    </button>
  );
});
