import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

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
  const baseStyles = 'relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]';

  const variants = {
    primary: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-soft-sm hover:shadow-soft-md active:bg-emerald-700',
    secondary: 'bg-white hover:bg-emerald-50/50 text-emerald-600 border border-emerald-500 shadow-xs',
    outline: 'border border-slate-200 hover:border-emerald-500 bg-white hover:bg-emerald-50/30 text-slate-700 hover:text-emerald-600 shadow-xs',
    ghost: 'text-slate-600 hover:text-emerald-600 hover:bg-slate-100/80',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-xs',
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
