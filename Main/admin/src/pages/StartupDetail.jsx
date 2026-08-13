import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Rocket, Globe, Tag, 
  UserCheck, ShieldAlert, AlertTriangle, RefreshCw, Briefcase 
} from 'lucide-react';
import AdminCard from '../components/ui/AdminCard';
import StatusBadge from '../components/ui/StatusBadge';
import { getStartup, suspendStartup, restoreStartup } from '../lib/startupsApi';
import { getUser } from '../lib/usersApi';
import './StartupDetail.css';

export default function StartupDetail() {
  const { id } = useParams();

  const [isLoading, setIsLoading] = useState(true);
  const [startup, setStartup] = useState(null);
  const [founder, setFounder] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal dialogue States
  const [activeModal, setActiveModal] = useState(null); // 'suspend', 'restore'
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadStartupAndFounder = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const startupData = await getStartup(id);
      setStartup(startupData);
      
      if (startupData?.founder) {
        try {
          const founderData = await getUser(startupData.founder);
          setFounder(founderData);
        } catch {
          // Silent fallback if founder details cannot be fetched
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Unable to retrieve startup details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const startupData = await getStartup(id);
        let founderData = null;
        if (startupData?.founder) {
          try {
            founderData = await getUser(startupData.founder);
          } catch {
            // Ignore
          }
        }
        if (active) {
          setStartup(startupData);
          setFounder(founderData);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to retrieve startup details.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const openActionModal = (modalType) => {
    setActionReason('');
    setActionError('');
    setActiveModal(modalType);
  };

  const closeActionModal = () => {
    if (isActionLoading) return;
    setActiveModal(null);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (activeModal === 'suspend' && !actionReason.trim()) {
      setActionError('A reason explanation is required to suspend startup profiles.');
      return;
    }

    setIsActionLoading(true);
    setActionError('');
    try {
      if (activeModal === 'suspend') {
        await suspendStartup(id, actionReason);
        alert('Startup profile suspended.');
      } else if (activeModal === 'restore') {
        await restoreStartup(id);
        alert('Startup profile restored.');
      }
      closeActionModal();
      loadStartupAndFounder(false);
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="startup-detail-wrapper">
        <div className="back-link-shimmer shimmer" />
        <div className="shimmer skeleton-startup-detail-header" />
        <div className="shimmer skeleton-startup-detail-card" style={{ height: '300px' }} />
      </div>
    );
  }

  if (errorMsg && !startup) {
    return (
      <div className="startup-detail-wrapper">
        <Link to="/admin/startups" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Startups Ecosystem</span>
        </Link>
        <div className="startup-detail-error-banner">
          <AlertTriangle size={24} />
          <div className="error-banner-content">
            <h4>Failed to load startup details</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadStartupAndFounder(true)}>
            Retry Load
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="startup-detail-wrapper">
      {/* Back link */}
      <Link to="/admin/startups" className="back-link">
        <ArrowLeft size={16} />
        <span>Back to Startups Ecosystem</span>
      </Link>

      {/* Profile Header */}
      <div className="startup-profile-header-card">
        <div className="startup-profile-logo-wrapper">
          {startup?.logoUrl ? (
            <img src={startup.logoUrl} alt={startup.name || 'Startup logo'} className="profile-logo-img-lg" />
          ) : (
            <span className="profile-logo-init-lg">
              <Rocket size={32} />
            </span>
          )}
        </div>
        <div className="startup-profile-text-wrapper">
          <h2 className="startup-profile-name">{startup?.name}</h2>
          <div className="startup-profile-slug">/{startup?.slug || 'slug'}</div>
          <p className="startup-profile-tagline">{startup?.tagline || 'No tagline provided.'}</p>
          <div className="startup-profile-meta-row">
            <span className="meta-icon-item" title="Category">
              <Tag size={14} />
              <span>{startup?.category}</span>
            </span>
            {startup?.location && (
              <span className="meta-icon-item" title="Location">
                <MapPin size={14} />
                <span>{startup.location}</span>
              </span>
            )}
            {startup?.websiteUrl && (
              <span className="meta-icon-item" title="Website">
                <Globe size={14} />
                <a href={startup.websiteUrl} target="_blank" rel="noopener noreferrer" className="startup-website-link">
                  {startup.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
                </a>
              </span>
            )}
          </div>
        </div>
        <div className="startup-status-badges-group">
          <div className="badge-item-column">
            <span className="badge-caption">Directory Status</span>
            <span className={`status-pill ${startup?.status}`}>
              {startup?.status}
            </span>
          </div>
          <div className="badge-item-column">
            <span className="badge-caption">Availability</span>
            <span className={`suspension-pill ${startup?.isSuspended ? 'suspended' : 'active'}`}>
              {startup?.isSuspended ? 'Suspended' : 'Active'}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="startup-detail-inline-error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid Layout split */}
      <div className="startup-detail-layout-grid">
        {/* Left Column: Startup information */}
        <div className="startup-detail-left-column">
          <AdminCard title="Startup Profile Overview" className="startup-info-card-item">
            <div className="startup-info-rows-list">
              <div className="info-list-row">
                <span className="info-row-label">Description</span>
                <span className="info-row-value description-text">{startup?.description || 'No description provided.'}</span>
              </div>
              <div className="info-list-row">
                <span className="info-row-label">Ecosystem Stage</span>
                <span className="info-row-value text-capitalize">{startup?.stage}</span>
              </div>
              <div className="info-list-row">
                <span className="info-row-label">Registration Date</span>
                <span className="info-row-value">{formatDate(startup?.createdAt)}</span>
              </div>
              {startup?.isSuspended && startup?.suspensionReason && (
                <div className="info-list-row warning-reason-row">
                  <span className="info-row-label">Suspension Reason</span>
                  <span className="info-row-value">{startup.suspensionReason}</span>
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Founder & Actions */}
        <div className="startup-detail-right-column">
          {/* Founder User Profile Card */}
          <AdminCard title="Ecosystem Founder" className="startup-info-card-item">
            {founder ? (
              <div className="founder-profile-quick-view">
                <div className="founder-avatar-initial">
                  {founder.fullName ? founder.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="founder-details-info">
                  <h4 className="founder-name">{founder.fullName}</h4>
                  <span className="founder-email">{founder.email}</span>
                  <div className="founder-badges-row">
                    <StatusBadge status={founder.verificationStatus || 'pending'} />
                    <span className="founder-role-label">{founder.role}</span>
                  </div>
                  <Link to={`/admin/users/${founder._id || founder.id}`} className="btn btn-secondary btn-small view-founder-btn">
                    <span>Inspect Founder Profile</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="founder-missing-view">
                <Briefcase size={24} className="missing-founder-icon" />
                <p>Founder details are unavailable.</p>
                <span className="founder-id-label">Founder ID: {startup?.founder}</span>
              </div>
            )}
          </AdminCard>

          {/* Account modifications panel */}
          <AdminCard title="Administrative Actions" className="startup-info-card-item">
            <p className="auditing-explanation-text">
              Manage startup profile availability. Suspended startup profiles will be hidden from 
              investors and public directories.
            </p>
            <div className="administrative-actions-toolbar">
              {startup?.isSuspended ? (
                <button 
                  className="btn btn-primary action-btn-item success"
                  onClick={() => openActionModal('restore')}
                >
                  <UserCheck size={16} />
                  <span>Restore Profile</span>
                </button>
              ) : (
                <button 
                  className="btn btn-danger action-btn-item"
                  onClick={() => openActionModal('suspend')}
                >
                  <ShieldAlert size={16} />
                  <span>Suspend Profile</span>
                </button>
              )}
            </div>
          </AdminCard>
        </div>
      </div>

      {/* Decision Dialog Modal overlay */}
      {activeModal && (
        <div className="action-modal-overlay" onClick={closeActionModal} role="dialog" aria-modal="true">
          <div className="action-modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 className="modal-title-heading">
                {activeModal === 'suspend' ? 'Suspend Startup Profile' : 'Restore Startup Profile'}
              </h3>
              <button className="modal-close-btn" onClick={closeActionModal} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="modal-input-form">
              {actionError && (
                <div className="modal-error-banner-inline">
                  <ShieldAlert size={16} />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Suspend modal */}
              {activeModal === 'suspend' && (
                <>
                  <p className="modal-description-alert">
                    Are you sure you want to suspend the startup profile of <strong>{startup?.name}</strong>? 
                    Suspended startups will be concealed from the public directory.
                  </p>
                  <div className="modal-form-field">
                    <label htmlFor="suspension-explanation" className="modal-field-label">
                      Suspension Reason <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id="suspension-explanation"
                      className="modal-reason-textarea"
                      placeholder="Specify why this startup profile is being suspended..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                </>
              )}

              {/* Restore modal */}
              {activeModal === 'restore' && (
                <p className="modal-description-alert">
                  Are you sure you want to restore the startup profile of <strong>{startup?.name}</strong>? 
                  This restores visibility in the public ecosystem directory.
                </p>
              )}

              <div className="modal-actions-toolbar">
                <button 
                  type="button" 
                  className="btn btn-secondary cancel-modal-btn" 
                  onClick={closeActionModal}
                  disabled={isActionLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn ${activeModal === 'suspend' ? 'btn-danger' : 'btn-primary'} submit-modal-btn`}
                  disabled={isActionLoading}
                >
                  {isActionLoading && <RefreshCw size={14} className="auth-spinner" />}
                  <span>{activeModal === 'suspend' ? 'Suspend Startup' : 'Restore Startup'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline modal close helper
function X({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  );
}
