import React from 'react';
import { ProgressRing } from '../ui/ProgressRing';

export const ReadinessGauge = ({ score = 0, label = 'Rating', sublabel = 'Overall investment readiness status' }) => {
  let feedbackText = 'Needs Work';
  let color = 'text-amber-500';
  
  if (score >= 85) {
    feedbackText = 'Highly Fundable';
    color = 'text-emerald-500';
  } else if (score >= 70) {
    feedbackText = 'Market Ready';
    color = 'text-emerald-500';
  }

  if (label.toLowerCase().includes('trust')) {
    if (score >= 90) {
      feedbackText = 'High Trust';
      color = 'text-emerald-500';
    } else if (score >= 75) {
      feedbackText = 'Medium Trust';
      color = 'text-emerald-500';
    } else {
      feedbackText = 'Needs Verification';
      color = 'text-amber-500';
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative inline-flex items-center justify-center select-none">
        <ProgressRing
          radius={70}
          stroke={12}
          progress={score}
          strokeColor={color.includes('emerald') ? 'text-emerald-500' : 'text-amber-500'}
          trailColor="text-slate-100"
        />
        <div className="absolute text-center">
          <span className="text-4xl font-black text-slate-900">{score}%</span>
          <span className="text-[10px] font-black text-slate-400 block uppercase tracking-wider mt-0.5">{label}</span>
        </div>
      </div>
      <div className="text-center">
        <h4 className="text-sm font-bold text-slate-800">{feedbackText}</h4>
        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
};
