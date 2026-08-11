import React from 'react';
import { ShieldCheck, Clock, AlertCircle, HelpCircle } from 'lucide-react';

export const LedgerStamp = ({ status, timestamp, className = '' }) => {
  // Map conceptual UI status or raw backend status to readable info
  const configMap = {
    not_started: {
      label: 'Not Started',
      machine: 'STATUS_NOT_STARTED',
      icon: HelpCircle,
      textColor: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      borderColor: 'border-slate-200 dark:border-slate-700',
      semantics: 'Identity verification has not been initiated yet.'
    },
    draft: {
      label: 'Draft Saved',
      machine: 'STATUS_DRAFT',
      icon: HelpCircle,
      textColor: 'text-slate-600 dark:text-slate-400',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
      borderColor: 'border-slate-200 dark:border-slate-700',
      semantics: 'Identity verification documents have been uploaded, but not yet submitted for review.'
    },
    pending: {
      label: 'Pending Review',
      machine: 'STATUS_PENDING',
      icon: Clock,
      textColor: 'text-amber-700 dark:text-amber-400',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      borderColor: 'border-amber-200 dark:border-amber-900/30',
      semantics: 'Verification documents submitted and awaiting administrator audit.'
    },
    approved: {
      label: 'Approved & Verified',
      machine: 'STATUS_APPROVED',
      icon: ShieldCheck,
      textColor: 'text-emerald-700 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      borderColor: 'border-emerald-200 dark:border-emerald-900/30',
      semantics: 'Identity verification approved by platform administrators.'
    },
    rejected: {
      label: 'Rejected',
      machine: 'STATUS_REJECTED',
      icon: AlertCircle,
      textColor: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-900/30',
      semantics: 'Identity verification rejected. Document re-upload or modification required.'
    },
    resubmission_requested: {
      label: 'Resubmission Requested',
      machine: 'STATUS_RESUBMISSION_REQUESTED',
      icon: AlertCircle,
      textColor: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-900/30',
      semantics: 'Platform administrator has requested resubmission of corrected verification files.'
    }
  };

  const key = (status || 'draft').toLowerCase();
  const config = configMap[key] || configMap.draft;
  const Icon = config.icon;

  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleString(undefined, { 
        dateStyle: 'medium', 
        timeStyle: 'short' 
      })
    : null;

  return (
    <div 
      className={`flex items-start gap-3 p-4 rounded-2xl border ${config.bgColor} ${config.borderColor} ${className}`}
      role="status"
      aria-label={`Verification status: ${config.label}`}
    >
      <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 ${config.textColor} shadow-soft-sm`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-sm font-black ${config.textColor}`}>
            {config.label}
          </span>
          <span className="text-[10px] font-mono bg-slate-200/50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-semibold">
            {config.machine}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {config.semantics}
        </p>
        {formattedTime && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            Timestamp: {formattedTime}
          </p>
        )}
      </div>
    </div>
  );
};
