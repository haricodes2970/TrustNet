import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Check, X, RefreshCcw, Download, Calendar, Mail, MapPin, 
  Briefcase, CheckCircle2, HelpCircle, FileText, AlertTriangle 
} from 'lucide-react';
import AdminCard from '../components/ui/AdminCard';
import StatusBadge from '../components/ui/StatusBadge';
import { 
  getVerificationRequest, approveVerification, rejectVerification, requestResubmission 
} from '../lib/verificationApi';
import './VerificationDetail.css';

export default function VerificationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState(''); // 'reject' or 'resubmit'
  const [reasonText, setReasonText] = useState('');
  const [modalError, setModalError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadUserDetail = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const response = await getVerificationRequest(id);
      setUser(response);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to retrieve user verification details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await getVerificationRequest(id);
        if (active) {
          setUser(response);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to retrieve user verification details.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const handleApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve verification for ${user?.fullName || 'this user'}?`)) {
      return;
    }
    setIsActionLoading(true);
    setErrorMsg('');
    try {
      await approveVerification(id);
      alert('Verification request approved successfully.');
      navigate('/admin/verification');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to approve verification.');
      setIsActionLoading(false);
    }
  };

  const openDecisionModal = (actionType) => {
    setModalAction(actionType);
    setReasonText('');
    setModalError('');
    setIsModalOpen(true);
  };

  const closeDecisionModal = () => {
    if (isActionLoading) return;
    setIsModalOpen(false);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!reasonText.trim()) {
      setModalError('A reason explanation is required.');
      return;
    }

    setIsActionLoading(true);
    setModalError('');
    try {
      if (modalAction === 'reject') {
        await rejectVerification(id, reasonText);
        alert('Verification request rejected.');
      } else if (modalAction === 'resubmit') {
        await requestResubmission(id, reasonText);
        alert('Document resubmission request sent.');
      }
      setIsModalOpen(false);
      navigate('/admin/verification');
    } catch (err) {
      setModalError(err.message || 'Failed to submit decision.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Helper formats
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatDocType = (type) => {
    if (!type) return 'Document';
    return type
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="verification-detail-wrapper">
        <div className="back-link-shimmer shimmer" />
        <div className="shimmer skeleton-detail-header" />
        <div className="detail-layout-grid">
          <div className="shimmer skeleton-detail-card" style={{ height: '350px' }} />
          <div className="shimmer skeleton-detail-card" style={{ height: '350px' }} />
        </div>
      </div>
    );
  }

  if (errorMsg && !user) {
    return (
      <div className="verification-detail-wrapper">
        <Link to="/admin/verification" className="back-link">
          <ArrowLeft size={16} />
          <span>Back to Verification Center</span>
        </Link>
        <div className="detail-error-banner">
          <AlertTriangle size={24} />
          <div className="error-banner-content">
            <h4>Failed to load review workspace</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadUserDetail(true)}>
            Retry Load
          </button>
        </div>
      </div>
    );
  }

  const documents = user?.verificationDocuments || [];
  const hasDocs = documents.length > 0;

  // Timeline events calculation
  const timelineEvents = [
    {
      title: 'Account Created',
      description: `Registered on ${formatDate(user?.createdAt)}`,
      isCompleted: !!user?.createdAt,
      date: user?.createdAt
    },
    {
      title: 'Email Verified',
      description: user?.emailVerified ? 'Verification link activated' : 'Awaiting activation link',
      isCompleted: !!user?.emailVerified,
      date: null
    },
    {
      title: 'Onboarding Completed',
      description: user?.onboardingCompleted ? 'Profile onboarding finished' : 'Incomplete setup onboarding',
      isCompleted: !!user?.onboardingCompleted,
      date: null
    },
    {
      title: 'Documents Submitted',
      description: hasDocs ? `${documents.length} files uploaded for audit` : 'No documents submitted',
      isCompleted: hasDocs,
      date: user?.verificationReviewedAt || user?.updatedAt
    },
    {
      title: 'Admin Audit Status',
      description: user?.verificationStatus === 'approved' 
        ? 'Approved by System Admin' 
        : user?.verificationStatus === 'rejected'
        ? 'Rejected by System Admin'
        : user?.verificationStatus === 'resubmission_requested'
        ? 'Resubmission Requested'
        : 'Under review queue',
      isCompleted: user?.verificationStatus !== 'pending',
      date: user?.verificationReviewedAt
    }
  ];

  return (
    <div className="verification-detail-wrapper">
      {/* Back button */}
      <Link to="/admin/verification" className="back-link">
        <ArrowLeft size={16} />
        <span>Back to Verification Center</span>
      </Link>

      {/* Header section */}
      <div className="detail-header-card">
        <div className="user-profile-header-main">
          <div className="user-profile-avatar-large">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName || 'User avatar'} className="profile-image-large" />
            ) : (
              <span className="profile-initial-large">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
          </div>
          <div className="user-profile-header-text">
            <h2 className="user-profile-fullname">{user?.fullName}</h2>
            <div className="user-profile-username-tag">@{user?.username || 'user'}</div>
            <div className="user-profile-meta-row">
              <span className="meta-icon-item" title="Role">
                <Briefcase size={14} />
                <span>{user?.role}</span>
              </span>
              {user?.location && (
                <span className="meta-icon-item" title="Location">
                  <MapPin size={14} />
                  <span>{user.location}</span>
                </span>
              )}
              <span className="meta-icon-item" title="Email">
                <Mail size={14} />
                <span>{user?.email}</span>
              </span>
            </div>
          </div>
        </div>

        <div className="user-status-badges-panel">
          <div className="badge-wrapper-item">
            <span className="badge-label-caption">Verification Status</span>
            <StatusBadge status={user?.verificationStatus || 'pending'} />
          </div>
          <div className="badge-wrapper-item">
            <span className="badge-label-caption">Profile Onboarding</span>
            <span className={`onboarding-status-pill ${user?.onboardingCompleted ? 'completed' : 'pending'}`}>
              {user?.onboardingCompleted ? 'Completed' : 'Pending'}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="detail-inline-error">
          <AlertTriangle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Grid splits */}
      <div className="detail-layout-grid">
        {/* Left column: Audit Documents & Actions */}
        <div className="detail-left-column">
          <AdminCard title="Submitted Audit Documents" className="detail-card-item">
            {!hasDocs ? (
              <div className="empty-documents-alert">
                <FileText size={32} className="empty-doc-icon" />
                <p>No verification documents have been submitted yet.</p>
              </div>
            ) : (
              <div className="documents-cards-list">
                {documents.map((doc, idx) => (
                  <div className="document-audit-card" key={doc._id || idx}>
                    <div className="doc-card-header">
                      <FileText size={20} className="doc-icon-indicator" />
                      <div className="doc-card-title-details">
                        <span className="doc-file-type">{formatDocType(doc.type)}</span>
                        <span className="doc-file-name">{doc.name || 'document_file'}</span>
                      </div>
                      <StatusBadge status={doc.status || 'pending'} />
                    </div>

                    {doc.rejectionReason && (
                      <div className="doc-rejection-reason-block">
                        <strong>Reason:</strong> {doc.rejectionReason}
                      </div>
                    )}

                    <div className="doc-card-footer">
                      <div className="doc-date-submitted">
                        <Calendar size={12} />
                        <span>Submitted {formatDate(user.updatedAt || user.createdAt)}</span>
                      </div>
                      {doc.url ? (
                        <a 
                          href={doc.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-secondary btn-small doc-download-btn"
                          aria-label={`Download ${formatDocType(doc.type)}`}
                        >
                          <Download size={12} />
                          <span>View / Download</span>
                        </a>
                      ) : (
                        <span className="doc-no-link">No download link</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Decision panel */}
          {user?.verificationStatus === 'pending' && (
            <AdminCard title="Verification Audit Decisions" className="detail-card-item decisions-actions-card">
              <p className="decisions-explanation-text">
                Confirm your administrative decision on this profile. Approvals grant instant verification. 
                Rejections and resubmission requests will notify the user with your mandatory reasons.
              </p>
              <div className="decisions-actions-row">
                <button 
                  className="btn btn-primary approve-decision-btn" 
                  onClick={handleApprove}
                  disabled={isActionLoading}
                >
                  <Check size={16} />
                  <span>Approve Profile</span>
                </button>
                <button 
                  className="btn btn-secondary resubmit-decision-btn" 
                  onClick={() => openDecisionModal('resubmit')}
                  disabled={isActionLoading}
                >
                  <RefreshCcw size={16} />
                  <span>Request Resubmission</span>
                </button>
                <button 
                  className="btn btn-danger reject-decision-btn" 
                  onClick={() => openDecisionModal('reject')}
                  disabled={isActionLoading}
                >
                  <X size={16} />
                  <span>Reject Profile</span>
                </button>
              </div>
            </AdminCard>
          )}
        </div>

        {/* Right column: Audit Timeline & User Meta */}
        <div className="detail-right-column">
          <AdminCard title="Ecosystem Audit Timeline" className="detail-card-item">
            <div className="audit-timeline-flow">
              {timelineEvents.map((ev, index) => (
                <div 
                  className={`timeline-step-node ${ev.isCompleted ? 'completed' : 'pending'}`} 
                  key={index}
                >
                  <div className="timeline-node-marker">
                    {ev.isCompleted ? (
                      <CheckCircle2 size={18} className="node-icon-completed" />
                    ) : (
                      <HelpCircle size={18} className="node-icon-pending" />
                    )}
                  </div>
                  <div className="timeline-node-content">
                    <h4 className="node-title-heading">{ev.title}</h4>
                    <p className="node-description-caption">{ev.description}</p>
                    {ev.date && (
                      <span className="node-date-stamp">{formatDate(ev.date)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard title="Additional Context" className="detail-card-item">
            <div className="profile-context-list">
              <div className="context-list-row">
                <span className="context-row-label">Bio</span>
                <span className="context-row-value">{user?.bio || 'No profile bio provided.'}</span>
              </div>
              <div className="context-list-row">
                <span className="context-row-label">Designation</span>
                <span className="context-row-value">{user?.designation || 'No designation stated.'}</span>
              </div>
              <div className="context-list-row">
                <span className="context-row-label">Email Verified</span>
                <span className="context-row-value text-capitalize">
                  {user?.emailVerified ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>

      {/* Decision Modal dialogue */}
      {isModalOpen && (
        <div className="decision-modal-overlay" onClick={closeDecisionModal} role="dialog" aria-modal="true">
          <div className="decision-modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 className="modal-title-heading">
                {modalAction === 'reject' ? 'Reject Verification' : 'Request Document Resubmission'}
              </h3>
              <button className="modal-close-btn" onClick={closeDecisionModal} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="modal-input-form">
              <p className="modal-description-alert">
                {modalAction === 'reject' 
                  ? 'Identify the exact reasons why verification is rejected. This action is critical and will notify the user.'
                  : 'Specify which documents are insufficient or invalid and why. The user will be prompted to re-upload files.'}
              </p>

              {modalError && (
                <div className="modal-error-banner-inline">
                  <AlertTriangle size={16} />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="modal-form-field">
                <label htmlFor="reason-textarea" className="modal-field-label">
                  Explanation / Reason <span className="required-marker">*</span>
                </label>
                <textarea
                  id="reason-textarea"
                  className="modal-reason-textarea"
                  placeholder={modalAction === 'reject' 
                    ? 'State the reason for rejection (e.g. invalid document dates, name mismatches)...'
                    : 'Detail the resubmission requirements (e.g. passport page cropped, scan is blurry)...'}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              <div className="modal-actions-toolbar">
                <button 
                  type="button" 
                  className="btn btn-secondary cancel-modal-btn" 
                  onClick={closeDecisionModal}
                  disabled={isActionLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`btn ${modalAction === 'reject' ? 'btn-danger' : 'btn-primary'} submit-modal-btn`}
                  disabled={isActionLoading}
                >
                  {isActionLoading && <RefreshCcw size={14} className="auth-spinner" />}
                  <span>{modalAction === 'reject' ? 'Confirm Rejection' : 'Send Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
