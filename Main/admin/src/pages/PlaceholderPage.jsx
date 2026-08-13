import { useLocation, Link } from 'react-router-dom';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import './PlaceholderPage.css';

export default function PlaceholderPage() {
  const location = useLocation();

  // Helper to map route pathname to detailed descriptions
  const getPageMeta = (pathname) => {
    switch (pathname) {
      case '/admin/verification':
        return {
          title: 'Verification Center',
          desc: 'Approve startup credentials, user identity status, and verification badges.',
          details: 'Here you will soon see startup business registry documents, ID verification submissions, and active verification lists. Admin actions will allow instant approval, request for more info, or rejection with status logs.'
        };
      case '/admin/users':
        return {
          title: 'Users Management',
          desc: 'Oversee registered accounts, active sessions, and roles hierarchy.',
          details: 'Provides a complete list of accounts (Founders, Investors, Mentors, Professionals). Admin actions will include editing profile settings, managing roles, reset passwords, or suspending accounts.'
        };
      case '/admin/startups':
        return {
          title: 'Startups Ecosystem',
          desc: 'Monitor startup profiles, funding status, and platform visibility.',
          details: 'Track startup profiles, pitch decks, sectors, and active rounds. Allows curation of premium startups to feature on the front page and review credentials for investor access.'
        };
      case '/admin/investors':
        return {
          title: 'Investors Directory',
          desc: 'Review institutional and individual investor accreditation and access.',
          details: 'Verify investor accreditation, track investment sizes, and manage platform permissions. Admin approvals enable direct messaging and startup pitch deck viewing for validated investors.'
        };
      case '/admin/mentors':
        return {
          title: 'Mentors & Professionals',
          desc: 'Review mentorship applications and professional credentials.',
          details: 'Manage professional profiles, review certificates, and monitor mentorship connections. Approvals grant verified badges for mentors in the network.'
        };
      case '/admin/moderation':
        return {
          title: 'Content Moderation',
          desc: 'Scan feed posts, comments, and resource sharing activities.',
          details: 'Review flagged posts and comments. Automated moderation warnings, manual overrides, and text content scans are configured to appear here in Phase 2.'
        };
      case '/admin/reports':
        return {
          title: 'Reports & Safety Queue',
          desc: 'Review platform safety violations, spam alerts, and blocked users.',
          details: 'Security dashboard for unresolved user reports. Admins can view conversation trails, resolve reports, issue warnings, or trigger platform suspensions.'
        };
      case '/admin/analytics':
        return {
          title: 'Analytics & Insights',
          desc: 'Platform growth, engagement patterns, and conversion rates.',
          details: 'Comprehensive charts tracking registrations, daily active users, post counts, connection request volumes, and network densities.'
        };
      case '/admin/notifications':
        return {
          title: 'System Notifications',
          desc: 'Manage global push notices, email newsletters, and admin alerts.',
          details: 'Configure alerts for high-priority incidents, startup reviews, report spikes, and customize emails triggered by platform actions.'
        };
      case '/admin/audit-logs':
        return {
          title: 'Audit Logs',
          desc: 'Complete immutable trace log of administrative activities.',
          details: 'Complete tracking of admin actions (logins, status changes, approvals, suspends) showing timestamp, actor email, action performed, and original state values.'
        };
      case '/admin/settings':
        return {
          title: 'System Settings',
          desc: 'Platform feature toggles, security keys, and API limits.',
          details: 'Configure maintenance modes, maximum posts per user, notification limits, moderator role assignments, and key system parameters.'
        };
      default:
        return {
          title: 'TrustNet Admin Subpage',
          desc: 'Administrative module under construction.',
          details: 'This module is scheduled for implementation in Phase 2. All configurations will align with the TrustNet core services.'
        };
    }
  };

  const meta = getPageMeta(location.pathname);

  return (
    <div className="placeholder-page-container">
      {/* Top Header Section */}
      <SectionHeader 
        title={meta.title} 
        subtitle={meta.desc}
        actions={
          <Link to="/admin" className="btn btn-secondary">
            <ChevronLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        }
      />

      {/* Main content display */}
      <AdminCard title="Module Under Construction" className="placeholder-card">
        <div className="placeholder-card-content">
          <div className="placeholder-icon-wrapper">
            <AlertCircle size={40} className="placeholder-icon" />
          </div>
          
          <h3 className="placeholder-card-heading">Phase 1 Visual Shell</h3>
          <p className="placeholder-card-text">
            You are viewing the <strong>{meta.title}</strong> module.
          </p>
          <p className="placeholder-card-subtext">
            {meta.details}
          </p>

          <div className="placeholder-badge">
            <span>Visual Prototype — API Connection Off</span>
          </div>

          <div className="placeholder-actions">
            <Link to="/admin" className="btn btn-primary">
              <span>Go to Overview Dashboard</span>
            </Link>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
