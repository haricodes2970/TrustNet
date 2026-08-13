import { Menu, Bell, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './AdminHeader.css';

export default function AdminHeader({ title, onToggleSidebar }) {
  const { currentUser } = useAuth();
  return (
    <header className="admin-header">
      {/* Left side: Sidebar Toggle & Page Title */}
      <div className="header-left">
        <button className="sidebar-toggle-btn" onClick={onToggleSidebar} aria-label="Toggle Sidebar">
          <Menu size={20} />
        </button>
        <h2 className="header-title">{title}</h2>
      </div>

      {/* Right side: Search, Notifications, Profile */}
      <div className="header-right">
        {/* Search bar */}
        <div className="search-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search verifications, startups, users..."
            className="header-search-input"
          />
        </div>

        {/* Notifications */}
        <button className="header-icon-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        {/* Admin profile quick preview */}
        <div className="header-profile">
          <div className="profile-details">
            <span className="profile-name">{currentUser?.fullName || 'Admin'}</span>
            <span className="profile-role">{currentUser?.role === 'admin' ? 'Owner' : 'Staff'}</span>
          </div>
          <div className="profile-avatar">
            <User size={16} />
          </div>
        </div>
      </div>
    </header>
  );
}
