import React from 'react';

export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  onClick
}) => {
  const base = 'rounded-2xl border border-slate-200/80 bg-white transition-all duration-250 ease-out overflow-hidden shadow-soft-sm';
  const hover = hoverEffect
    ? 'hover:shadow-soft-md hover:border-emerald-200 hover:scale-[1.01] cursor-pointer'
    : '';

  return (
    <div
      onClick={onClick}
      className={`${base} ${hover} ${className}`}
    >
      {children}
    </div>
  );
};
