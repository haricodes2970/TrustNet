import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, AlertCircle, RefreshCw, ChevronLeft, 
  ChevronRight, UserMinus, UserCheck, ShieldAlert, Eye, Trash2, Shield 
} from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import StatusBadge from '../components/ui/StatusBadge';
import { fetchDashboardOverview } from '../lib/adminApi';
import { listUsers, suspendUser, reactivateUser, changeUserRole, deleteUser } from '../lib/usersApi';
import './UsersManagement.css';

export default function UsersManagement() {
  // Data loading states
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Summary Metrics states
  const [metrics, setMetrics] = useState({
    total: 0,
    verified: 0,
    pending: 0,
    suspended: 0
  });

  // Query States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('');
  const [selectedActive, setSelectedActive] = useState('');
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10;

  // Modal Dialogue States
  const [activeModal, setActiveModal] = useState(null); // 'suspend', 'reactivate', 'role', 'delete'
  const [targetUser, setTargetUser] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadAllData = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const [overviewData, suspendedData] = await Promise.all([
        fetchDashboardOverview(),
        listUsers({ isActive: false, limit: 1 })
      ]);
      const skip = (currentPage - 1) * limit;
      const params = {
        limit,
        skip,
        search: searchQuery || undefined,
        role: selectedRole || undefined,
        verificationStatus: selectedVerification || undefined,
        isActive: selectedActive || undefined
      };
      const envelope = await listUsers(params);
      
      setMetrics({
        total: overviewData?.totals?.users || 0,
        verified: overviewData?.totals?.verifiedUsers || 0,
        pending: overviewData?.totals?.pendingVerifications || 0,
        suspended: suspendedData?.meta?.total || 0
      });
      setUsers(envelope?.data || []);
      setTotalUsersCount(envelope?.meta?.total || 0);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load user registry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [overviewData, suspendedData] = await Promise.all([
          fetchDashboardOverview(),
          listUsers({ isActive: false, limit: 1 })
        ]);
        const skip = (currentPage - 1) * limit;
        const params = {
          limit,
          skip,
          search: searchQuery || undefined,
          role: selectedRole || undefined,
          verificationStatus: selectedVerification || undefined,
          isActive: selectedActive || undefined
        };
        const envelope = await listUsers(params);

        if (active) {
          setMetrics({
            total: overviewData?.totals?.users || 0,
            verified: overviewData?.totals?.verifiedUsers || 0,
            pending: overviewData?.totals?.pendingVerifications || 0,
            suspended: suspendedData?.meta?.total || 0
          });
          setUsers(envelope?.data || []);
          setTotalUsersCount(envelope?.meta?.total || 0);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to load user registry.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [currentPage, searchQuery, selectedRole, selectedVerification, selectedActive]);

  // Pagination triggers
  const totalPages = Math.ceil(totalUsersCount / limit) || 1;
  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Decisions Modal openers
  const openActionModal = (modalType, userItem) => {
    setTargetUser(userItem);
    setActionReason('');
    setTargetRole(userItem.role || '');
    setActionError('');
    setActiveModal(modalType);
  };

  const closeActionModal = () => {
    if (isActionLoading) return;
    setActiveModal(null);
    setTargetUser(null);
  };

  // Modal Submit Handlers
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!targetUser) return;

    if (activeModal === 'suspend' && !actionReason.trim()) {
      setActionError('A reason explanation is required to suspend accounts.');
      return;
    }

    setIsActionLoading(true);
    setActionError('');
    try {
      if (activeModal === 'suspend') {
        await suspendUser(targetUser._id || targetUser.id, actionReason);
        alert('User account suspended.');
      } else if (activeModal === 'reactivate') {
        await reactivateUser(targetUser._id || targetUser.id);
        alert('User account reactivated.');
      } else if (activeModal === 'role') {
        await changeUserRole(targetUser._id || targetUser.id, targetRole);
        alert('User role updated.');
      } else if (activeModal === 'delete') {
        await deleteUser(targetUser._id || targetUser.id);
        alert('User account soft deleted.');
      }
      closeActionModal();
      loadAllData(false);
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
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tbody>
          {[1, 2, 3, 4, 5].map((idx) => (
            <tr key={idx}>
              <td>
                <div className="skeleton-user-cell">
                  <div className="shimmer skeleton-circle" />
                  <div className="skeleton-user-info">
                    <div className="shimmer skeleton-line-short" />
                    <div className="shimmer skeleton-line-long" />
                  </div>
                </div>
              </td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '60px' }} /></td>
              <td><div className="shimmer skeleton-badge" /></td>
              <td><div className="shimmer skeleton-badge" style={{ width: '70px' }} /></td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '80px' }} /></td>
              <td>
                <div className="skeleton-actions-cell">
                  <div className="shimmer skeleton-btn-icon" />
                  <div className="shimmer skeleton-btn-icon" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      );
    }

    if (users.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="6" className="empty-users-cell">
              <AlertCircle size={28} className="empty-icon" />
              <p>No users found.</p>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {users.map((item) => (
          <tr key={item._id || item.id}>
            <td>
              <div className="user-info-cell">
                <div className="user-avatar-initial">
                  {item.fullName ? item.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-text-details">
                  <span className="user-full-name">{item.fullName}</span>
                  <span className="user-email-label">{item.email}</span>
                </div>
              </div>
            </td>
            <td>
              <span className="user-role-badge">{item.role}</span>
            </td>
            <td>
              <StatusBadge status={item.verificationStatus || 'pending'} />
            </td>
            <td>
              <span className={`status-pill ${item.isActive ? 'active' : 'suspended'}`}>
                {item.isActive ? 'Active' : 'Suspended'}
              </span>
            </td>
            <td>
              <span className="user-joined-date">{formatDate(item.createdAt)}</span>
            </td>
            <td>
              <div className="actions-button-group">
                <Link to={`/admin/users/${item._id || item.id}`} className="action-icon-btn" title="View Profile">
                  <Eye size={15} />
                </Link>
                {item.verificationStatus === 'pending' && (
                  <Link to={`/admin/verification/${item._id || item.id}`} className="action-icon-btn highlight" title="Audit Verification">
                    <Shield size={15} />
                  </Link>
                )}
                <button 
                  className="action-icon-btn" 
                  title="Modify Role"
                  onClick={() => openActionModal('role', item)}
                >
                  <SlidersHorizontal size={14} />
                </button>
                {item.isActive ? (
                  <button 
                    className="action-icon-btn danger" 
                    title="Suspend Account"
                    onClick={() => openActionModal('suspend', item)}
                  >
                    <UserMinus size={15} />
                  </button>
                ) : (
                  <button 
                    className="action-icon-btn success" 
                    title="Reactivate Account"
                    onClick={() => openActionModal('reactivate', item)}
                  >
                    <UserCheck size={15} />
                  </button>
                )}
                <button 
                  className="action-icon-btn danger" 
                  title="Soft Delete Account"
                  onClick={() => openActionModal('delete', item)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  const dashboardRoles = ['founder', 'entrepreneur', 'investor', 'client', 'mentor', 'builder', 'admin'];
  const verificationStatuses = ['pending', 'approved', 'rejected', 'resubmission_requested'];

  return (
    <div className="users-management-wrapper">
      <SectionHeader
        title="User Management"
        subtitle="Manage TrustNet users, roles, verification status and account status."
        actions={
          <button className="btn btn-secondary refresh-btn" onClick={() => loadAllData(true)} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'auth-spinner' : ''} />
            <span>Refresh List</span>
          </button>
        }
      />

      {/* Summary Metrics Cards */}
      <section className="users-summary-grid">
        <div className="metric-box-item">
          <span className="metric-box-caption">Total Users</span>
          <span className="metric-box-value">{isLoading ? '...' : metrics.total.toLocaleString()}</span>
        </div>
        <div className="metric-box-item">
          <span className="metric-box-caption">Verified Users</span>
          <span className="metric-box-value">{isLoading ? '...' : metrics.verified.toLocaleString()}</span>
        </div>
        <div className="metric-box-item">
          <span className="metric-box-caption">Pending Users</span>
          <span className="metric-box-value">{isLoading ? '...' : metrics.pending.toLocaleString()}</span>
        </div>
        <div className="metric-box-item">
          <span className="metric-box-caption">Suspended Users</span>
          <span className="metric-box-value">{isLoading ? '...' : metrics.suspended.toLocaleString()}</span>
        </div>
      </section>

      {/* Error state banner */}
      {errorMsg && (
        <div className="users-error-banner">
          <AlertCircle size={20} />
          <div className="error-banner-content">
            <h4>Unable to load users</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadAllData(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Filters card */}
      <AdminCard className="users-filters-card">
        <div className="users-filters-grid">
          {/* Search box */}
          <div className="search-field-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search users by name, username, or email..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              disabled={isLoading}
            />
          </div>

          {/* Role select */}
          <div className="select-wrapper">
            <label htmlFor="role-filter" className="sr-only">Role</label>
            <select
              id="role-filter"
              value={selectedRole}
              onChange={(e) => { setSelectedRole(e.target.value); setCurrentPage(1); }}
              disabled={isLoading}
            >
              <option value="">All Roles</option>
              {dashboardRoles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>

          {/* Verification select */}
          <div className="select-wrapper">
            <label htmlFor="verification-filter" className="sr-only">Verification</label>
            <select
              id="verification-filter"
              value={selectedVerification}
              onChange={(e) => { setSelectedVerification(e.target.value); setCurrentPage(1); }}
              disabled={isLoading}
            >
              <option value="">All Verifications</option>
              {verificationStatuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Account Status select */}
          <div className="select-wrapper">
            <label htmlFor="status-filter" className="sr-only">Account Status</label>
            <select
              id="status-filter"
              value={selectedActive}
              onChange={(e) => { setSelectedActive(e.target.value); setCurrentPage(1); }}
              disabled={isLoading}
            >
              <option value="">All Account Statuses</option>
              <option value="true">Active Only</option>
              <option value="false">Suspended Only</option>
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Users table card */}
      <AdminCard className="users-table-card">
        <div className="table-responsive">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Verification</th>
                <th>Account Status</th>
                <th>Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            {renderTableContent()}
          </table>
        </div>

        {/* Pagination toolbar */}
        {totalPages > 1 && (
          <div className="pagination-toolbar-panel">
            <button 
              className="btn btn-secondary pagination-btn"
              onClick={handlePrevPage}
              disabled={currentPage === 1 || isLoading}
              aria-label="Previous Page"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span className="pagination-page-indicator">
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalUsersCount} entries)
            </span>
            <button 
              className="btn btn-secondary pagination-btn"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || isLoading}
              aria-label="Next Page"
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </AdminCard>

      {/* Decision Modal dialogues */}
      {activeModal && (
        <div className="action-modal-overlay" onClick={closeActionModal} role="dialog" aria-modal="true">
          <div className="action-modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 className="modal-title-heading">
                {activeModal === 'suspend' && 'Suspend User Account'}
                {activeModal === 'reactivate' && 'Reactivate User Account'}
                {activeModal === 'role' && 'Modify User Role'}
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
                    Are you sure you want to suspend the account of <strong>{targetUser?.fullName}</strong>? 
                    Suspended users will be blocked from accessing their dashboard workspaces.
                  </p>
                  <div className="modal-form-field">
                    <label htmlFor="suspend-reason" className="modal-field-label">
                      Suspension Reason <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id="suspend-reason"
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
                  Are you sure you want to reactivate the account of <strong>{targetUser?.fullName}</strong>? 
                  This restores dashboard access.
                </p>
              )}

              {/* Delete modal */}
              {activeModal === 'delete' && (
                <p className="modal-description-alert">
                  Are you sure you want to soft delete the account of <strong>{targetUser?.fullName}</strong>? 
                  This sets a deleted timestamp and suspends access.
                </p>
              )}

              {/* Role modal */}
              {activeModal === 'role' && (
                <>
                  <p className="modal-description-alert">
                    Modify the roles of <strong>{targetUser?.fullName}</strong>. Select the role below.
                  </p>
                  <div className="modal-form-field">
                    <label htmlFor="role-select" className="modal-field-label">Select User Role</label>
                    <select
                      id="role-select"
                      className="modal-role-select"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      aria-label="User Role select"
                    >
                      {dashboardRoles.map((role) => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                </>
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
                    {activeModal === 'role' && 'Save Role'}
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
