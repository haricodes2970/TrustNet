import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { TopNav } from '../components/common/TopNav';
import { BottomNav } from '../components/common/BottomNav';
import { CommandPalette } from '../components/ui/CommandPalette';
import { ToastContainer } from '../components/ui/Toast';
import { AnimatedBackground } from '../components/common/AnimatedBackground';
import { useAuth } from '../context/AuthContext';
import { Lock, LogOut, CheckCircle2, FileText } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

const PendingVerificationScreen = () => {
  const { logout, currentUser, updateUserProfile } = useAuth();
  
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 select-none w-full">
      <Card className="w-full max-w-lg bg-white rounded-3xl shadow-soft-lg border border-slate-200 p-8 sm:p-10 text-center space-y-6">
        <div className="w-16 h-16 bg-amber-500/10 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs animate-pulse">
          <Lock className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Verification Under Review</h2>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            Your credentials and uploaded verification documents are currently being audited by a platform administrator. To maintain a high-trust ecosystem, all dashboards are locked until verification is complete.
          </p>
        </div>

        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/80 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Account:</span>
            <span className="text-slate-600 font-semibold">{currentUser?.name} ({currentUser?.role})</span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>Verification Status:</span>
            <span className="text-amber-700 font-black uppercase text-[10px] bg-amber-100 px-2 py-0.5 rounded-full">
              Pending Approval
            </span>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <Button variant="primary" size="lg" className="w-full" onClick={() => window.location.reload()}>
            <span>Check Verification Status</span>
          </Button>
          <Button variant="ghost" size="md" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50/30" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            <span>Log Out</span>
          </Button>
        </div>

        {/* Demo Mode Bypass */}
        <div className="pt-4 border-t border-slate-100 mt-4 text-center">
          <button 
            onClick={() => {
              updateUserProfile({ isVerified: true });
              window.location.reload();
            }}
            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            [Demo Bypass] Simulate Admin Approval
          </button>
        </div>
      </Card>
    </div>
  );
};

export const AppLayout = () => {
  const { currentUser } = useAuth();
  const userRole = (currentUser?.role || '').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'administrator';

  // Lock dashboard access until admin verification is complete
  if (currentUser && !currentUser.isVerified && !isAdmin) {
    return <PendingVerificationScreen />;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex relative selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      <AnimatedBackground />

      {/* Desktop Sidebar Navigation (240px Fixed) */}
      <div className="hidden md:block relative z-20">
        <Sidebar />
      </div>

      {/* Main Workspace Area (1440px Max Width Container with 32px Padding) */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0 relative z-10">
        <TopNav />
        <main className="flex-1 p-6 sm:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Utilities */}
      <BottomNav />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
};
