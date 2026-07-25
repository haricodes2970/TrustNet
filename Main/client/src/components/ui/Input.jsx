import React from 'react';

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

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-slate-50/80 text-slate-900 placeholder:text-slate-400 text-sm rounded-xl border transition-all duration-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 h-11 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } pr-3.5 ${
            error ? 'border-red-400 focus:ring-red-500/30 focus:border-red-500' : 'border-slate-200'
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs text-red-500 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
};
