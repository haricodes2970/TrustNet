import AdminCard from '../ui/AdminCard';
import { BarChart3, LineChart, PieChart, Activity } from 'lucide-react';
import './PlatformOverview.css';

export default function PlatformOverview() {
  const charts = [
    { title: 'User Growth', icon: LineChart },
    { title: 'Verification Activity', icon: BarChart3 },
    { title: 'Startup Growth', icon: Activity },
    { title: 'Reports Trend', icon: PieChart },
  ];

  return (
    <div className="platform-overview-grid">
      {charts.map((chart, idx) => (
        <AdminCard key={idx} title={chart.title} className="chart-card">
          <div className="analytics-unavailable-container">
            <chart.icon className="analytics-icon" size={32} />
            <p className="analytics-text">Analytics data is not available yet.</p>
            <span className="analytics-badge">Backend Pending</span>
          </div>
        </AdminCard>
      ))}
    </div>
  );
}
