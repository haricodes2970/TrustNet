import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import './SystemSettings.css';

export default function SystemSettings() {
  return (
    <div className="settings-page-container">
      <SectionHeader 
        title="System Settings" 
        subtitle="Manage global configuration parameters, verification rules, and automated thresholds."
        actions={
          <Link to="/admin" className="btn btn-secondary back-btn">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
        }
      />

      {/* Lock banner */}
      <div className="settings-lock-banner">
        <ShieldAlert size={20} className="lock-icon" />
        <div className="lock-banner-content">
          <h4>Read-Only System Settings</h4>
          <p>
            Configurations below are loaded from system defaults. Adjustments are locked because 
            the platform management APIs are currently pending backend deployment.
          </p>
        </div>
      </div>

      <div className="settings-layout-grid">
        {/* Left column */}
        <div className="settings-left-column">
          {/* Platform Settings */}
          <AdminCard title="Platform Customization" className="settings-card-item">
            <div className="settings-inputs-list">
              <div className="settings-form-row">
                <label className="settings-label">Platform Name</label>
                <input type="text" className="settings-input-readOnly" value="TrustNet Network" readOnly />
              </div>
              <div className="settings-form-row">
                <label className="settings-label">Support Email Address</label>
                <input type="email" className="settings-input-readOnly" value="support@trustnet.com" readOnly />
              </div>
              <div className="settings-form-row check-row">
                <input type="checkbox" id="allow-reg" checked readOnly className="settings-checkbox" />
                <label htmlFor="allow-reg" className="settings-checkbox-label">Allow New Registrations</label>
              </div>
              <div className="settings-form-row check-row">
                <input type="checkbox" id="require-otp" checked readOnly className="settings-checkbox" />
                <label htmlFor="require-otp" className="settings-checkbox-label">Force Email OTP Verification</label>
              </div>
            </div>
          </AdminCard>

          {/* Verification requirements */}
          <AdminCard title="Verification Auditing Rules" className="settings-card-item">
            <div className="settings-inputs-list">
              <div className="settings-form-row">
                <label className="settings-label">Allowed Identity Document Types</label>
                <input type="text" className="settings-input-readOnly" value="Passport, National ID, Driving License" readOnly />
              </div>
              <div className="settings-form-row">
                <label className="settings-label">Allowed Startup Registry Types</label>
                <input type="text" className="settings-input-readOnly" value="Certificate of Incorporation, Tax Filing" readOnly />
              </div>
              <div className="settings-form-row">
                <label className="settings-label">Maximum Upload Size Limit (MB)</label>
                <input type="text" className="settings-input-readOnly" value="10 MB per file" readOnly />
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Right column */}
        <div className="settings-right-column">
          {/* Moderation settings */}
          <AdminCard title="Automated Moderation" className="settings-card-item">
            <div className="settings-inputs-list">
              <div className="settings-form-row">
                <label className="settings-label">Report Severity Auto-Flag Threshold</label>
                <input type="number" className="settings-input-readOnly" value="5" readOnly />
                <span className="field-explanation">Flags posts/comments automatically after 5 user reports.</span>
              </div>
              <div className="settings-form-row">
                <label className="settings-label">Auto-Suspend User Account Threshold</label>
                <input type="number" className="settings-input-readOnly" value="3" readOnly />
                <span className="field-explanation">Suspends account access after 3 confirmed content violations.</span>
              </div>
            </div>
          </AdminCard>

          {/* Notification settings */}
          <AdminCard title="Email & Broadcast Alerts" className="settings-card-item">
            <div className="settings-inputs-list">
              <div className="settings-form-row check-row">
                <input type="checkbox" id="alert-on-verification" checked readOnly className="settings-checkbox" />
                <label htmlFor="alert-on-verification" className="settings-checkbox-label">Notify admin on new verification request</label>
              </div>
              <div className="settings-form-row check-row">
                <input type="checkbox" id="alert-on-reports" checked readOnly className="settings-checkbox" />
                <label htmlFor="alert-on-reports" className="settings-checkbox-label">Email notification on Critical severity reports</label>
              </div>
              <div className="settings-form-row check-row">
                <input type="checkbox" id="notify-user-actions" checked readOnly className="settings-checkbox" />
                <label htmlFor="notify-user-actions" className="settings-checkbox-label">Notify users when accounts are moderated</label>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
