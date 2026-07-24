import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  DollarSign, 
  Users, 
  ShieldCheck
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([
    { id: '1', type: 'Investor', title: 'Horizon Ventures requested pitch deck', subtitle: 'Sarah Chen sent an investor view request.', timeAgo: '10 mins ago', isUnread: true, link: '/app/startups/my' },
    { id: '2', type: 'Funding', title: 'New $500,000 commitment received', subtitle: 'NexusAI Seed round update', timeAgo: '2 hours ago', isUnread: true, link: '/app/startups/my' },
    { id: '3', type: 'Verification', title: 'Identity Verification Approved', subtitle: 'You are now a Verified Founder on TrustNet', timeAgo: 'Yesterday', isUnread: true, link: '/verification' },
    { id: '4', type: 'Community', title: 'Y Combinator Applicants thread highlight', subtitle: '34 new founder replies', timeAgo: '2 days ago', isUnread: false, link: '/app/communities' }
  ]);

  const unreadCount = notifications.filter(n => n.isUnread).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
  };

  const deleteNotification = (id, e) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = (item) => {
    setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, isUnread: false } : n));
    setIsOpen(false);
    navigate(item.link);
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
        className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                  <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                  {unreadCount > 0 && <Badge variant="emerald">{unreadCount} New</Badge>}
                </div>
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-600 hover:underline font-semibold flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Mark all read</span>
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                {notifications.length > 0 ? (
                  notifications.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleNotificationClick(item)}
                      className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                        item.isUnread ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="p-2 rounded-xl bg-slate-100 flex-shrink-0">
                        {getTypeIcon(item.type)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{item.title}</h4>
                          <span className="text-[10px] text-slate-400">{item.timeAgo}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{item.subtitle}</p>
                      </div>

                      <button
                        onClick={(e) => deleteNotification(item.id, e)}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No notifications
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button
                  onClick={() => { setIsOpen(false); navigate('/app/notifications'); }}
                  className="text-xs text-emerald-600 font-semibold hover:underline"
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
