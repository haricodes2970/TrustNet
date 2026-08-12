import React, { useEffect, useState } from 'react';
import { Bell, AlertCircle, RefreshCw, Info } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/common/EmptyState';
import * as notificationApi from '../../lib/notificationApi';

export const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await notificationApi.listNotifications();
      setNotifications(data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications from TrustNet.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="bg-[#F7F5EF] min-h-screen p-4 sm:p-6 font-ui text-[#0E1A2B]">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black font-display tracking-tight text-[#0E1A2B]">
            Notification Center
          </h1>
          <p className="text-xs text-[#5B6472] mt-1 font-ui">
            Stay updated on key milestones, system verifications, and professional invites.
          </p>
        </div>

        {/* Status indicator bar (info only, color + icon for accessibility) */}
        <div className="p-3 bg-[#0F6E5C]/10 border border-[#0F6E5C]/25 rounded-[4px] flex items-center gap-2 text-[#0F6E5C] text-xs font-mono">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>REAL-TIME AUDIT LOG CONNECTED</span>
        </div>

        {/* Notifications list states */}
        {isLoading && (
          <div className="space-y-3" aria-live="polite" aria-busy="true">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="p-4 bg-white border border-[#5B6472]/20 rounded-[8px] space-y-2.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-3 w-16 bg-slate-100 rounded" />
                </div>
                <div className="h-3.5 w-full bg-slate-150 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </Card>
            ))}
          </div>
        )}

        {error && (
          <div className="p-6 bg-white border border-[#5B6472]/20 rounded-[8px] text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-[#B23A32]/10 text-[#B23A32] flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0E1A2B] font-display">Connection Interrupted</h3>
              <p className="text-xs text-[#5B6472] mt-1">{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchNotifications}
              className="mx-auto rounded-[4px] border-[#5B6472]/40 text-[#0E1A2B] hover:bg-[#F7F5EF] flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Retry Fetch</span>
            </Button>
          </div>
        )}

        {!isLoading && !error && notifications.length === 0 && (
          <EmptyState
            icon={Bell}
            title="Inbox Clean"
            description="You have no notifications right now. Check back later for activity logs."
            className="bg-white border border-[#5B6472]/20 rounded-[8px]"
          />
        )}

        {!isLoading && !error && notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map((notif) => {
              const formattedDate = notif.createdAt
                ? new Date(notif.createdAt).toISOString().replace('T', ' ').slice(0, 19)
                : 'Just now';

              return (
                <Card 
                  key={notif._id || notif.id} 
                  className={`p-5 bg-white border border-[#5B6472]/20 rounded-[8px] shadow-[0_2px_6px_rgba(14,26,43,0.02)] transition-all ${
                    !notif.read ? 'border-l-4 border-l-[#C8862B]' : ''
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                    <div className="space-y-1">
                      
                      {/* Notification Header / Type */}
                      <div className="flex items-center gap-2">
                        {notif.type && (
                          <span 
                            className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#5B6472]/10 text-[#5B6472] rounded-[4px] font-mono"
                          >
                            {notif.type}
                          </span>
                        )}
                        {!notif.read && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 bg-[#C8862B]/10 text-[#C8862B] rounded-[4px] font-mono">
                            New
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-sm font-bold text-[#0E1A2B] font-ui">
                        {notif.title || 'Notification Update'}
                      </h4>

                      {/* Message Content */}
                      <p className="text-xs text-[#5B6472] font-ui leading-relaxed">
                        {notif.message}
                      </p>
                    </div>

                    {/* Timestamp */}
                    <div 
                      className="text-[10px] text-[#5B6472] font-mono whitespace-nowrap sm:text-right"
                      style={{ fontFamily: 'IBM Plex Mono, monospace' }}
                    >
                      {formattedDate} UTC
                    </div>

                  </div>
                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
