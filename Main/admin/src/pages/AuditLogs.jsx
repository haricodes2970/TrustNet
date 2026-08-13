import { useEffect, useState } from 'react';
import { 
  Search, SlidersHorizontal, AlertCircle, RefreshCw, ChevronLeft, 
  ChevronRight, Terminal, Activity, Globe 
} from 'lucide-react';
import SectionHeader from '../components/ui/SectionHeader';
import AdminCard from '../components/ui/AdminCard';
import { listAuditLogs } from '../lib/auditApi';
import './AuditLogs.css';

export default function AuditLogs() {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 20;

  // Filter states
  const [searchAction, setSearchAction] = useState('');
  const [selectedTargetType, setSelectedTargetType] = useState('');

  const loadAuditLogs = async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    }
    setErrorMsg('');
    try {
      const skip = (currentPage - 1) * limit;
      const query = {
        limit,
        skip,
        action: searchAction || undefined,
        targetType: selectedTargetType || undefined
      };

      const envelope = await listAuditLogs(query);
      setLogs(envelope?.data || []);
      setTotalCount(envelope?.meta?.total || 0);
    } catch (err) {
      setErrorMsg(err.message || 'Unable to load system audit logs.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const skip = (currentPage - 1) * limit;
        const query = {
          limit,
          skip,
          action: searchAction || undefined,
          targetType: selectedTargetType || undefined
        };
        const envelope = await listAuditLogs(query);
        if (active) {
          setLogs(envelope?.data || []);
          setTotalCount(envelope?.meta?.total || 0);
          setIsLoading(false);
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err.message || 'Unable to load system audit logs.');
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [currentPage, searchAction, selectedTargetType]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    const totalPages = Math.ceil(totalCount / limit) || 1;
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const getTargetTypeBadgeClass = (targetType) => {
    switch (targetType?.toLowerCase()) {
      case 'user':
        return 'badge-user';
      case 'startup':
        return 'badge-startup';
      case 'verification':
        return 'badge-verification';
      default:
        return 'badge-default';
    }
  };

  const formatDetails = (details) => {
    if (!details) return null;
    try {
      if (typeof details === 'string') return details;
      const keys = Object.keys(details);
      if (keys.length === 0) return null;
      return (
        <div className="log-details-block">
          {keys.map((k) => (
            <div key={k} className="details-row">
              <span className="details-key">{k}:</span>
              <span className="details-val">{JSON.stringify(details[k])}</span>
            </div>
          ))}
        </div>
      );
    } catch {
      return null;
    }
  };

  const totalPages = Math.ceil(totalCount / limit) || 1;

  const renderTableContent = () => {
    if (isLoading) {
      return (
        <tbody>
          {[1, 2, 3, 4].map((idx) => (
            <tr key={idx}>
              <td>
                <div className="skeleton-actor-cell">
                  <div className="shimmer skeleton-circle" />
                  <div className="skeleton-actor-text">
                    <div className="shimmer skeleton-line-short" />
                    <div className="shimmer skeleton-line-long" />
                  </div>
                </div>
              </td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '120px' }} /></td>
              <td><div className="shimmer skeleton-badge" /></td>
              <td><div className="shimmer skeleton-line-long" /></td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '80px' }} /></td>
              <td><div className="shimmer skeleton-line-short" style={{ width: '90px' }} /></td>
            </tr>
          ))}
        </tbody>
      );
    }

    if (logs.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="6" className="empty-logs-cell">
              <Terminal size={28} className="empty-icon" />
              <p>No activity logs recorded.</p>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {logs.map((log) => (
          <tr key={log._id || log.id}>
            <td>
              <div className="actor-cell-info">
                <div className="actor-avatar-initial">
                  {log.actor?.fullName ? log.actor.fullName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div className="actor-details-text">
                  <span className="actor-name">{log.actor?.fullName || 'System Admin'}</span>
                  <span className="actor-email">{log.actor?.email || 'admin@trustnet.com'}</span>
                </div>
              </div>
            </td>
            <td>
              <span className="action-tag-name">
                <Activity size={12} className="action-tag-icon" />
                <span>{log.action}</span>
              </span>
            </td>
            <td>
              <span className={`target-badge ${getTargetTypeBadgeClass(log.targetType)}`}>
                {log.targetType || 'System'}
              </span>
            </td>
            <td>
              <div className="log-details-container">
                {log.targetId && (
                  <span className="log-target-id">Ref ID: {log.targetId}</span>
                )}
                {formatDetails(log.details)}
              </div>
            </td>
            <td>
              <span className="ip-address-label">
                <Globe size={11} className="ip-icon" />
                <span>{log.ip || '127.0.0.1'}</span>
              </span>
            </td>
            <td>
              <span className="timestamp-label">
                {log.createdAt ? new Date(log.createdAt).toLocaleString(undefined, { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <div className="audit-logs-container">
      <SectionHeader
        title="Admin Audit Logs"
        subtitle="Review access logs and history of administrative mutations."
        actions={
          <button className="btn btn-secondary refresh-btn" onClick={() => loadAuditLogs(true)} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'auth-spinner' : ''} />
            <span>Refresh Logs</span>
          </button>
        }
      />

      {errorMsg && (
        <div className="audit-error-banner">
          <AlertCircle size={20} />
          <div className="error-banner-content">
            <h4>Unable to retrieve audit logs</h4>
            <p>{errorMsg}</p>
          </div>
          <button className="btn btn-primary retry-btn" onClick={() => loadAuditLogs(true)}>
            Retry
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <AdminCard className="audit-filters-card">
        <div className="audit-filters-grid">
          {/* Action search */}
          <div className="search-field-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by action name (e.g. user.suspend)..."
              value={searchAction}
              onChange={(e) => { setSearchAction(e.target.value); setCurrentPage(1); }}
              disabled={isLoading}
            />
          </div>

          {/* Target Type select */}
          <div className="select-filter-group">
            <SlidersHorizontal size={14} className="filter-icon" />
            <select
              value={selectedTargetType}
              onChange={(e) => { setSelectedTargetType(e.target.value); setCurrentPage(1); }}
              disabled={isLoading}
              aria-label="Filter by Target Type"
            >
              <option value="">All Targets</option>
              <option value="User">User Only</option>
              <option value="Startup">Startup Only</option>
              <option value="Verification">Verification Only</option>
            </select>
          </div>

          {/* Pagination Counter */}
          <div className="pagination-quick-status">
            <span>Showing {logs.length} of {totalCount} logs</span>
          </div>
        </div>
      </AdminCard>

      {/* Main Table Grid */}
      <AdminCard className="audit-table-card">
        <div className="table-responsive">
          <table className="audit-table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Action</th>
                <th>Target Type</th>
                <th>Target & Details</th>
                <th>IP Address</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            {renderTableContent()}
          </table>
        </div>

        {/* Paginator Controls */}
        {totalPages > 1 && (
          <div className="audit-pagination-toolbar">
            <button 
              className="btn btn-secondary page-btn" 
              onClick={handlePrevPage} 
              disabled={currentPage === 1 || isLoading}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span className="page-indicator-text">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              className="btn btn-secondary page-btn" 
              onClick={handleNextPage} 
              disabled={currentPage === totalPages || isLoading}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
