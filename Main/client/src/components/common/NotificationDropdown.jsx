import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  DollarSign, 
  Users, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { useApp } from '../../context/AppContext';
import * as notificationApi from '../../lib/notificationApi';

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { showToast } = useApp();

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationApi.getUnreadCount();
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Fail silently to not disrupt the main layout
    }
  };

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await notificationApi.listNotifications();
      setNotifications(res || []);
    } catch (err) {
      setError('Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast('Notifications Read', 'All items marked as read.', 'success');
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to mark all as read.', 'rose');
    }
  };

  const handleDeleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(prev => prev.filter(n => (n._id || n.id) !== id));
      fetchUnreadCount();
      showToast('Notification Deleted', 'Removed item successfully.', 'success');
    } catch (err) {
      showToast('Action Failed', err.message || 'Failed to delete notification.', 'rose');
    }
  };

  const handleNotificationClick = async (item) => {
    const itemId = item._id || item.id;
    if (!item.read) {
      try {
        await notificationApi.markRead(itemId);
        setNotifications(prev => prev.map(n => (n._id || n.id) === itemId ? { ...n, read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {
        // Fail silently and proceed with navigation
      }
    }
    setIsOpen(false);
    // Resolve link context: use data link, type specific paths, or fallback
    const targetLink = item.data?.link || 
      (item.type === 'Investor' || item.type === 'Funding' ? '/app/startups' :
       item.type === 'Verification' ? '/verification' :
       item.type === 'Community' ? '/app/communities' : '/app/startups');
    navigate(targetLink);
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'Investor': return <DollarSign className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />;
      case 'Funding': return <DollarSign className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />;
      case 'Verification': return <ShieldCheck className="w-4 h-4 text-slate-700" strokeWidth={1.75} />;
      case 'Community': return <Users className="w-4 h-4 text-slate-700" strokeWidth={1.75} />;
      default: return <Bell className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle notifications menu"
        className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#0F6E5C]/30"
      >
        <Bell className="w-5 h-5" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-soft-lg border border-slate-200/80 overflow-hidden z-40"
            >
              {/* Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#0E1A2B] font-sans">Notifications</h3>
                  {unreadCount > 0 && <Badge variant="emerald">{unreadCount} New</Badge>}
                </div>
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-[#0F6E5C] hover:underline font-semibold flex items-center gap-1 focus:outline-none"
                >
                  <CheckCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Mark all read</span>
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {isLoading ? (
                  <div className="p-6 text-center text-xs font-mono text-[#5B6472] animate-pulse">
                    Loading notifications...
                  </div>
                ) : error ? (
                  <div className="p-6 text-center text-xs font-mono text-[#B23A32] flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                ) : notifications.length > 0 ? (
                  notifications.map((item) => {
                    const itemId = item._id || item.id;
                    const isUnread = !item.read;

                    return (
                      <div
                        key={itemId}
                        onClick={() => handleNotificationClick(item)}
                        className={`p-3.5 flex items-start gap-3 hover:bg-[#F7F5EF]/50 cursor-pointer transition-colors ${
                          isUnread ? 'bg-[#F7F5EF]/20 font-semibold' : ''
                        }`}
                      >
                        <div className="p-2 rounded-xl bg-slate-100 flex-shrink-0">
                          {getTypeIcon(item.type)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h4 className="text-xs font-bold text-[#0E1A2B] truncate font-sans">{item.title}</h4>
                            <span className="text-[9px] font-mono text-slate-400 flex-shrink-0">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5B6472] mt-0.5 line-clamp-2 font-sans">{item.message}</p>
                        </div>

                        <button
                          onClick={(e) => handleDeleteNotification(itemId, e)}
                          aria-label="Delete notification"
                          className="text-slate-400 hover:text-[#B23A32] p-1 focus:outline-none transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs font-mono text-slate-400">
                    No notifications
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => { setIsOpen(false); navigate('/app/notifications'); }}
                  className="text-xs text-[#0F6E5C] font-semibold hover:underline"
                >
                  View All Notifications
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
