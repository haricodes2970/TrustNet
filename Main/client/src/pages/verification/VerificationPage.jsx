import React, { useState } from 'react';
import { ShieldCheck, Upload, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';

export const VerificationPage = () => {
  const { showToast } = useApp();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    showToast('Verification Application Submitted', 'Your Y Combinator / Founder proof is being reviewed.', 'success');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Identity & Founder Verification</h1>
        <p className="text-xs text-slate-500 mt-1">Get your verified green checkmark badge to boost deal flow trust</p>
      </div>

      <Card className="p-6 border-slate-200">
        <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-200 mb-6">
          <ShieldCheck className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-emerald-950">Y Combinator W24 Badge: Verified</h3>
            <p className="text-xs text-emerald-700">Your founder credential was authenticated on Mar 30, 2024.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Credential Type</label>
            <select className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5">
              <option>Y Combinator Batch Alumni</option>
              <option>Accredited Investor / VC Firm Partner</option>
              <option>Techstars / 500 Global Graduate</option>
            </select>
          </div>

          <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl text-center bg-slate-50">
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <span className="text-xs font-bold text-slate-700 block">Upload Verification Document / Acceptance Email</span>
            <span className="text-[11px] text-slate-400">PDF, PNG, JPG up to 10MB</span>
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full">
            Submit Proof for Review
          </Button>
        </form>
      </Card>
    </div>
  );
};
