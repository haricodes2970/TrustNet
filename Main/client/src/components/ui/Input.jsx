import React from 'react';

// TrustNet input: paper-white field, slate border, verified focus ring,
// 4px radius, real <label> for accessibility, alert-rose error state.
export const Input = ({
  label,
  icon: Icon,
  error,
  helperText,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  const describedBy = error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-trust-slate uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-trust-slate/70">
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
        )}
        <input
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={`w-full bg-white text-trust-ink placeholder:text-trust-slate/60 text-sm rounded border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-trust-verified/40 focus:border-trust-verified h-11 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 ${
            error ? 'border-trust-alert focus:ring-trust-alert/30 focus:border-trust-alert' : 'border-trust-slate/25'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p id={`${inputId}-error`} className="text-xs text-trust-alert font-medium">{error}</p>
      ) : helperText ? (
        <p id={`${inputId}-help`} className="text-xs text-trust-slate">{helperText}</p>
      ) : null}
    </div>
  );
};
