import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert, Layers, HelpCircle, BarChart3 } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import './PlatformAnalytics.css';

export default function PlatformAnalytics() {
  const missingApis = [
    'GET /api/v1/admin/analytics/users (DAU, WAU, MAU ratios)',
    'GET /api/v1/admin/analytics/funnel (Trust conversion steps)',
    'GET /api/v1/admin/analytics/growth (Startup and investor signups count)'
  ];

  return (
    <div className="analytics-page-container">
      <SectionHeader 
        title="Platform Analytics" 
        subtitle="Monitor user growth ratios, trust conversion funnel metrics, and network engagement."
        actions={
          <Link to="/admin" className="btn btn-secondary back-btn">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        }
      />

      <AdminCard title="Analytics Dashboard Unavailable" className="analytics-alert-card">
        <div className="analytics-alert-content">
          <div className="alert-icon-shell">
            <ShieldAlert size={36} className="alert-icon" />
          </div>

          <h3 className="alert-heading">Analytics Controllers Offline</h3>
          <p className="alert-description">
            The database records are ready to be queried, but the analytical query aggregator 
            controllers have not been deployed to the live system.
          </p>

          <div className="missing-apis-container">
            <span className="container-label">Missing API Endpoints:</span>
            <ul className="apis-list">
              {missingApis.map((api, index) => (
                <li key={index} className="api-list-item">
                  <Layers size={13} className="bullet-icon" />
                  <code>{api}</code>
                </li>
              ))}
            </ul>
          </div>

          <div className="pending-status-badge">
            <BarChart3 size={14} />
            <span>Telemetry Controller Pending</span>
          </div>

          <div className="alert-footer-guidelines">
            <HelpCircle size={14} className="info-guide-icon" />
            <span>Contact your database administrator to configure Mongoose aggregates for telemetry.</span>
          </div>
        </div>
      </AdminCard>

      {/* Visual representation of the disabled metrics grid */}
      <h3 className="grid-preview-heading">Interactive Preview — Analytics Interface</h3>
      <div className="disabled-metrics-grid">
        <div className="disabled-metric-item-card">
          <span className="disabled-metric-label">Daily Active Users (DAU)</span>
          <span className="disabled-metric-value">N/A</span>
          <span className="disabled-metric-badge">Telemetry Pending</span>
        </div>
        <div className="disabled-metric-item-card">
          <span className="disabled-metric-label">New Registrations</span>
          <span className="disabled-metric-value">N/A</span>
          <span className="disabled-metric-badge">Telemetry Pending</span>
        </div>
        <div className="disabled-metric-item-card">
          <span className="disabled-metric-label">OTP Verification Rate</span>
          <span className="disabled-metric-value">N/A</span>
          <span className="disabled-metric-badge">Telemetry Pending</span>
        </div>
        <div className="disabled-metric-item-card">
          <span className="disabled-metric-label">Verification Approval Rate</span>
          <span className="disabled-metric-value">N/A</span>
          <span className="disabled-metric-badge">Telemetry Pending</span>
        </div>
      </div>
    </div>
  );
}
