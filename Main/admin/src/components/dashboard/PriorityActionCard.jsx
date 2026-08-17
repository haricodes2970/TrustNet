import { AlertCircle, ShieldAlert, Users, FileText, ArrowRight } from 'lucide-react';
import './PriorityActionCard.css';

export default function PriorityActionCard({ type, count, title, severity, onReview }) {
  // Determine icon based on action type
  const getIcon = () => {
    switch (type) {
      case 'verification':
        return <ShieldAlert size={20} className="action-icon" />;
      case 'posts':
        return <FileText size={20} className="action-icon" />;
      case 'users':
        return <Users size={20} className="action-icon" />;
      default:
        return <AlertCircle size={20} className="action-icon" />;
    }
  };

  // Determine classes based on severity
  const getSeverityStyle = () => {
    const sev = severity.toLowerCase();
    if (sev === 'critical') {
      return {
        cardClass: 'priority-card-critical',
        badgeText: 'Critical',
        badgeClass: 'severity-badge-critical'
      };
    } else if (sev === 'high') {
      return {
        cardClass: 'priority-card-high',
        badgeText: 'High',
        badgeClass: 'severity-badge-high'
      };
    } else {
      return {
        cardClass: 'priority-card-medium',
        badgeText: 'Medium',
        badgeClass: 'severity-badge-medium'
      };
    }
  };

  const style = getSeverityStyle();

  return (
    <div className={`priority-card ${style.cardClass}`}>
      <div className="priority-card-left">
        <div className="priority-icon-wrapper">
          {getIcon()}
        </div>
        <div className="priority-card-info">
          <div className="priority-card-top-row">
            <span className="priority-count">{count}</span>
            <span className={`severity-badge ${style.badgeClass}`}>{style.badgeText}</span>
          </div>
          <p className="priority-title">{title}</p>
        </div>
      </div>
      <button className="btn btn-primary priority-btn" onClick={onReview}>
        <span>Review</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
