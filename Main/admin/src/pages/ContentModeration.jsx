import { useEffect, useState, startTransition } from 'react';
import { 
  FileText, Users, Briefcase, EyeOff, CheckCircle2, 
  Trash2, ShieldAlert, AlertTriangle, RefreshCw, Search
} from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import { listPosts, listCommunities, listJobs, moderateContent } from '../lib/moderationApi';
import './ContentModeration.css';

export default function ContentModeration() {
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'communities', 'jobs'
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [activeModal, setActiveModal] = useState(null); // 'hide', 'restore', 'delete'
  const [targetItem, setTargetItem] = useState(null);
  const [actionReason, setActionReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadModerationItems = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      let data = [];
      const query = {
        filter: {
          isHidden: { $in: [true, false] },
          deletedAt: { $in: [null, { $exists: true }] }
        }
      };

      if (activeTab === 'posts') {
        data = await listPosts(query);
      } else if (activeTab === 'communities') {
        data = await listCommunities(query);
      } else if (activeTab === 'jobs') {
        data = await listJobs(query);
      }
      setItems(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to retrieve moderation collection.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let data = [];
        const query = {
          filter: {
            isHidden: { $in: [true, false] },
            deletedAt: { $in: [null, { $exists: true }] }
          }
        };

        if (activeTab === 'posts') {
          data = await listPosts(query);
        } else if (activeTab === 'communities') {
          data = await listCommunities(query);
        } else if (activeTab === 'jobs') {
          data = await listJobs(query);
        }

        if (active) {
          setItems(data || []);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to retrieve moderation collection.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [activeTab]);

  const handleTabChange = (tab) => {
    startTransition(() => {
      setActiveTab(tab);
    });
  };

  const openActionModal = (modalType, item) => {
    setTargetItem(item);
    setActionReason('');
    setActionError('');
    setActiveModal(modalType);
  };

  const closeActionModal = () => {
    if (isActionLoading) return;
    setActiveModal(null);
    setTargetItem(null);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!targetItem) return;

    if ((activeModal === 'hide' || activeModal === 'delete') && !actionReason.trim()) {
      setActionError('A reason explanation is required for auditing safety actions.');
      return;
    }

    setIsActionLoading(true);
    setActionError('');
    try {
      await moderateContent(
        activeTab,
        targetItem._id || targetItem.id,
        activeModal,
        actionReason
      );
      alert(`Content successfully moderated: ${activeModal}`);
      closeActionModal();
      loadModerationItems(false);
    } catch (err) {
      setActionError(err.message || 'Moderation action failed.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const getStatusLabel = (item) => {
    if (item.deletedAt) {
      return <span className="moderation-pill deleted">Soft Deleted</span>;
    }
    if (item.isHidden) {
      return <span className="moderation-pill hidden">Hidden</span>;
    }
    return <span className="moderation-pill active">Visible</span>;
  };

  const getItemTitle = (item) => {
    if (activeTab === 'posts') return item.title || 'Untitled Post';
    return item.name || item.title || 'Unnamed Entity';
  };

  const getItemCreatorLabel = (item) => {
    if (activeTab === 'posts') return `Author: ${item.author}`;
    if (activeTab === 'communities') return `Owner: ${item.owner}`;
    return `Startup: ${item.startup}`;
  };

  const filteredItems = items.filter((item) => {
    const title = getItemTitle(item).toLowerCase();
    const creator = getItemCreatorLabel(item).toLowerCase();
    const desc = (item.description || item.content || '').toLowerCase();
    return title.includes(searchQuery.toLowerCase()) || 
           creator.includes(searchQuery.toLowerCase()) ||
           desc.includes(searchQuery.toLowerCase());
  });

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tbody>
          {[1, 2, 3].map((idx) => (
            <tr key={idx}>
              <td>
                <div className="skeleton-moderation-cell">
                  <div className="shimmer skeleton-icon" />
                  <div className="skeleton-text-rows">
                    <div className="shimmer skeleton-line-short" />
                    <div className="shimmer skeleton-line-long" />
                  </div>
                </div>
              </td>
              <td><div className="shimmer skeleton-badge" /></td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '90px' }} /></td>
              <td>
                <div className="skeleton-actions-row">
                  <div className="shimmer skeleton-btn" />
                  <div className="shimmer skeleton-btn" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      );
    }

    if (filteredItems.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="4" className="empty-moderation-cell">
              <AlertTriangle size={24} className="empty-icon" />
              <p>No content records found matching filters.</p>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {filteredItems.map((item) => (
          <tr key={item._id || item.id}>
            <td>
              <div className="moderation-item-cell">
                <div className="moderation-type-icon-wrapper">
                  {activeTab === 'posts' && <FileText size={15} />}
                  {activeTab === 'communities' && <Users size={15} />}
                  {activeTab === 'jobs' && <Briefcase size={15} />}
                </div>
                <div className="moderation-item-details">
                  <span className="item-primary-title">{getItemTitle(item)}</span>
                  <span className="item-secondary-meta">
                    {getItemCreatorLabel(item)}
                  </span>
                  {item.description || item.content ? (
                    <p className="item-snippet-text">
                      {item.description || item.content}
                    </p>
                  ) : null}
                </div>
              </div>
            </td>
            <td>{getStatusLabel(item)}</td>
            <td>
              <span className="creation-date-label">
                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </td>
            <td>
              <div className="moderation-actions-toolbar">
                {item.isHidden || item.deletedAt ? (
                  <button 
                    className="btn btn-secondary action-btn restore-btn"
                    onClick={() => openActionModal('restore', item)}
                    title="Restore Content"
                  >
                    <CheckCircle2 size={14} />
                    <span>Restore</span>
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn btn-secondary action-btn hide-btn"
                      onClick={() => openActionModal('hide', item)}
                      title="Hide Content"
                    >
                      <EyeOff size={14} />
                      <span>Hide</span>
                    </button>
                    <button 
                      className="btn btn-secondary action-btn delete-btn"
                      onClick={() => openActionModal('delete', item)}
                      title="Soft Delete Content"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div className="content-moderation-container">
      <SectionHeader
        title="Content Moderation"
        subtitle="Audit community feeds, jobs listings, and collaborative groups."
        actions={
          <button className="btn btn-secondary refresh-btn" onClick={() => loadModerationItems(true)} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'auth-spinner' : ''} />
            <span>Refresh Content</span>
          </button>
        }
      />

      {errorMsg && (
        <div className="moderation-error-banner">
          <AlertTriangle size={20} />
          <div className="error-banner-content">
            <h4>Unable to load content list</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadModerationItems(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Navigation tabs */}
      <div className="moderation-tabs-nav">
        <button 
          className={`tab-item-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => handleTabChange('posts')}
          disabled={isLoading}
        >
          <FileText size={16} />
          <span>Feeds Posts</span>
        </button>
        <button 
          className={`tab-item-btn ${activeTab === 'communities' ? 'active' : ''}`}
          onClick={() => handleTabChange('communities')}
          disabled={isLoading}
        >
          <Users size={16} />
          <span>Communities</span>
        </button>
        <button 
          className={`tab-item-btn ${activeTab === 'jobs' ? 'active' : ''}`}
          onClick={() => handleTabChange('jobs')}
          disabled={isLoading}
        >
          <Briefcase size={16} />
          <span>Jobs Board</span>
        </button>
      </div>

      {/* Search Filter Card */}
      <AdminCard className="moderation-filter-card">
        <div className="moderation-search-wrapper">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder={`Filter ${activeTab} by title, creator, or descriptions...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={isLoading}
          />
        </div>
      </AdminCard>

      {/* Main Table Listing */}
      <AdminCard className="moderation-table-card">
        <div className="table-responsive">
          <table className="moderation-table">
            <thead>
              <tr>
                <th>Content Details</th>
                <th>Status</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            {renderTableContent()}
          </table>
        </div>
      </AdminCard>

      {/* Decision Dialog Modal overlay */}
      {activeModal && (
        <div className="action-modal-overlay" onClick={closeActionModal} role="dialog" aria-modal="true">
          <div className="action-modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <h3 className="modal-title-heading">
                {activeModal === 'hide' && 'Hide Content'}
                {activeModal === 'restore' && 'Restore Content'}
                {activeModal === 'delete' && 'Delete Content'}
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

              {activeModal === 'hide' && (
                <>
                  <p className="modal-description-alert">
                    Are you sure you want to hide this content? It will be removed from 
                    public views but preserved in database.
                  </p>
                  <div className="modal-form-field">
                    <label htmlFor="hide-reason" className="modal-field-label">
                      Reason for Hiding <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id="hide-reason"
                      className="modal-reason-textarea"
                      placeholder="Specify the moderation reason..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                </>
              )}

              {activeModal === 'delete' && (
                <>
                  <p className="modal-description-alert">
                    Are you sure you want to soft delete this content? This action updates 
                    the deleted timestamp.
                  </p>
                  <div className="modal-form-field">
                    <label htmlFor="delete-reason" className="modal-field-label">
                      Reason for Deletion <span className="required-marker">*</span>
                    </label>
                    <textarea
                      id="delete-reason"
                      className="modal-reason-textarea"
                      placeholder="Specify the moderation reason..."
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
                  Are you sure you want to restore this content? It will be made visible to 
                  users immediately.
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
                  className={`btn ${activeModal === 'restore' ? 'btn-primary' : 'btn-danger'} submit-modal-btn`}
                  disabled={isActionLoading}
                >
                  {isActionLoading && <RefreshCw size={14} className="auth-spinner" />}
                  <span>
                    {activeModal === 'hide' && 'Hide Content'}
                    {activeModal === 'restore' && 'Restore Content'}
                    {activeModal === 'delete' && 'Delete Content'}
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
