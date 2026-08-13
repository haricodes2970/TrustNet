import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import StatusBadge from '../components/ui/StatusBadge';
import { listVerificationRequests } from '../lib/verificationApi';
import './VerificationCenter.css';

export default function VerificationCenter() {
  const [isLoading, setIsLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Filtering and Searching State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const loadRequests = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const data = await listVerificationRequests();
      setRequests(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load verification requests.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listVerificationRequests();
        if (active) {
          setRequests(data || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to load verification requests.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Filter handlers
  const roles = ['all', 'founder', 'investor', 'mentor', 'client', 'builder', 'entrepreneur'];
  const statuses = ['all', 'pending', 'under review', 'approved', 'rejected', 'resubmission required'];

  // Apply filters client-side
  const filteredRequests = requests.filter((reqItem) => {
    // Search query match (Full Name or Email)
    const matchesSearch = 
      reqItem.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reqItem.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reqItem.username?.toLowerCase().includes(searchQuery.toLowerCase());

    // Role match
    const matchesRole = selectedRole === 'all' || reqItem.role?.toLowerCase() === selectedRole.toLowerCase();

    // Status match (backend only returns 'pending', but client can filter in case of extended lists)
    const statusMap = {
      'pending': 'pending',
      'under review': 'under_review',
      'approved': 'approved',
      'rejected': 'rejected',
      'resubmission required': 'resubmission_requested'
    };
    const targetStatus = statusMap[selectedStatus];
    const matchesStatus = selectedStatus === 'all' || reqItem.verificationStatus === targetStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getProfileCompletion = (item) => {
    if (item.profileCompletion !== undefined) return item.profileCompletion;
    return item.onboardingCompleted ? 100 : 60;
  };

  const formatSubmittedDate = (timeStr) => {
    if (!timeStr) return 'N/A';
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tbody>
          {[1, 2, 3, 4].map((idx) => (
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
              <td><div className="shimmer skeleton-line-short" style={{ width: '80px' }} /></td>
              <td><div className="shimmer skeleton-badge" /></td>
              <td>
                <div className="skeleton-progress">
                  <div className="shimmer skeleton-line-short" style={{ width: '30px' }} />
                  <div className="shimmer skeleton-bar" />
                </div>
              </td>
              <td><div className="shimmer skeleton-btn" /></td>
            </tr>
          ))}
        </tbody>
      );
    }

    if (filteredRequests.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="6" className="empty-queue-cell">
              <AlertCircle size={28} className="empty-icon" />
              <p>No verification requests found.</p>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {filteredRequests.map((item) => {
          const completion = getProfileCompletion(item);
          return (
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
                <span className="role-badge-text">{item.role}</span>
              </td>
              <td>
                <span className="date-submitted-text">
                  {formatSubmittedDate(item.verificationReviewedAt || item.updatedAt || item.createdAt)}
                </span>
              </td>
              <td>
                <StatusBadge status={item.verificationStatus || 'pending'} />
              </td>
              <td>
                <div className="completion-column-wrapper">
                  <span className="completion-percentage">{completion}%</span>
                  <div className="completion-track-bar">
                    <div className="completion-fill-bar" style={{ width: `${completion}%` }} />
                  </div>
                </div>
              </td>
              <td>
                <Link to={`/admin/verification/${item._id || item.id}`} className="btn btn-primary review-action-btn">
                  <span>Review</span>
                  <ChevronRight size={14} />
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    );
  };

  return (
    <div className="verification-center-wrapper">
      <SectionHeader
        title="Verification Center"
        subtitle="Review and manage user verification requests."
        actions={
          <button className="btn btn-secondary refresh-btn" onClick={() => loadRequests(true)} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'auth-spinner' : ''} />
            <span>Refresh Queue</span>
          </button>
        }
      />

      {/* Error state banner */}
      {errorMsg && (
        <div className="queue-error-banner">
          <AlertCircle size={20} />
          <div className="error-banner-content">
            <h4>Unable to load verification requests</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadRequests(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <AdminCard className="filters-toolbar-card">
        <div className="filters-layout-grid">
          {/* Search box */}
          <div className="search-field-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by name, username, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Role filter */}
          <div className="select-filter-group">
            <SlidersHorizontal size={14} className="filter-icon" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              disabled={isLoading}
              aria-label="Filter by User Role"
            >
              <option value="all">All Roles</option>
              {roles.filter(r => r !== 'all').map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Tab buttons */}
        <div className="status-tabs-row">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              className={`status-tab-btn ${selectedStatus === status ? 'active' : ''}`}
              onClick={() => setSelectedStatus(status)}
              disabled={isLoading}
            >
              {status}
            </button>
          ))}
        </div>
      </AdminCard>

      {/* Queue Table */}
      <AdminCard className="queue-table-card">
        <div className="table-responsive">
          <table className="queue-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Submitted</th>
                <th>Verification Status</th>
                <th>Profile Completion</th>
                <th>Action</th>
              </tr>
            </thead>
            {renderTableBody()}
          </table>
        </div>
      </AdminCard>
    </div>
  );
}
