import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
  className = ''
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-trust-ink/60"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`relative w-full ${maxWidth} bg-trust-paper rounded-lg shadow-soft-sm border border-trust-ink/15 overflow-hidden z-10 my-8 ${className}`}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-trust-ink/10 bg-white">
                <div>
                  <h3 className="font-display text-lg text-trust-ink">{title}</h3>
                  {subtitle && <p className="text-xs text-trust-slate mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded text-trust-slate hover:text-trust-ink hover:bg-trust-verified/5 transition-colors focus-ring"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content Body */}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
