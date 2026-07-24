import React from 'react';
import { Link } from 'react-router-dom';

export const LogoIcon = ({ size = 'md', variant = 'default', className = '' }) => {
  const sizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const strokeColor = variant === 'auth' || variant === 'light' ? '#FFFFFF' : '#10B981';
  const nodeColor = variant === 'auth' || variant === 'light' ? '#FFFFFF' : '#10B981';

  return (
    <div className="relative inline-flex items-center justify-center">
      {(variant === 'auth' || variant === 'light') && (
        <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-md" />
      )}
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${sizes[size]} ${className} flex-shrink-0 relative z-10`}
      >
        {/* Outer Hexagonal Outline */}
        <path
          d="M24 6L40 15V33L24 42L8 33V15L24 6Z"
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 6 Network Nodes */}
        <circle cx="24" cy="6" r="3" fill={nodeColor} />
        <circle cx="40" cy="15" r="3" fill={nodeColor} />
        <circle cx="40" cy="33" r="3" fill={nodeColor} />
        <circle cx="24" cy="42" r="3" fill={nodeColor} />
        <circle cx="8" cy="33" r="3" fill={nodeColor} />
        <circle cx="8" cy="15" r="3" fill={nodeColor} />
        {/* Inner Rising Growth Chart Arrow Line */}
        <path
          d="M14 30L21 21L27 27L34 16"
          stroke="#10B981"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const Logo = ({ size = 'md', variant = 'default', showSubtitle = false, to = '/', className = '' }) => {
  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  const isAuth = variant === 'auth' || variant === 'light';

  return (
    <Link to={to} className={`inline-flex items-center gap-3 group select-none ${className}`}>
      <LogoIcon size={size} variant={variant} className="group-hover:scale-105 transition-transform duration-200" />
      <div className="flex flex-col">
        <span className={`${textSizes[size]} font-black tracking-tight leading-none ${isAuth ? 'text-white' : 'text-slate-900'}`}>
          Trust<span className="text-emerald-500">Net</span>
        </span>
        {showSubtitle && (
          <span className={`text-[10px] font-semibold tracking-wider uppercase mt-0.5 ${isAuth ? 'text-slate-300' : 'text-slate-400'}`}>
            Startup Ecosystem
          </span>
        )}
      </div>
    </Link>
  );
};
