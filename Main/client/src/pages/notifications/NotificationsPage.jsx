import React, { useState } from 'react';
import { Bell, Check, ShieldCheck, MessageSquare, AtSign, UserPlus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { useApp } from '../../context/AppContext';

export const NotificationsPage = () => {
  const { notifications, setNotifications, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('all');

  const tabs = [
    { id: 'all', label: 'All Activity' },
    { id: 'invite', label: 'Invites' },
    { id: 'verification', label: 'Verifications' },
    { id: 'mention', label: 'Mentions' },
  ];

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    showToast('Notifications Updated', 'All notifications marked as read.', 'success');
  };

  const filtered = notifications.filter(n => {
    if (activeTab === 'all') return true;
    return n.type === activeTab;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Notification Center</h1>
          <p className="text-xs text-slate-500 mt-1">Stay updated on pitch invitations, verifications, and mentions</p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllAsRead}>
          <Check className="w-4 h-4 text-emerald-500" />
          <span>Mark all as read</span>
        </Button>
      </div>

      <Card className="p-2 border-slate-200">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      <div className="space-y-3">
        {filtered.map((notif) => (
          <Card key={notif.id} className={`p-4 border-slate-200 transition-colors ${!notif.isRead ? 'bg-emerald-50/40 border-emerald-200' : ''}`}>
            <div className="flex items-start gap-3.5">
              <Avatar src={notif.avatar} alt="Notif Avatar" size="md" isVerified />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                  <span className="text-[11px] text-slate-400">{notif.timeAgo}</span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{notif.content}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
