import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import AdminCard from '../ui/AdminCard';
import './KpiCard.css';

export default function KpiCard({ icon: Icon, title, value, trend, trendType, context }) {
  const renderTrend = () => {
    if (!trend) return null;
    
    let trendClass = 'kpi-trend ';
    let TrendIcon = Minus;
    
    if (trendType === 'up') {
      trendClass += 'kpi-trend-positive';
      TrendIcon = ArrowUpRight;
    } else if (trendType === 'down') {
      trendClass += 'kpi-trend-negative';
      TrendIcon = ArrowDownRight;
    } else {
      trendClass += 'kpi-trend-neutral';
    }

    return (
      <span className={trendClass}>
        <TrendIcon size={14} />
        <span>{trend}</span>
      </span>
    );
  };

  return (
    <AdminCard className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-title">{title}</span>
        {Icon && (
          <div className="kpi-icon-container">
            <Icon size={18} className="kpi-icon" />
          </div>
        )}
      </div>
      <div className="kpi-card-body-content">
        <h3 className="kpi-value">{value}</h3>
        <div className="kpi-footer">
          {renderTrend()}
          {context && <span className="kpi-context">{context}</span>}
        </div>
      </div>
    </AdminCard>
  );
}
