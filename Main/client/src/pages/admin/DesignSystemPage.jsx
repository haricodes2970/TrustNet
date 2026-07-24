import React from 'react';
import { Palette, Layers, Sparkles, CheckCircle2, ShieldCheck, Rocket } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { ProgressRing } from '../../components/ui/ProgressRing';

export const DesignSystemPage = () => {
  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
          <Palette className="w-8 h-8 text-emerald-500" />
          Production Design System
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Complete UI component library, tokens, color system, and accessibility guidelines for TrustNet.
        </p>
      </div>

      {/* 1. Color Palette */}
      <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Color Tokens</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-16 bg-emerald-500 rounded-xl shadow-md" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Emerald 500 (Primary)</span>
            <span className="text-[10px] text-slate-400 font-mono">#10B981</span>
          </div>

          <div className="space-y-2">
            <div className="h-16 bg-slate-900 rounded-xl shadow-md" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Slate 900 (Obsidian Base)</span>
            <span className="text-[10px] text-slate-400 font-mono">#0F172A</span>
          </div>

          <div className="space-y-2">
            <div className="h-16 bg-indigo-600 rounded-xl shadow-md" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Indigo 600 (Accent)</span>
            <span className="text-[10px] text-slate-400 font-mono">#4F46E5</span>
          </div>

          <div className="space-y-2">
            <div className="h-16 bg-amber-500 rounded-xl shadow-md" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Amber 500 (Warning)</span>
            <span className="text-[10px] text-slate-400 font-mono">#F59E0B</span>
          </div>
        </div>
      </Card>

      {/* 2. Button Variants */}
      <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Buttons & Controls</h3>

        <div className="flex flex-wrap items-center gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="primary" isLoading>Loading State</Button>
        </div>
      </Card>

      {/* 3. Badges */}
      <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Badges & Status Tags</h3>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="emerald">Emerald Status</Badge>
          <Badge variant="blue">Blue Badge</Badge>
          <Badge variant="indigo">Indigo Stage</Badge>
          <Badge variant="amber">Pending Action</Badge>
          <Badge variant="rose">Critical Priority</Badge>
          <Badge variant="slate">Default Tag</Badge>
        </div>
      </Card>

      {/* 4. Progress Rings & Indicators */}
      <Card className="p-6 border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Progress Rings</h3>

        <div className="flex items-center gap-8">
          <ProgressRing progress={94} size={64} strokeWidth={6} />
          <ProgressRing progress={65} size={64} strokeWidth={6} />
          <ProgressRing progress={40} size={64} strokeWidth={6} />
        </div>
      </Card>
    </div>
  );
};
