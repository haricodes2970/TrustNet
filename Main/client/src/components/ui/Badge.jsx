import React from 'react';

// TrustNet badge: 4px radius, mapped to the token palette. Legacy variant
// names (emerald/blue/indigo/purple/amber/rose) are kept so existing
// callers keep working, but they all resolve to trust tokens now.
export const Badge = ({
  children,
  variant = 'verified',
  size = 'md',
  className = ''
}) => {
  const variants = {
    verified: 'bg-trust-verified/10 text-trust-verified border-trust-verified/20 font-semibold',
    signal: 'bg-trust-signal/10 text-trust-signal border-trust-signal/20 font-semibold',
    alert: 'bg-trust-alert/10 text-trust-alert border-trust-alert/20 font-semibold',
    slate: 'bg-trust-slate/10 text-trust-slate border-trust-slate/20 font-medium',
    // legacy aliases
    emerald: 'bg-trust-verified/10 text-trust-verified border-trust-verified/20 font-semibold',
    blue: 'bg-trust-slate/10 text-trust-ink border-trust-slate/20 font-semibold',
    indigo: 'bg-trust-verified/10 text-trust-verified border-trust-verified/20 font-semibold',
    amber: 'bg-trust-signal/10 text-trust-signal border-trust-signal/20 font-semibold',
    purple: 'bg-trust-verified/10 text-trust-verified border-trust-verified/20 font-semibold',
    rose: 'bg-trust-alert/10 text-trust-alert border-trust-alert/20 font-semibold',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded border ${variants[variant] || variants.verified} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
