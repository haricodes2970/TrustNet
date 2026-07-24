import React from 'react';
import { Settings, Lock, Bell, Shield, Trash2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const SettingsPage = () => {
  const { currentUser } = useAuth();
  const { showToast } = useApp();

  const handleSave = (e) => {
    e.preventDefault();
    showToast('Settings Saved', 'Updated account settings successfully.', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Account & Security Settings</h1>
        <p className="text-xs text-slate-500 mt-1">Manage profile information, pitch privacy, and notification settings</p>
      </div>

      <Card className="p-6 border-slate-200">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Full Name" defaultValue={currentUser.name} />
          <Input label="Work Email" defaultValue="alex.morgan@nexusai.io" />
          <Input label="Headline" defaultValue={currentUser.headline} />

          <Button type="submit" variant="primary" size="md">
            Save Changes
          </Button>
        </form>
      </Card>
    </div>
  );
};
