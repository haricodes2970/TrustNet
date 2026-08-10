import React from 'react';
import { Clock, ShieldCheck, AlertCircle, FileText } from 'lucide-react';

export const LedgerStamp = ({ label = 'Status', state = 'UNKNOWN', timestamp, className = '' }) => {
  const formattedTime = timestamp
    ? new Date(timestamp).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    : 'NO TIMESTAMP';

  const stateUpper = String(state).toUpperCase();

  // Map state to corresponding icons and color parameters (ensuring status isn't communicated by color alone)
  let Icon = Clock;
  let statusColor = 'text-[#C8862B] border-[#C8862B]/35 bg-[#C8862B]/5'; // Orange / Pending

  if (stateUpper === 'PUBLISHED' || stateUpper === 'ACCEPTED' || stateUpper === 'COMPLETED' || stateUpper === 'IN_PROGRESS') {
    Icon = ShieldCheck;
    statusColor = 'text-[#0F6E5C] border-[#0F6E5C]/35 bg-[#0F6E5C]/5'; // Green / Active
  } else if (stateUpper === 'ARCHIVED' || stateUpper === 'DECLINED' || stateUpper === 'CANCELLED') {
    Icon = AlertCircle;
    statusColor = 'text-[#B23A32] border-[#B23A32]/35 bg-[#B23A32]/5'; // Red / Destructive
  } else if (stateUpper === 'DRAFT' || stateUpper === 'REQUESTED') {
    Icon = FileText;
    statusColor = 'text-[#5B6472] border-[#5B6472]/35 bg-[#5B6472]/5'; // Grey / Secondary
  }

  return (
    <div 
      className={`inline-flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 px-3 py-2 border rounded-[4px] font-mono text-[11px] ${statusColor} ${className}`}
    >
      <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{label}: {stateUpper}</span>
      </div>
      <div className="hidden sm:block text-[#5B6472]/30">|</div>
      <div className="text-[10px] text-[#5B6472] font-medium flex items-center gap-1">
        <Clock className="w-3 h-3 text-[#5B6472]/60 flex-shrink-0" />
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};
