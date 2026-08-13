import { CheckCircle2, Clock, XCircle, AlertTriangle, AlertOctagon } from 'lucide-react';
import './StatusBadge.css';

export default function StatusBadge({ status }) {
  if (!status) return null;
  
  const normalized = status.toLowerCase().trim();
  
  let className = 'status-badge ';
  let icon;
  let label = status;

  switch (normalized) {
    case 'approved':
    case 'verified':
    case 'resolved':
      className += 'status-approved';
      icon = <CheckCircle2 size={14} />;
      break;
    case 'pending':
    case 'under review':
    case 'under_review':
      className += 'status-pending';
      icon = <Clock size={14} />;
      label = normalized === 'under_review' ? 'Under Review' : label;
      break;
    case 'rejected':
    case 'suspended':
      className += 'status-rejected';
      icon = <XCircle size={14} />;
      break;
    case 'critical':
      className += 'status-critical';
      icon = <AlertOctagon size={14} />;
      break;
    default:
      className += 'status-default';
      icon = <AlertTriangle size={14} />;
  }

  return (
    <span className={className}>
      {icon}
      <span className="status-text">{label}</span>
    </span>
  );
}
