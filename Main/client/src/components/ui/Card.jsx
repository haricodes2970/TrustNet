import React from 'react';

// TrustNet card: 8px radius, thin ink border, paper-white surface,
// single soft elevation. No glassmorphism / backdrop blur.
export const Card = ({
  children,
  className = '',
  hoverEffect = false,
  onClick
}) => {
  const base = 'rounded-lg border border-trust-ink/10 bg-white transition-colors duration-200 overflow-hidden shadow-soft-sm';
  const hover = hoverEffect
    ? 'hover:border-trust-verified/40 cursor-pointer'
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
