import { X } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import './MobileSidebar.css';

export default function MobileSidebar({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="mobile-sidebar-overlay" onClick={onClose}>
      <div className="mobile-sidebar-container" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button className="mobile-sidebar-close" onClick={onClose} aria-label="Close sidebar">
          <X size={20} />
        </button>
        {/* Actual Sidebar contents */}
        <AdminSidebar onClose={onClose} />
      </div>
    </div>
  );
}
