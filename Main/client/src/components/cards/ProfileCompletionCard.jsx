import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { ProgressRing } from '../ui/ProgressRing';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

export const ProfileCompletionCard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const completionTasks = [
    { label: 'Upload Profile Photo & Banner', done: true },
    { label: 'Add Headline & Bio', done: true },
    { label: 'Add Organization & Country', done: true },
    { label: 'Verify Founder/YC Credential', done: true },
    { label: 'Upload Startup Pitch Deck', done: false },
    { label: 'Connect GitHub & LinkedIn', done: false },
  ];

  return (
    <Card className="p-5 border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-soft-sm">
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing percentage={currentUser.profileCompletion || 85} size={68} strokeWidth={7} />
        <div>
          <h4 className="text-sm font-bold text-slate-900">Profile Strength: High</h4>
          <p className="text-xs text-slate-500 mt-0.5">Complete remaining steps to boost founder discovery by 3.5x.</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {completionTasks.slice(3, 6).map((task, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs py-1">
            <span className={`flex items-center gap-2 ${task.done ? 'text-slate-600 line-through' : 'text-slate-800 font-medium'}`}>
              {task.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              )}
              {task.label}
            </span>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50"
        onClick={() => navigate('/app/settings')}
      >
        <span>Complete Profile</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </Card>
  );
};
