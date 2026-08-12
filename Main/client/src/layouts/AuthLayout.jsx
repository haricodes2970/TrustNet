import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '../components/common/Logo';

// TrustNet auth shell — paper canvas, ink branding panel, verified accents.
// No glassmorphism, no gradients, no AnimatedBackground (PRD design system).
export const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-trust-paper flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-trust-verified selection:text-white">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-soft-sm border border-trust-ink/10 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        {/* Left branding panel (ink) */}
        <div className="lg:col-span-5 bg-trust-ink p-8 lg:p-12 text-white flex flex-col justify-between">
          <div>
            <div className="mb-10">
              <Logo size="lg" variant="auth" to="/" />
            </div>
            <h2 className="font-display text-2xl lg:text-3xl leading-tight text-white mb-4">
              Where founders, investors and builders meet — verified.
            </h2>
            <p className="text-sm text-white/70 leading-relaxed">
              Connect with verified founders, investors and mentors. Build startups, raise funding and hire — in one trusted environment.
            </p>
          </div>

          <div className="space-y-4 pt-8 border-t border-white/15">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded bg-trust-verified/20 text-trust-verified">
                <ShieldCheck className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Verified startup identity</h4>
                <p className="text-[11px] text-white/60">A trusted network of founders and investors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right form container */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex items-center justify-center bg-white">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};
