import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

// TrustNet primary action = verified teal. Destructive = alert rose.
// Radius 4px (rounded), single soft shadow, 44px min touch target.
export const Button = ({
  children,
  variant = 'primary', // primary, secondary, outline, ghost, danger
  size = 'md', // sm, md, lg, icon
  isLoading = false,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  const baseStyles = 'relative inline-flex items-center justify-center font-semibold rounded transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-trust-verified focus-visible:ring-offset-2 focus-visible:ring-offset-trust-paper disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]';

  const variants = {
    primary: 'bg-trust-verified hover:bg-trust-verified/90 active:bg-trust-verified text-white shadow-soft-sm',
    secondary: 'bg-white hover:bg-trust-verified/5 text-trust-verified border border-trust-verified',
    outline: 'border border-trust-slate/30 hover:border-trust-verified bg-white text-trust-ink hover:text-trust-verified',
    ghost: 'text-trust-slate hover:text-trust-verified hover:bg-trust-ink/5',
    danger: 'bg-trust-alert hover:bg-trust-alert/90 text-white shadow-soft-sm',
  };

  const sizes = {
    sm: 'px-3.5 py-2 text-xs gap-1.5 min-h-[36px]',
    md: 'px-4 py-2.5 text-sm gap-2 min-h-[44px]',
    lg: 'px-6 py-3 text-sm gap-2.5 min-h-[48px]',
    icon: 'p-2.5 text-sm aspect-square min-h-[44px] min-w-[44px]',
  };

  return (
    <motion.button
      type={type}
      whileHover={{ scale: disabled || isLoading ? 1 : 1.01 }}
      whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
          <span>Processing...</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
};
