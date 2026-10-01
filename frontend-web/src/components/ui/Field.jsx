import React, { useId } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Label + control + hint/error, wired up with ids for screen readers. */
const FieldShell = ({ id, label, required, hint, error, extra, className = '', children }) => (
  <div className={`field ${className}`}>
    {label && (
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="req" aria-hidden="true">*</span>}
        {extra}
      </label>
    )}
    {children}
    {error ? (
      <span className="field-error" id={`${id}-error`} role="alert">{error}</span>
    ) : hint ? (
      <span className="field-hint" id={`${id}-hint`}>{hint}</span>
    ) : null}
  </div>
);

const describedBy = (id, error, hint) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

export const Input = React.forwardRef(function Input({ id, label, required, hint, error, extra, className = '', fieldClassName = '', ...props }, ref) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error} extra={extra} className={fieldClassName}>
      <input
        ref={ref}
        id={fieldId}
        className={`input ${className}`}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...props}
      />
    </FieldShell>
  );
});

export const Textarea = React.forwardRef(function Textarea({ id, label, required, hint, error, extra, className = '', fieldClassName = '', rows = 5, ...props }, ref) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error} extra={extra} className={fieldClassName}>
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        className={`textarea ${className}`}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...props}
      />
    </FieldShell>
  );
});

/** options: [{ value, label }] or plain strings. */
export const Select = React.forwardRef(function Select({ id, label, required, hint, error, extra, options = [], placeholder, className = '', fieldClassName = '', children, ...props }, ref) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error} extra={extra} className={fieldClassName}>
      <select
        ref={ref}
        id={fieldId}
        className={`select ${className}`}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy(fieldId, error, hint)}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const value = typeof o === 'string' ? o : o.value;
          const text = typeof o === 'string' ? o : o.label;
          return <option key={value} value={value}>{text}</option>;
        })}
        {children}
      </select>
    </FieldShell>
  );
});

/** Password input with a show/hide button inside the field. */
export const PasswordInput = React.forwardRef(function PasswordInput({ id, label, required, hint, error, extra, className = '', fieldClassName = '', ...props }, ref) {
  const autoId = useId();
  const fieldId = id || autoId;
  const [visible, setVisible] = React.useState(false);
  return (
    <FieldShell id={fieldId} label={label} required={required} hint={hint} error={error} extra={extra} className={fieldClassName}>
      <div className="password-wrap">
        <input
          ref={ref}
          id={fieldId}
          type={visible ? 'text' : 'password'}
          className={`input ${className}`}
          required={required}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy(fieldId, error, hint)}
          {...props}
        />
        <button type="button" className="password-toggle" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </FieldShell>
  );
});
