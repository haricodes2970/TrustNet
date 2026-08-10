import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Sparkles, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  TrendingUp,
  Sliders,
  Settings,
  Building
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/apiClient';

export const StartupTimelinePage = () => {
  const { showToast, startups, setStartups } = useApp();
  
  // Get current user's startups
  const myStartups = startups.filter(s => s.founderId === 'usr_me' || s.founder?.id === 'usr_me') || [];
  const [selectedStartup, setSelectedStartup] = useState(myStartups[0] || startups[0]);

  // Form states
  const [mDate, setMDate] = useState('Q3 2026');
  const [mTitle, setMTitle] = useState('');
  const [mStatus, setMStatus] = useState('planned');

  useEffect(() => {
    if (myStartups.length > 0 && !selectedStartup) {
      setSelectedStartup(myStartups[0]);
    }
  }, [startups]);

  if (!selectedStartup) {
    return (
      <div className="space-y-8 max-w-[1440px] mx-auto pb-16">
        <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl p-8 space-y-4">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-800">No Startup Profile Found</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            You need to register a startup profile in TrustNet first to build its milestones roadmap.
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/app/startups/create'}>
            Create Startup Profile
          </Button>
        </div>
      </div>
    );
  }

  const handleAddMilestone = async (e) => {
    e.preventDefault();
    if (!mTitle.trim()) return;

    const newMilestone = {
      date: mDate,
      title: mTitle,
      status: mStatus
    };

    const updatedMilestones = [...(selectedStartup.milestones || []), newMilestone];

    try {
      const res = await apiClient.put(`/startups/${selectedStartup.id}/milestones`, {
        milestones: updatedMilestones
      });

      // Update in AppContext
      setStartups(prev => prev.map(s => s.id === selectedStartup.id ? { ...s, milestones: res.milestones } : s));
      setSelectedStartup(prev => ({ ...prev, milestones: res.milestones }));
      
      setMTitle('');
      showToast('Milestone Added', `Roadmap milestone "${newMilestone.title}" has been saved.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save milestone', 'Please try again.', 'error');
    }
  };

  const handleDeleteMilestone = async (indexToDelete) => {
    const updatedMilestones = (selectedStartup.milestones || []).filter((_, idx) => idx !== indexToDelete);

    try {
      const res = await apiClient.put(`/startups/${selectedStartup.id}/milestones`, {
        milestones: updatedMilestones
      });

      setStartups(prev => prev.map(s => s.id === selectedStartup.id ? { ...s, milestones: res.milestones } : s));
      setSelectedStartup(prev => ({ ...prev, milestones: res.milestones }));
      showToast('Milestone Removed', 'Item deleted from your roadmap.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (index, newStatus) => {
    const updatedMilestones = (selectedStartup.milestones || []).map((m, idx) => 
      idx === index ? { ...m, status: newStatus } : m
    );

    try {
      const res = await apiClient.put(`/startups/${selectedStartup.id}/milestones`, {
        milestones: updatedMilestones
      });

      setStartups(prev => prev.map(s => s.id === selectedStartup.id ? { ...s, milestones: res.milestones } : s));
      setSelectedStartup(prev => ({ ...prev, milestones: res.milestones }));
      showToast('Status Updated', 'Milestone stage transitioned successfully.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/80">
              <Calendar className="w-7 h-7 text-emerald-500" strokeWidth={1.75} />
            </div>
            <span>Interactive Startup Roadmap & Timeline</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1.5">
            Visualize your operational roadmap, log key achievements, and publish milestones transparently for investor auditing.
          </p>
        </div>
      </div>

      {/* Startup Selector */}
      {myStartups.length > 1 && (
        <div className="flex gap-2 items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-soft-sm max-w-sm">
          <Building className="w-4 h-4 text-slate-400" />
          <select
            value={selectedStartup.id}
            onChange={(e) => {
              const selected = myStartups.find(s => s.id === e.target.value);
              if (selected) setSelectedStartup(selected);
            }}
            className="w-full text-xs font-bold text-slate-700 focus:outline-none bg-transparent cursor-pointer"
          >
            {myStartups.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visual Roadmap (7 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="p-6 border-slate-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-8">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-500" />
                <span>Roadmap Visual Node Graph</span>
              </h3>
              <Badge variant="emerald">Transparent Log</Badge>
            </div>

            {/* Vertical timeline graph */}
            <div className="relative pl-8 border-l-2 border-dashed border-slate-200/80 space-y-8 ml-4">
              {(selectedStartup.milestones || []).length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold pl-0 -ml-8">
                  Your timeline contains no milestones. Use the Capture form to add one.
                </div>
              ) : (
                (selectedStartup.milestones || []).map((m, idx) => {
                  const isCompleted = m.status === 'completed';
                  const isProgress = m.status === 'in-progress' || m.status === 'in progress';
                  
                  return (
                    <div key={idx} className="relative group animate-fadeIn">
                      {/* Timeline dot */}
                      <div className={`absolute -left-[41px] top-0.5 w-6 h-6 rounded-full border-4 border-white shadow-soft-sm flex items-center justify-center transition-all ${
                        isCompleted 
                          ? 'bg-emerald-500 text-white' 
                          : isProgress 
                          ? 'bg-amber-500 text-white' 
                          : 'bg-slate-200 text-slate-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
                        ) : isProgress ? (
                          <Clock className="w-3.5 h-3.5 stroke-[3] animate-spin" style={{ animationDuration: '3s' }} />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                      </div>

                      {/* Content Card */}
                      <Card className="p-4 border-slate-200 bg-white shadow-soft-xs hoverEffect relative">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-black text-emerald-600 font-mono uppercase tracking-wider">{m.date}</span>
                              <Badge variant={isCompleted ? 'emerald' : isProgress ? 'warning' : 'slate'} size="sm">
                                {m.status}
                              </Badge>
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mt-1.5">{m.title}</h4>
                          </div>

                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleDeleteMilestone(idx)}
                              className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50/50"
                              title="Delete Milestone"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Fast Status Change Tool */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-semibold">
                          <span>Transition stage:</span>
                          <div className="flex gap-1.5">
                            {['completed', 'in-progress', 'planned'].map(state => (
                              <button
                                key={state}
                                type="button"
                                onClick={() => handleUpdateStatus(idx, state)}
                                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                                  m.status === state 
                                    ? 'bg-slate-100 text-slate-800' 
                                    : 'hover:bg-slate-50 text-slate-400 hover:text-slate-600'
                                }`}
                              >
                                {state}
                              </button>
                            ))}
                          </div>
                        </div>
                      </Card>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Capture form (5 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-slate-200/80 bg-white">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-500" />
              <span>Log Milestone Event</span>
            </h3>

            <form onSubmit={handleAddMilestone} className="space-y-4">
              <Input
                label="Timeline Date / Quarter"
                placeholder="e.g. Q4 2026 or Dec 2026"
                value={mDate}
                onChange={(e) => setMDate(e.target.value)}
                required
              />

              <Input
                label="Milestone Title"
                placeholder="e.g. Release SDK v1.0 and land first pilot client"
                value={mTitle}
                onChange={(e) => setMTitle(e.target.value)}
                required
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">State status</label>
                <select
                  value={mStatus}
                  onChange={(e) => setMStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
                >
                  <option value="planned">Planned (Grey Dot)</option>
                  <option value="in-progress">In-Progress (Amber Pulse)</option>
                  <option value="completed">Completed (Green Check)</option>
                </select>
              </div>

              <Button type="submit" variant="primary" className="w-full justify-center mt-2">
                <Plus className="w-4 h-4" />
                <span>Save Milestone</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
