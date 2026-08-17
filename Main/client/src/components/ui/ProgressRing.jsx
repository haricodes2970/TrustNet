import React from 'react';

export const ProgressRing = ({ 
  percentage, 
  progress, 
  size, 
  radius: propRadius, 
  strokeWidth, 
  stroke 
}) => {
  const parseNum = (val, fallback) => {
    const num = Number(val);
    return isNaN(num) || num === null || val === undefined ? fallback : num;
  };

  const finalPercentage = parseNum(percentage !== undefined ? percentage : progress, 85);
  const finalStrokeWidth = parseNum(strokeWidth !== undefined ? strokeWidth : stroke, 6);
  const finalSize = parseNum(size !== undefined ? size : (propRadius !== undefined ? propRadius * 2 : undefined), 64);

  let radius = (finalSize - finalStrokeWidth) / 2;
  if (isNaN(radius) || radius <= 0) {
    radius = 29; // Safe default for size = 64, stroke = 6
  }

  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (finalPercentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={finalSize} height={finalSize} className="transform -rotate-90">
        <circle
          cx={finalSize / 2}
          cy={finalSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={finalStrokeWidth}
          fill="transparent"
          className="text-slate-100"
        />
        <circle
          cx={finalSize / 2}
          cy={finalSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={finalStrokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-emerald-500 transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-xs font-bold text-slate-800">
        {finalPercentage}%
      </span>
    </div>
  );
};
