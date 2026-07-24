import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { ToastContainer } from '../components/ui/Toast';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  );
};
