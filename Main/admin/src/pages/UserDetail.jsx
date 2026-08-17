import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Mail, MapPin, Briefcase, UserCheck, 
  UserMinus, Trash2, ShieldAlert, Shield, AlertTriangle, RefreshCw 
} from 'lucide-react';
import AdminCard from '../components/ui/AdminCard';
import StatusBadge from '../components/ui/StatusBadge';
import { getUser, suspendUser, reactivateUser, deleteUser } from '../lib/usersApi';
import './UserDetail.css';

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [userDetail, setUserDetail] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal dialogue States
  const [activeModal, setActiveModal] = useState(null); // 'suspend', 'reactivate', 'delete'
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadUserDetail = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const response = await getUser(id);
      setUserDetail(response);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to retrieve user details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await getUser(id);
        if (active) {
          setUserDetail(response);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to retrieve user details.');
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
      setActionError('A reason explanation is required to suspend accounts.');
      return;
    }

    setIsActionLoading(true);
    setActionError('');
    try {
      if (activeModal === 'suspend') {
        await suspendUser(id, actionReason);
        alert('User account suspended.');
      } else if (activeModal === 'reactivate') {
        await reactivateUser(id);
        alert('User account reactivated.');
      } else if (activeModal === 'delete') {
        await deleteUser(id);
        alert('User account soft deleted.');
        navigate('/admin/users');
        return;
      }
      closeActionModal();
      loadUserDetail(false);
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Formats
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  if (isLoading) {
    return (
      <div className="user-detail-wrapper">
        <div className="back-link-shimmer shimmer" />
        <div className="shimmer skeleton-user-detail-header" />
        <div className="shimmer skeleton-user-detail-card" style={{ height: '300px' }} />
      </div>
    );
  }

  if (errorMsg && !userDetail) {
    return (
      <div className="user-detail-wrapper">
        <Link to="/admin/users" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to User Registry</span>
        </Link>
        <div className="user-detail-error-banner">
          <AlertTriangle size={24} />
          <div className="error-banner-content">
            <h4>Failed to load user profile</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadUserDetail(true)}>
            Retry Load
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-detail-wrapper">
      {/* Back button */}
      <Link to="/admin/users" className="back-link">
        <ArrowLeft size={16} />
        <span>Back to User Registry</span>
      </Link>

      {/* Profile summary header */}
      <div className="user-profile-header-card">
        <div className="user-profile-avatar-wrapper">
          {userDetail?.avatarUrl ? (
            <img src={userDetail.avatarUrl} alt={userDetail.fullName || 'User avatar'} className="profile-img-lg" />
          ) : (
            <span className="profile-init-lg">
              {userDetail?.fullName ? userDetail.fullName.charAt(0).toUpperCase() : 'U'}
            </span>
          )}
        </div>
        <div className="user-profile-text-wrapper">
          <h2 className="user-profile-name">{userDetail?.fullName}</h2>
          <div className="user-profile-username">@{userDetail?.username || 'username'}</div>
          <div className="user-profile-meta-row">
            <span className="meta-icon-item" title="Role">
              <Briefcase size={14} />
              <span>{userDetail?.role}</span>
            </span>
            {userDetail?.location && (
              <span className="meta-icon-item" title="Location">
                <MapPin size={14} />
                <span>{userDetail.location}</span>
              </span>
            )}
            <span className="meta-icon-item" title="Email">
              <Mail size={14} />
              <span>{userDetail?.email}</span>
            </span>
          </div>
        </div>
        <div className="user-status-badges-group">
          <div className="badge-item-column">
            <span className="badge-caption">Verification Status</span>
            <StatusBadge status={userDetail?.verificationStatus || 'pending'} />
          </div>
          <div className="badge-item-column">
            <span className="badge-caption">Account Status</span>
            <span className={`status-pill ${userDetail?.isActive ? 'active' : 'suspended'}`}>
              {userDetail?.isActive ? 'Active' : 'Suspended'}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="user-detail-inline-error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main split details */}
      <div className="user-detail-layout-grid">
        {/* Left Card: Account details */}
        <div className="user-detail-left-column">
          <AdminCard title="Account Details" className="user-info-card-item">
            <div className="user-info-rows-list">
              <div className="info-list-row">
                <span className="info-row-label">Bio</span>
                <span className="info-row-value">{userDetail?.bio || 'No profile bio provided.'}</span>
              </div>
              <div className="info-list-row">
                <span className="info-row-label">Designation</span>
                <span className="info-row-value">{userDetail?.designation || 'No designation stated.'}</span>
              </div>
              <div className="info-list-row">
                <span className="info-row-label">Email Verified</span>
                <span className="info-row-value text-capitalize">
                  {userDetail?.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="info-list-row">
                <span className="info-row-label">Onboarding Completed</span>
                <span className="info-row-value text-capitalize">
                  {userDetail?.onboardingCompleted ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="info-list-row">
                <span className="info-row-label">Joined Date</span>
                <span className="info-row-value">{formatDate(userDetail?.createdAt)}</span>
              </div>
              {userDetail?.suspensionReason && (
                <div className="info-list-row warning-reason-row">
                  <span className="info-row-label">Suspension Reason</span>
                  <span className="info-row-value">{userDetail.suspensionReason}</span>
                </div>
              )}
            </div>
          </AdminCard>
        </div>

        {/* Right Card: Audit Connections & Actions */}
        <div className="user-detail-right-column">
          {/* Verification documents redirect */}
          <AdminCard title="Verification Auditing" className="user-info-card-item">
            <p className="auditing-explanation-text">
              Identity documents, business registries, and credentials for this account are managed 
              in the central Verification Center.
            </p>
            <Link to={`/admin/verification/${id}`} className="btn btn-primary audit-link-btn">
              <Shield size={16} />
              <span>Verify / Audit Documents</span>
            </Link>
          </AdminCard>

          {/* Account modifications panel */}
          <AdminCard title="Administrative Actions" className="user-info-card-item">
            <p className="auditing-explanation-text">
              Manage account availability status. Suspended users are restricted from dashboard access.
            </p>
            <div className="administrative-actions-toolbar">
              {userDetail?.isActive ? (
                <button 
                  className="btn btn-danger action-btn-item"
                  onClick={() => openActionModal('suspend')}
                >
                  <UserMinus size={16} />
                  <span>Suspend Account</span>
                </button>
              ) : (
                <button 
                  className="btn btn-primary action-btn-item success"
                  onClick={() => openActionModal('reactivate')}
                >
                  <UserCheck size={16} />
                  <span>Reactivate Account</span>
                </button>
              )}
              <button 
                className="btn btn-secondary action-btn-item danger"
                onClick={() => openActionModal('delete')}
              >
                <Trash2 size={16} />
                <span>Delete Account</span>
              </button>
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
                {activeModal === 'suspend' && 'Suspend User Account'}
                {activeModal === 'reactivate' && 'Reactivate User Account'}
                {activeModal === 'delete' && 'Soft Delete User Account'}
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
                    Are you sure you want to suspend the account of <strong>{userDetail?.fullName}</strong>? 
                    Suspended users will be blocked from accessing their dashboard workspaces.
                  </p>
                  <div className="modal-form-field">
                    <label htmlFor="suspension-explanation" className="modal-field-label">
                      Suspension Reason <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id="suspension-explanation"
                      className="modal-reason-textarea"
                      placeholder="Specify the reason for account suspension..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                </>
              )}

              {/* Reactivate modal */}
              {activeModal === 'reactivate' && (
                <p className="modal-description-alert">
                  Are you sure you want to reactivate the account of <strong>{userDetail?.fullName}</strong>? 
                  This restores dashboard access.
                </p>
              )}

              {/* Delete modal */}
              {activeModal === 'delete' && (
                <p className="modal-description-alert">
                  Are you sure you want to soft delete the account of <strong>{userDetail?.fullName}</strong>? 
                  This sets a deleted timestamp and suspends access.
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
                  className={`btn ${activeModal === 'suspend' || activeModal === 'delete' ? 'btn-danger' : 'btn-primary'} submit-modal-btn`}
                  disabled={isActionLoading}
                >
                  {isActionLoading && <RefreshCw size={14} className="auth-spinner" />}
                  <span>
                    {activeModal === 'suspend' && 'Suspend User'}
                    {activeModal === 'reactivate' && 'Reactivate User'}
                    {activeModal === 'delete' && 'Soft Delete'}
                  </span>
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
