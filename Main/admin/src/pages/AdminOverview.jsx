import { useEffect, useState } from 'react';
import { 
  Users, ShieldCheck, Rocket, FileText, AlertOctagon, Handshake, RefreshCw
} from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import KpiCard from '../components/dashboard/KpiCard';
import PriorityActionCard from '../components/dashboard/PriorityActionCard';
import RecentActivity from '../components/dashboard/RecentActivity';
import PlatformOverview from '../components/dashboard/PlatformOverview';
import { fetchDashboardOverview } from '../lib/adminApi';
import './AdminOverview.css';

export default function AdminOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const response = await fetchDashboardOverview();
      setData(response);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to load dashboard overview data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetchDashboardOverview();
        if (active) {
          setData(response);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Failed to load dashboard overview data.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const totals = data?.totals || {};
  const recentLogs = data?.recentActivity || [];

  const kpis = [
    {
      title: 'Total Users',
      value: isLoading ? null : (totals.users !== undefined ? totals.users.toLocaleString() : '0'),
      trend: isLoading ? null : (totals.verifiedUsers !== undefined ? `${totals.verifiedUsers} verified` : null),
      trendType: 'neutral',
      context: 'in platform database',
      icon: Users,
      isUnavailable: false
    },
    {
      title: 'Pending Verifications',
      value: isLoading ? null : (totals.pendingVerifications !== undefined ? totals.pendingVerifications.toString() : '0'),
      trend: isLoading ? null : (totals.pendingVerifications > 0 ? 'Action required' : 'All clear'),
      trendType: totals.pendingVerifications > 0 ? 'down' : 'up',
      context: 'users awaiting review',
      icon: ShieldCheck,
      isUnavailable: false
    },
    {
      title: 'Active Startups',
      value: isLoading ? null : (totals.startups !== undefined ? totals.startups.toLocaleString() : '0'),
      trend: null,
      trendType: 'neutral',
      context: 'registered startups',
      icon: Rocket,
      isUnavailable: false
    },
    {
      title: 'Collaboration Requests',
      value: 'Unavailable',
      trend: null,
      trendType: 'neutral',
      context: 'Pending backend endpoint',
      icon: Handshake,
      isUnavailable: true
    },
    {
      title: 'Posts Today',
      value: 'Unavailable',
      trend: null,
      trendType: 'neutral',
      context: 'Pending backend endpoint',
      icon: FileText,
      isUnavailable: true
    },
    {
      title: 'Reports',
      value: 'Unavailable',
      trend: null,
      trendType: 'neutral',
      context: 'Pending backend endpoint',
      icon: AlertOctagon,
      isUnavailable: true
    }
  ];

  const priorityActions = [
    {
      id: 'pa-1',
      type: 'verification',
      count: isLoading ? '...' : (totals.pendingVerifications !== undefined ? totals.pendingVerifications : 0),
      title: 'verification requests waiting',
      severity: 'Critical',
      isUnavailable: false
    },
    {
      id: 'pa-2',
      type: 'posts',
      count: 'Unavailable',
      title: 'reported posts in community queue (Pending Backend)',
      severity: 'High',
      isUnavailable: true
    },
    {
      id: 'pa-3',
      type: 'users',
      count: 'Unavailable',
      title: 'reported user profiles flagged for safety (Pending Backend)',
      severity: 'High',
      isUnavailable: true
    },
    {
      id: 'pa-4',
      type: 'verification',
      count: 'Unavailable',
      title: 'pending startup profile reviews (Pending Backend)',
      severity: 'Medium',
      isUnavailable: true
    }
  ];

  const handleReviewAction = (action) => {
    if (action.isUnavailable) {
      alert('This operational module is unavailable because the backend API is pending.');
    } else {
      alert(`Navigating to review screen for: ${action.title}`);
    }
  };

  return (
    <div className="admin-overview-container">
      {/* Page Header */}
      <SectionHeader 
        title="Admin Overview" 
        subtitle="Monitor TrustNet activity, verification, platform safety and ecosystem growth."
        actions={
          <button className="btn btn-secondary refresh-btn" onClick={() => loadData(true)} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'auth-spinner' : ''} />
            <span>Refresh Overview</span>
          </button>
        }
      />

      {/* Error State Banner */}
      {errorMsg && (
        <div className="overview-error-banner">
          <AlertOctagon size={20} />
          <div className="error-banner-content">
            <h4>Failed to Load Data</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadData(true)}>
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <section className="overview-kpi-grid">
        {kpis.map((kpi, index) => {
          if (isLoading) {
            return (
              <div className="kpi-card-skeleton shimmer" key={index}>
                <div className="skeleton-title" />
                <div className="skeleton-value" />
                <div className="skeleton-context" />
              </div>
            );
          }
          return (
            <KpiCard
              key={index}
              title={kpi.title}
              value={kpi.isUnavailable ? 'Unavailable' : kpi.value}
              trend={kpi.isUnavailable ? null : kpi.trend}
              trendType={kpi.trendType}
              context={kpi.context}
              icon={kpi.icon}
            />
          );
        })}
      </section>

      {/* Main Dashboard Two-Column Content */}
      <div className="overview-main-content-layout">
        {/* Left Side: Priority Actions */}
        <section className="priority-actions-section">
          <div className="section-title-bar">
            <h2 className="dashboard-section-title">Priority Actions</h2>
            <span className="priority-badge-count">
              {isLoading ? '...' : priorityActions.filter(a => !a.isUnavailable).length} Active
            </span>
          </div>
          <div className="priority-actions-list">
            {priorityActions.map((action) => (
              <PriorityActionCard
                key={action.id}
                type={action.type}
                count={action.count}
                title={action.title}
                severity={action.severity}
                onReview={() => handleReviewAction(action)}
              />
            ))}
          </div>
        </section>

        {/* Right Side: Recent Activity */}
        <section className="recent-activity-section">
          <RecentActivity activities={recentLogs} isLoading={isLoading} />
        </section>
      </div>

      {/* Bottom Section: Platform Growth Charts */}
      <section className="platform-growth-section">
        <h2 className="dashboard-section-title">Platform Performance & Statistics</h2>
        <PlatformOverview />
      </section>
    </div>
  );
}
