import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '../components/common/Logo';
import { AnimatedBackground } from '../components/common/AnimatedBackground';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative selection:bg-emerald-500 selection:text-white">
      <AnimatedBackground />

      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-xl rounded-3xl shadow-soft-lg border border-slate-200/80 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px] relative z-10">
        {/* Left Branding Showcase Card */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="mb-10">
              <Logo size="lg" variant="auth" to="/" />
            </div>

            <h2 className="text-2xl lg:text-3xl font-black tracking-tight leading-tight text-white mb-4">
              Where Silicon Valley meets Global Founders.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed font-normal">
              Connect with top 1% VCs, YC founders, verified mentors, and ambitious talent. Discover pre-seed pitch opportunities and build startups securely.
            </p>
          </div>

          <div className="relative z-10 space-y-4 pt-8 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Verified Startup Identity</h4>
                <p className="text-[11px] text-slate-400">Trusted network of founders and investors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Container */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex items-center justify-center bg-white/90 backdrop-blur-md">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
