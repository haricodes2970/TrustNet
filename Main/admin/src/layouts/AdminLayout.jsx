import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import AdminSidebar from '../components/layout/AdminSidebar';
import AdminHeader from '../components/layout/AdminHeader';
import MobileSidebar from '../components/layout/MobileSidebar';
import './AdminLayout.css';

export default function AdminLayout() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();

  // Helper to map route pathname to header title
  const getPageTitle = (pathname) => {
    switch (pathname) {
      case '/admin':
        return 'Admin Overview';
      case '/admin/verification':
        return 'Verification Center';
      case '/admin/users':
        return 'Users Management';
      case '/admin/startups':
        return 'Startups Ecosystem';
      case '/admin/investors':
        return 'Investors Directory';
      case '/admin/mentors':
        return 'Mentors & Professionals';
      case '/admin/moderation':
        return 'Content Moderation';
      case '/admin/reports':
        return 'Reports & Safety';
      case '/admin/analytics':
        return 'Analytics & Insights';
      case '/admin/notifications':
        return 'Notifications';
      case '/admin/audit-logs':
        return 'Audit Logs';
      case '/admin/settings':
        return 'System Settings';
      default:
        return 'Admin Panel';
    }
  };

  const title = getPageTitle(location.pathname);

  return (
    <div className="admin-layout-container">
      {/* Persistent Desktop Sidebar */}
      <div className="desktop-sidebar-wrapper">
        <AdminSidebar />
      </div>

      {/* Slide-out Mobile Sidebar Overlay */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="admin-main-viewport">
        <AdminHeader
          title={title}
          onToggleSidebar={() => setIsMobileSidebarOpen(true)}
        />
        
        {/* Scrollable Page Content */}
        <main className="admin-content-scroller">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
