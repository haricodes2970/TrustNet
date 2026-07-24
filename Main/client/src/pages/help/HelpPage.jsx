import React from 'react';
import { HelpCircle, FileText, Search, MessageSquare, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';

export const HelpPage = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Help Center & Ecosystem FAQs</h1>
        <p className="text-xs text-slate-500 mt-1">Search tutorials, pitch guidelines, and platform documentation</p>
      </div>

      <Input icon={Search} placeholder="Search knowledge base articles..." />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Founder Verification Guide</h3>
          <p className="text-xs text-slate-500">How to authenticate Y Combinator, Techstars, and angel investor status.</p>
        </Card>

        <Card className="p-5 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Pitch Deck Security</h3>
          <p className="text-xs text-slate-500">Learn about confidential deck views and watermark settings.</p>
        </Card>
      </div>
    </div>
  );
};
