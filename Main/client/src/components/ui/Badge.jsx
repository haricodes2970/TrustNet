import React from 'react';

export const Badge = ({
  children,
  variant = 'emerald', // emerald, slate, amber, rose
  size = 'md',
  className = ''
}) => {
  const variants = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 font-medium',
    blue: 'bg-slate-100 text-slate-800 border-slate-200 font-semibold',
    indigo: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold',
    amber: 'bg-amber-50 text-amber-700 border-amber-200/80 font-semibold',
    purple: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 font-semibold',
    rose: 'bg-red-50 text-red-700 border-red-200/80 font-semibold',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full border ${variants[variant] || variants.emerald} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
};
