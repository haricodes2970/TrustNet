import AdminCard from '../ui/AdminCard';
import StatusBadge from '../ui/StatusBadge';
import './RecentActivity.css';

export default function RecentActivity({ activities = [], isLoading = false }) {
  // Helper to format audit log actions to user-friendly titles
  const formatAction = (action) => {
    if (!action) return 'Unknown Action';
    switch (action.toLowerCase()) {
      case 'verification.approve':
        return 'Verification Approved';
      case 'verification.reject':
        return 'Verification Rejected';
      case 'verification.request_resubmission':
        return 'Resubmission Requested';
      case 'users.suspend':
      case 'user.suspend':
        return 'User Suspended';
      case 'users.reactivate':
      case 'user.reactivate':
        return 'User Reactivated';
      case 'users.role_change':
        return 'User Role Changed';
      case 'users.delete':
        return 'User Account Deleted';
      case 'content.moderate':
        return 'Content Moderated';
      case 'startups.suspend':
      case 'startup.suspend':
        return 'Startup Suspended';
      case 'startups.restore':
      case 'startup.restore':
        return 'Startup Restored';
      default:
        // Capitalize and format dots/underscores to spaces
        return action
          .replace(/[._]/g, ' ')
          .replace(/\b\w/g, (char) => char.toUpperCase());
    }
  };

  // Helper to resolve status badge labels from actions
  const resolveStatus = (action) => {
    if (!action) return 'Pending';
    const act = action.toLowerCase();
    if (act.includes('approve') || act.includes('restore') || act.includes('reactivate')) {
      return 'Approved';
    }
    if (act.includes('reject')) {
      return 'Rejected';
    }
    if (act.includes('suspend') || act.includes('delete')) {
      return 'Suspended';
    }
    if (act.includes('resubmission') || act.includes('moderate')) {
      return 'Under Review';
    }
    return 'Pending';
  };

  // Helper to format timestamps to relative time or clean date
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    try {
      const date = new Date(timeStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent';
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <tbody>
          {[1, 2, 3, 4, 5].map((idx) => (
            <tr key={idx}>
              <td><div className="shimmer skeleton-cell" style={{ width: '130px', height: '16px', borderRadius: '4px' }} /></td>
              <td><div className="shimmer skeleton-cell" style={{ width: '110px', height: '16px', borderRadius: '4px' }} /></td>
              <td><div className="shimmer skeleton-cell" style={{ width: '80px', height: '16px', borderRadius: '4px' }} /></td>
              <td className="activity-status text-right">
                <div className="shimmer skeleton-cell" style={{ width: '70px', height: '24px', borderRadius: '12px' }} />
              </td>
            </tr>
          ))}
        </tbody>
      );
    }

    if (activities.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan="4" className="empty-table-cell">
              No recent activity available
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {activities.map((activity) => (
          <tr key={activity._id || activity.id}>
            <td className="activity-action">{formatAction(activity.action)}</td>
            <td className="activity-target">
              <span className="target-type">{activity.targetType}</span>
              <span className="target-id" title={activity.targetId}>
                ({String(activity.targetId || '').substring(0, 8)}...)
              </span>
            </td>
            <td className="activity-time">{formatTime(activity.createdAt)}</td>
            <td className="activity-status text-right">
              <StatusBadge status={resolveStatus(activity.action)} />
            </td>
          </tr>
        ))}
      </tbody>
    );
  };

  return (
    <AdminCard title="Safety & Audit Trail" className="recent-activity-card">
      <div className="table-responsive">
        <table className="activity-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Target</th>
              <th>Time</th>
              <th className="text-right">Status</th>
            </tr>
          </thead>
          {renderContent()}
        </table>
      </div>
    </AdminCard>
  );
}
