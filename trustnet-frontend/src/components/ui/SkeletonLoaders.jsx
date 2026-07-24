import React from 'react';
import { Skeleton } from './Skeleton';
import { Card } from './Card';

export const SkeletonPage = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 animate-pulse">
      <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 border-slate-200 dark:border-slate-800 space-y-3">
            <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-8 w-32 bg-slate-300 dark:bg-slate-700 rounded-lg" />
          </Card>
        ))}
      </div>

      <Card className="p-8 border-slate-200 dark:border-slate-800 h-64 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </Card>
    </div>
  );
};
