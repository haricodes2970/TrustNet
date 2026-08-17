import React from 'react';

export const Select = ({ label, id, error, children, className = '', ...props }) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return <label className="grid gap-1.5 text-sm text-trust-ink" htmlFor={selectId}>
    {label && <span className="font-semibold">{label}</span>}
    <select id={selectId} className={`h-11 rounded border border-slate-300 bg-white px-3 text-sm focus-ring ${error ? 'border-trust-alert' : ''} ${className}`} {...props}>{children}</select>
    {error && <span className="text-xs text-trust-alert">{error}</span>}
  </label>;
};
