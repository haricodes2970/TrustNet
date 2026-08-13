import React from 'react';
import { ShieldCheck, Clock, AlertCircle, HelpCircle } from 'lucide-react';

export const LedgerStamp = ({
  status,
  date,
  timestamp,
  size = 'md',
  className = ''
}) => {
  if (!status) return null;

  const statusKey = String(status).toLowerCase();

  const statusConfig = {
    not_started: {
      label: 'NOT STARTED',
      machine: 'STATUS_NOT_STARTED',
      icon: HelpCircle,
      color: 'border-[#5B6472] text-[#5B6472] bg-[#5B6472]/5',
      semantics: 'Verification has not been initiated yet.'
    },
    draft: {
      label: 'DRAFT',
      machine: 'STATUS_DRAFT',
      icon: HelpCircle,
      color: 'border-[#C8862B] text-[#C8862B] bg-[#C8862B]/5',
      semantics: 'Draft has been saved.'
    },
    pending: {
      label: 'PENDING',
      machine: 'STATUS_PENDING',
      icon: Clock,
      color: 'border-[#C8862B] text-[#C8862B] bg-[#C8862B]/5',
      semantics: 'Awaiting review.'
    },
    active: {
      label: 'ACTIVE',
      machine: 'STATUS_ACTIVE',
      icon: ShieldCheck,
      color: 'border-[#0F6E5C] text-[#0F6E5C] bg-[#0F6E5C]/5',
      semantics: 'Currently active.'
    },
    approved: {
      label: 'APPROVED',
      machine: 'STATUS_APPROVED',
      icon: ShieldCheck,
      color: 'border-[#0F6E5C] text-[#0F6E5C] bg-[#0F6E5C]/5',
      semantics: 'Approved and verified.'
    },
    hidden: {
      label: 'HIDDEN',
      machine: 'STATUS_HIDDEN',
      icon: HelpCircle,
      color: 'border-[#5B6472] text-[#5B6472] bg-[#5B6472]/5',
      semantics: 'Currently hidden.'
    },
    closed: {
      label: 'CLOSED',
      machine: 'STATUS_CLOSED',
      icon: AlertCircle,
      color: 'border-[#B23A32] text-[#B23A32] bg-[#B23A32]/5',
      semantics: 'Currently closed.'
    },
    rejected: {
      label: 'REJECTED',
      machine: 'STATUS_REJECTED',
      icon: AlertCircle,
      color: 'border-[#B23A32] text-[#B23A32] bg-[#B23A32]/5',
      semantics: 'Verification was rejected.'
    },
    resubmission_requested: {
      label: 'RESUBMISSION REQUESTED',
      machine: 'STATUS_RESUBMISSION_REQUESTED',
      icon: AlertCircle,
      color: 'border-[#B23A32] text-[#B23A32] bg-[#B23A32]/5',
      semantics: 'Resubmission has been requested.'
    }
  };

  const config = statusConfig[statusKey] || {
    label: statusKey.toUpperCase(),
    machine: `STATUS_${statusKey.toUpperCase()}`,
    icon: HelpCircle,
    color: 'border-[#5B6472] text-[#5B6472] bg-[#5B6472]/5',
    semantics: 'Current status.'
  };

  const Icon = config.icon;

  const displayDate = date || timestamp;

  const formattedDate = displayDate
    ? new Date(displayDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const isLg = size === 'lg';

  return (
    <div
      className={`inline-flex items-start gap-2 border-2 px-3 py-1.5 rounded-none uppercase select-none ${config.color} ${className}`}
      role="status"
      aria-label={`${config.label}${formattedDate ? `, ${formattedDate}` : ''}`}
    >
      <Icon
        className={`${isLg ? 'w-5 h-5' : 'w-3.5 h-3.5'} mt-0.5 shrink-0`}
        aria-hidden="true"
      />

      <div className="flex flex-col">
        <span
          className={
            isLg
              ? 'text-2xl font-display font-black tracking-wider'
              : 'text-xs font-mono font-bold tracking-widest'
          }
        >
          {config.label}
        </span>

        {formattedDate && (
          <span className="text-[10px] font-mono opacity-80 mt-0.5 normal-case">
            {formattedDate}
          </span>
        )}
      </div>
    </div>
  );
};