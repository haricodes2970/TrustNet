import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/common/Sidebar';
import { TopNav } from '../components/common/TopNav';
import { BottomNav } from '../components/common/BottomNav';
import { CommandPalette } from '../components/ui/CommandPalette';
import { ToastContainer } from '../components/ui/Toast';

export const AppLayout = () => {
  return (
    <div className="min-h-screen bg-trust-paper text-trust-ink flex selection:bg-trust-verified selection:text-white">
      {/* Desktop sidebar */}
      <div className="hidden md:block relative z-20">
        <Sidebar />
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        <TopNav />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <BottomNav />
      <CommandPalette />
      <ToastContainer />
    </div>
  );
};
