import { useLocation, Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Layers, UserX, HelpCircle } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import './EcosystemUnavailablePage.css';

export default function EcosystemUnavailablePage() {
  const location = useLocation();

  const getPageMeta = (pathname) => {
    if (pathname.includes('/investors')) {
      return {
        title: 'Investors Directory',
        subtitle: 'Review institutional and individual investor credentials.',
        entity: 'Investor Profiles',
        missingApis: [
          'GET /api/v1/admin/investors (Query database collection)',
          'GET /api/v1/admin/investors/:id (Individual accreditation detail)',
          'POST /api/v1/admin/investors/:id/moderate (Accreditation toggles)'
        ]
      };
    } else if (pathname.includes('/mentors')) {
      return {
        title: 'Mentors & Professionals',
        subtitle: 'Review professional network profiles and availability status.',
        entity: 'Mentor Directory',
        missingApis: [
          'GET /api/v1/admin/mentors (Query domain professionals)',
          'GET /api/v1/admin/mentors/:id (View qualification details)',
          'POST /api/v1/admin/mentors/:id/verify (Verify experience claims)'
        ]
      };
    } else if (pathname.includes('/reports')) {
      return {
        title: 'Reports & Safety Center',
        subtitle: 'Manage safety issues, violations reports, and flagged content.',
        entity: 'Safety Center Queue',
        missingApis: [
          'GET /api/v1/admin/reports (List safety filings)',
          'GET /api/v1/admin/reports/:id (Review evidence trails)',
          'POST /api/v1/admin/reports/:id/resolve (Perform resolution actions)'
        ]
      };
    } else if (pathname.includes('/notifications')) {
      return {
        title: 'System Notifications Center',
        subtitle: 'Manage system announcements, notifications, and scheduled dispatches.',
        entity: 'Administrative Broadcasts',
        missingApis: [
          'GET /api/v1/admin/notifications (List announcements history)',
          'POST /api/v1/admin/notifications (Send manual system notices)'
        ]
      };
    }
    return {
      title: 'Ecosystem Subpage Unavailable',
      subtitle: 'This administrative workspace is pending backend API support.',
      entity: 'Module',
      missingApis: ['Backend routing & controller configuration']
    };
  };

  const meta = getPageMeta(location.pathname);

  return (
    <div className="unavailable-page-container">
      <SectionHeader 
        title={meta.title} 
        subtitle={meta.subtitle}
        actions={
          <Link to="/admin" className="back-link-btn btn btn-secondary">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        }
      />

      <AdminCard title="Database Ready — API Connection Pending" className="unavailable-card-item">
        <div className="unavailable-content-block">
          <div className="unavailable-icon-shell">
            <ShieldAlert size={36} className="alert-icon" />
          </div>

          <h3 className="unavailable-heading">Backend Interface Offline</h3>
          <p className="unavailable-description">
            The TrustNet database schemas and models for <strong>{meta.entity}</strong> are ready. 
            However, the administrative control plane endpoints have not been deployed to the live system.
          </p>

          <div className="missing-apis-container">
            <span className="container-label">Missing API Endpoints:</span>
            <ul className="apis-list">
              {meta.missingApis.map((api, index) => (
                <li key={index} className="api-list-item">
                  <Layers size={13} className="bullet-icon" />
                  <code>{api}</code>
                </li>
              ))}
            </ul>
          </div>

          <div className="pending-status-badge">
            <UserX size={14} />
            <span>Operational Endpoint Pending Deployment</span>
          </div>

          <div className="unavailable-footer-guidelines">
            <HelpCircle size={14} className="info-guide-icon" />
            <span>Contact system administrators to deploy the corresponding controllers to the backend router.</span>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
