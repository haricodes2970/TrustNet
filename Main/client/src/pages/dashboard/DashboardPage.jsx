import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building,
  DollarSign,
  Users,
  GraduationCap,
  Sparkles,
  Plus
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

export const DashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { startups } = useApp();

  const [activeRole, setActiveRole] = useState('Entrepreneur');

  // Sync role from URL query param e.g. /app/dashboard?role=investor
  // Admin is intentionally excluded: this is a display-only workspace
  // switcher, not a real permission grant, and the real Admin Console
  // lives at /app/admin behind ProtectedRoute's role check.
  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam) {
      const formatted = roleParam.charAt(0).toUpperCase() + roleParam.slice(1);
      const validRoles = ['Entrepreneur', 'Investor', 'Mentor'];
      if (validRoles.includes(formatted)) {
        setActiveRole(formatted);
      }
    }
  }, [searchParams]);

  const roles = [
    { id: 'Entrepreneur', label: 'Entrepreneur', icon: Building },
    { id: 'Investor', label: 'Investor', icon: DollarSign },
    { id: 'Mentor', label: 'Mentor', icon: Users }
  ];

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Role Switcher Navigation Bar */}
      <Card className="p-2 border-slate-200/80 bg-white shadow-soft-sm">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = activeRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveRole(r.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                    isActive
                      ? 'bg-emerald-500 text-white shadow-soft-sm'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                  <span>{r.label}</span>
                </button>
              );
            })}
          </div>

          <Badge variant="emerald" className="hidden lg:flex">
            Role Switcher Active
          </Badge>
        </div>
      </Card>

      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Welcome back, {currentUser?.name || 'Alex'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Here is your real-time {activeRole.toLowerCase()} ecosystem dashboard overview.
        </p>
      </div>

      {/* 1. ENTREPRENEUR DASHBOARD */}
      {activeRole === 'Entrepreneur' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">My Startups</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">2 Active</h3>
              <span className="text-xs text-emerald-600 font-semibold mt-2 block">NexusAI (Seed Round)</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Funding Raised</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">$1,850,000</h3>
              <span className="text-xs text-slate-500 mt-2 block">Goal $2.5M (74%)</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pitch Deck Views</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">340 Views</h3>
              <span className="text-xs text-emerald-600 font-semibold mt-2 block">+18 VC downloads</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Health Score</span>
                <h3 className="text-3xl font-black text-emerald-600 mt-2">94%</h3>
                <span className="text-xs text-emerald-600 font-semibold mt-1 block">Excellent</span>
              </div>
              <ProgressRing progress={94} size={56} strokeWidth={5} />
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <Card className="p-6 border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Active Tasks & Milestones</h3>
                  <Button variant="outline" size="sm">
                    <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                    <span>Add Task</span>
                  </Button>
                </div>
                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Send updated cap table to Horizon VCs</span>
                    <Badge variant="amber">High Priority</Badge>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/60 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Finalize Senior React Engineer interview round</span>
                    <Badge variant="emerald">In Progress</Badge>
                  </div>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <Card className="p-6 border-slate-200/80 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                  AI Advisor Guidance
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Based on your MRR trajectory, schedule pitch calls with Tier 1 Seed VCs this week.
                </p>
                <Button variant="primary" size="sm" className="w-full" onClick={() => navigate('/app/startups/my')}>
                  <span>Manage My Startups</span>
                </Button>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 2. INVESTOR DASHBOARD */}
      {activeRole === 'Investor' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Dealflow Pipeline</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">18 Startups</h3>
              <span className="text-xs text-emerald-600 font-semibold mt-2 block">4 in Term Sheet</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Capital Deployed</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">$4.2M</h3>
              <span className="text-xs text-slate-500 mt-2 block">Across 12 portfolio Cos</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Saved Pitch Decks</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">24 Decks</h3>
              <span className="text-xs text-slate-500 mt-2 block">8 new this week</span>
            </Card>

            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Upcoming Calls</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">5 Sessions</h3>
              <span className="text-xs text-slate-500 mt-2 block">Today & Tomorrow</span>
            </Card>
          </div>
        </div>
      )}

      {/* 3. MENTOR DASHBOARD */}
      {activeRole === 'Mentor' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mentoring Sessions</span>
              <h3 className="text-3xl font-black text-slate-900 mt-2">142 Completed</h3>
              <span className="text-xs text-emerald-600 font-semibold mt-2 block">4.9 Star Rating</span>
            </Card>
            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Founder Requests</span>
              <h3 className="text-3xl font-black text-amber-600 mt-2">6 Requests</h3>
            </Card>
            <Card className="p-6 border-slate-200/80 hoverEffect">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Mentees</span>
              <h3 className="text-3xl font-black text-emerald-600 mt-2">12 Founders</h3>
            </Card>
          </div>
        </div>
      )}

      {/* 5. ADMIN DASHBOARD */}
    </div>
  );
};
