import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, ShieldCheck, Users, Rocket, DollarSign, 
  Briefcase, MessageSquareWarning, AlertTriangle, LineChart, 
  Bell, History, Settings, LogOut, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AdminSidebar.css';

export default function AdminSidebar({ onClose }) {
  const { logout, currentUser } = useAuth();
  // Navigation groupings
  const groups = [
    {
      title: 'MAIN',
      items: [
        { name: 'Overview', path: '/admin', icon: LayoutDashboard, exact: true },
        { name: 'Verification Center', path: '/admin/verification', icon: ShieldCheck },
        { name: 'Users', path: '/admin/users', icon: Users },
        { name: 'Startups', path: '/admin/startups', icon: Rocket },
        { name: 'Investors', path: '/admin/investors', icon: DollarSign },
        { name: 'Mentors & Professionals', path: '/admin/mentors', icon: Briefcase }
      ]
    },
    {
      title: 'MODERATION',
      items: [
        { name: 'Content Moderation', path: '/admin/moderation', icon: MessageSquareWarning },
        { name: 'Reports & Safety', path: '/admin/reports', icon: AlertTriangle }
      ]
    },
    {
      title: 'INSIGHTS',
      items: [
        { name: 'Analytics', path: '/admin/analytics', icon: LineChart }
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Notifications', path: '/admin/notifications', icon: Bell },
        { name: 'Audit Logs', path: '/admin/audit-logs', icon: History },
        { name: 'Settings', path: '/admin/settings', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="admin-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-container">
          <ShieldAlert className="brand-logo" size={24} />
          <span className="brand-name">TrustNet</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span className="brand-badge">Admin Panel</span>
          {import.meta.env.DEV && <span className="preview-badge">Admin Preview Mode</span>}
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="sidebar-nav">
        {groups.map((group, gIdx) => (
          <div key={gIdx} className="nav-group">
            <h4 className="nav-group-title">{group.title}</h4>
            <div className="nav-items-list">
              {group.items.map((item, iIdx) => (
                <NavLink
                  key={iIdx}
                  to={item.path}
                  end={item.exact}
                  className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <item.icon className="nav-item-icon" size={18} />
                  <span className="nav-item-text">{item.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin Profile Footer */}
      <div className="sidebar-footer">
        <div className="admin-profile-section">
          <div className="admin-avatar">
            <span>{currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'A'}</span>
          </div>
          <div className="admin-info">
            <span className="admin-name">{currentUser?.fullName || 'Administrator'}</span>
            <span className="admin-role">{currentUser?.role === 'admin' ? 'Platform Admin' : 'Staff'}</span>
          </div>
        </div>
        <button className="logout-btn" title="Logout" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
