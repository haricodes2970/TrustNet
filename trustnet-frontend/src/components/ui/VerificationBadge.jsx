import React from 'react';
import { Check } from 'lucide-react';

export const VerificationBadge = ({ size = 'md', className = '' }) => {
  const sizeMap = {
    sm: 'w-3.5 h-3.5 p-0.5',
    md: 'w-4 h-4 p-0.5',
    lg: 'w-5 h-5 p-1',
  };

  const iconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      title="Verified TrustNet Member"
      className={`inline-flex items-center justify-center bg-emerald-500 text-white rounded-full shadow-soft-sm ${sizeMap[size]} ${className}`}
    >
      <Check className={`${iconSizes[size]} stroke-[3]`} />
    </span>
  );
};
