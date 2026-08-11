import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { FileText, CheckCircle2, Clock, AlertTriangle, Upload } from 'lucide-react';

export const ChecklistCard = ({ items, onUpload }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-800">Compliance & Document Audit</h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Investor Checklist</span>
      </div>

      <div className="space-y-2.5">
        {items.map((item) => {
          let StatusIcon = AlertTriangle;
          let statusColor = 'text-amber-500';
          let badgeVariant = 'amber';

          if (item.status === 'Verified') {
            StatusIcon = CheckCircle2;
            statusColor = 'text-emerald-500';
            badgeVariant = 'emerald';
          } else if (item.status === 'Pending') {
            StatusIcon = Clock;
            statusColor = 'text-blue-500';
            badgeVariant = 'blue';
          }

          return (
            <div 
              key={item.id} 
              className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl transition-all hover:bg-slate-100/50"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 flex-shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-700 leading-tight">{item.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={badgeVariant} size="sm">
                  <StatusIcon className="w-3.5 h-3.5 mr-1" />
                  {item.status}
                </Badge>
                
                {item.status === 'Missing' && (
                  <button 
                    onClick={() => onUpload(item.id)}
                    className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl transition-all flex items-center justify-center"
                    title="Upload document"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
