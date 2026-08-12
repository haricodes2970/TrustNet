import React from 'react';
import { Button } from '../ui/Button';

// TrustNet empty state: directs the next action rather than apologising.
// Trust tokens, 8px radius, dashed slate border, verified accent icon.
export const EmptyState = ({
  icon: Icon,
  title = 'Nothing here yet',
  description = 'There is nothing to show for this view yet.',
  actionLabel,
  onAction,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-trust-paper rounded-lg border border-dashed border-trust-slate/30 ${className}`}>
      {Icon && (
        <div className="w-14 h-14 rounded-lg bg-trust-verified/10 text-trust-verified flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="font-display text-base text-trust-ink mb-1">{title}</h3>
      <p className="text-xs text-trust-slate max-w-sm leading-relaxed mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
