import React from 'react';

export const LedgerStamp = ({ label = 'Verification', state = 'Pending', timestamp, className = '' }) => (
  <div className={`ledger-stamp inline-grid gap-1 py-2 text-trust-ink ${className}`} aria-label={`${label}: ${state}${timestamp ? `, ${timestamp}` : ''}`}>
    <span className="font-display text-sm leading-none">{label}</span>
    <span className="font-mono text-[11px] font-semibold uppercase tracking-wide">{state}</span>
    {timestamp && <time className="font-mono text-[10px] text-trust-slate">{timestamp}</time>}
  </div>
);
