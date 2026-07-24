import React, { useState } from 'react';
import { UserCheck, Clock, UserPlus, Check, X } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { MOCK_USERS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

export const ConnectionsPage = () => {
  const { users, updateConnectionStatus, showToast } = useApp();
  const [activeTab, setActiveTab] = useState('connected');

  const tabs = [
    { id: 'connected', label: 'My Connections (1,240)' },
    { id: 'pending', label: 'Pending Requests (3)' },
    { id: 'suggestions', label: 'Recommended' },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Connection Management</h1>
        <p className="text-xs text-slate-500 mt-1">Manage network invitations and trusted ecosystem connections</p>
      </div>

      <Card className="p-2 border-slate-200">
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      </Card>

      <div className="space-y-4">
        {users.map((u) => (
          <Card key={u.id} className="p-4 border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Avatar src={u.avatar} alt={u.name} size="md" isVerified />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">{u.name}</h4>
                <p className="text-xs text-slate-500 truncate">{u.headline}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => showToast('Message Started', `Chat with ${u.name}`, 'info')}>
                Message
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
