import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, SlidersHorizontal, AlertCircle, RefreshCw, 
  Rocket, Tag, UserCheck, ShieldAlert, ArrowUpRight 
} from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import { listStartups, suspendStartup, restoreStartup } from '../lib/startupsApi';
import './StartupsManagement.css';

export default function StartupsManagement() {
  const [isLoading, setIsLoading] = useState(true);
  const [startups, setStartups] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSuspension, setSelectedSuspension] = useState('all');

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'suspend', 'restore'
  const [targetStartup, setTargetStartup] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadStartups = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const data = await listStartups({
        filter: {
          isPublic: { $in: [true, false] },
          status: { $in: ['draft', 'active', 'hidden', 'closed'] },
          isSuspended: { $in: [true, false] },
          deletedAt: null
        }
      });
      setStartups(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load startup ecosystem.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await listStartups({
          filter: {
            isPublic: { $in: [true, false] },
            status: { $in: ['draft', 'active', 'hidden', 'closed'] },
            isSuspended: { $in: [true, false] },
            deletedAt: null
          }
        });
        if (active) {
          setStartups(data || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to load startup ecosystem.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const openActionModal = (modalType, startupItem) => {
    setTargetStartup(startupItem);
    setActionReason('');
    setActionError('');
    setActiveModal(modalType);
  };

  const closeActionModal = () => {
    if (isActionLoading) return;
    setActiveModal(null);
    setTargetStartup(null);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!targetStartup) return;

    if (activeModal === 'suspend' && !actionReason.trim()) {
      setActionError('A reason explanation is required to suspend startup profiles.');
      return;
    }

    setIsActionLoading(true);
    setActionError('');
    try {
      if (activeModal === 'suspend') {
        await suspendStartup(targetStartup._id || targetStartup.id, actionReason);
        alert('Startup profile suspended.');
      } else if (activeModal === 'restore') {
        await restoreStartup(targetStartup._id || targetStartup.id);
        alert('Startup profile restored.');
      }
      closeActionModal();
      loadStartups(false);
    } catch (err) {
      setActionError(err.message || 'Action failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Client-side filtration
  const stages = ['all', 'idea', 'validation', 'early-stage', 'growth', 'established'];
  const statuses = ['all', 'draft', 'active', 'hidden', 'closed'];

  const filteredStartups = startups.filter((item) => {
    const matchesSearch = 
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStage = selectedStage === 'all' || item.stage === selectedStage;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    
    let matchesSuspension = true;
    if (selectedSuspension === 'active') {
      matchesSuspension = !item.isSuspended;
    } else if (selectedSuspension === 'suspended') {
      matchesSuspension = item.isSuspended;
    }

    return matchesSearch && matchesStage && matchesStatus && matchesSuspension;
  });

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tbody>
          {[1, 2, 3, 4].map((idx) => (
            <tr key={idx}>
              <td>
                <div className="skeleton-startup-cell">
                  <div className="shimmer skeleton-logo" />
                  <div className="skeleton-startup-text">
                    <div className="shimmer skeleton-line-short" />
                    <div className="shimmer skeleton-line-long" />
                  </div>
                </div>
              </td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '80px' }} /></td>
              <td><div className="shimmer skeleton-badge" /></td>
              <td><div className="shimmer skeleton-badge" style={{ width: '70px' }} /></td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '90px' }} /></td>
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

    if (filteredStartups.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="6" className="empty-startups-cell">
              <AlertCircle size={28} className="empty-icon" />
              <p>No startups found.</p>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {filteredStartups.map((item) => (
          <tr key={item._id || item.id}>
            <td>
              <div className="startup-cell-info">
                <div className="startup-avatar-icon">
                  <Rocket size={16} />
                </div>
                <div className="startup-text-info">
                  <span className="startup-title-name">{item.name}</span>
                  <span className="startup-slug-tag">/{item.slug}</span>
                </div>
              </div>
            </td>
            <td>
              <span className="category-text-label">{item.category}</span>
            </td>
            <td>
              <span className="stage-badge-label">{item.stage}</span>
            </td>
            <td>
              <span className={`status-pill ${item.status}`}>
                {item.status}
              </span>
            </td>
            <td>
              <span className={`suspension-pill ${item.isSuspended ? 'suspended' : 'active'}`}>
                {item.isSuspended ? 'Suspended' : 'Active'}
              </span>
            </td>
            <td>
              <div className="actions-toolbar-cell">
                <Link to={`/admin/startups/${item._id || item.id}`} className="action-btn-item" title="View Detail">
                  <ArrowUpRight size={15} />
                </Link>
                {item.isSuspended ? (
                  <button 
                    className="action-btn-item success" 
                    title="Restore Visibility"
                    onClick={() => openActionModal('restore', item)}
                  >
                    <UserCheck size={14} />
                  </button>
                ) : (
                  <button 
                    className="action-btn-item danger" 
                    title="Suspend Profile"
                    onClick={() => openActionModal('suspend', item)}
                  >
                    <ShieldAlert size={14} />
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div className="startups-management-container">
      <SectionHeader
        title="Startups Ecosystem"
        subtitle="Monitor startup profiles, funding status, and platform visibility."
        actions={
          <button className="btn btn-secondary refresh-btn" onClick={() => loadStartups(true)} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'auth-spinner' : ''} />
            <span>Refresh Ecosystem</span>
          </button>
        }
      />

      {/* Error State Banner */}
      {errorMsg && (
        <div className="startups-error-banner">
          <AlertCircle size={20} />
          <div className="error-banner-content">
            <h4>Unable to load startups</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadStartups(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <AdminCard className="startups-filters-card">
        <div className="startups-filters-grid">
          {/* Search box */}
          <div className="search-field-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search startups by name, slug, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Stage select */}
          <div className="select-filter-group">
            <SlidersHorizontal size={14} className="filter-icon" />
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              disabled={isLoading}
              aria-label="Filter by Stage"
            >
              <option value="all">All Stages</option>
              {stages.filter(s => s !== 'all').map((stage) => (
                <option key={stage} value={stage}>{stage}</option>
              ))}
            </select>
          </div>

          {/* Status select */}
          <div className="select-filter-group">
            <Tag size={14} className="filter-icon" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              disabled={isLoading}
              aria-label="Filter by Status"
            >
              <option value="all">All Statuses</option>
              {statuses.filter(s => s !== 'all').map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          {/* Suspension select */}
          <div className="select-filter-group">
            <ShieldAlert size={14} className="filter-icon" />
            <select
              value={selectedSuspension}
              onChange={(e) => setSelectedSuspension(e.target.value)}
              disabled={isLoading}
              aria-label="Filter by Suspension Status"
            >
              <option value="all">All Availability</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>
      </AdminCard>

      {/* Table grid */}
      <AdminCard className="startups-table-card">
        <div className="table-responsive">
          <table className="startups-table">
            <thead>
              <tr>
                <th>Startup</th>
                <th>Category</th>
                <th>Stage</th>
                <th>Status</th>
                <th>Availability</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            {renderTableContent()}
          </table>
        </div>
      </AdminCard>

      {/* Action Modals */}
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

              {activeModal === 'suspend' && (
                <>
                  <p className="modal-description-alert">
                    Are you sure you want to suspend the startup profile of <strong>{targetStartup?.name}</strong>? 
                    Suspended startups will be concealed from the public directory.
                  </p>
                  <div className="modal-form-field">
                    <label htmlFor="suspend-reason" className="modal-field-label">
                      Suspension Reason <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id="suspend-reason"
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

              {activeModal === 'restore' && (
                <p className="modal-description-alert">
                  Are you sure you want to restore the startup profile of <strong>{targetStartup?.name}</strong>? 
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
