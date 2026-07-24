import React from 'react';
import { VerificationBadge } from './VerificationBadge';

export const Avatar = ({
  src,
  alt = 'User Avatar',
  size = 'md', // sm, md, lg, xl, 2xl
  isOnline = false,
  isVerified = false,
  role = null,
  className = ''
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-lg',
    '2xl': 'w-28 h-28 text-2xl',
  };

  const getInitials = (name) => {
    if (!name) return 'TN';
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : parts[0][0];
  };

  return (
    <div className={`relative inline-block flex-shrink-0 ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`${sizes[size]} rounded-full object-cover ring-2 ring-white/80 shadow-sm`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center ring-2 ring-white/80 shadow-sm`}>
          {getInitials(alt)}
        </div>
      )}

      {isOnline && (
        <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
      )}

      {isVerified && (
        <div className="absolute -top-1 -right-1">
          <VerificationBadge size={size === 'xl' || size === '2xl' ? 'lg' : 'sm'} />
        </div>
      )}
    </div>
  );
};
