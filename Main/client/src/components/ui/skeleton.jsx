import React from 'react';

export const Skeleton = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className={`animate-shimmer bg-slate-200/80 rounded-xl ${className}`}
        />
      ))}
    </>
  );
};
