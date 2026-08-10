import React from 'react';

export const LedgerStamp = ({ status, date, size = 'md', className = '' }) => {
  if (!status) return null;

  const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }) : '';

  const statusLabels = {
    draft: 'DRAFT',
    active: 'ACTIVE',
    hidden: 'HIDDEN',
    closed: 'CLOSED',
    pending: 'PENDING',
    approved: 'APPROVED',
    rejected: 'REJECTED'
  };

  const label = statusLabels[status.toLowerCase()] || status.toUpperCase();

  const statusColors = {
    draft: 'border-[#C8862B] text-[#C8862B] bg-[#C8862B]/5',
    pending: 'border-[#C8862B] text-[#C8862B] bg-[#C8862B]/5',
    active: 'border-[#0F6E5C] text-[#0F6E5C] bg-[#0F6E5C]/5',
    approved: 'border-[#0F6E5C] text-[#0F6E5C] bg-[#0F6E5C]/5',
    hidden: 'border-[#5B6472] text-[#5B6472] bg-[#5B6472]/5',
    closed: 'border-[#B23A32] text-[#B23A32] bg-[#B23A32]/5',
    rejected: 'border-[#B23A32] text-[#B23A32] bg-[#B23A32]/5'
  };

  const colorClass = statusColors[status.toLowerCase()] || 'border-[#5B6472] text-[#5B6472] bg-[#5B6472]/5';
  const isLg = size === 'lg';

  return (
    <div className={`inline-flex flex-col items-start border-2 px-3 py-1.5 rounded-none uppercase select-none ${colorClass} ${className}`}>
      <span className={`${isLg ? 'text-2xl font-display font-black tracking-wider' : 'text-xs font-mono font-bold tracking-widest'}`}>
        {label}
      </span>
      {formattedDate && (
        <span className="text-[10px] font-mono opacity-80 mt-0.5">
          {formattedDate}
        </span>
      )}
    </div>
  );
};
