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

  if (!currentUser) return null;

  // Completion calculation derived strictly from existing backend User schema properties
  const tasks = [
    { 
      id: 'avatar_cover', 
      label: 'Upload Profile Photo & Banner', 
      done: !!currentUser.avatarUrl, 
      route: '/app/settings' 
    },
    { 
      id: 'headline_bio', 
      label: 'Add Headline & Bio', 
      done: !!(currentUser.designation && currentUser.bio), 
      route: '/app/settings' 
    },
    { 
      id: 'org_country', 
      label: 'Add Organization & Country', 
      done: !!currentUser.location, 
      route: '/app/settings' 
    },
    { 
      id: 'kyc', 
      label: 'Complete Identity Verification', 
      done: currentUser.verificationStatus === 'approved', 
      route: '/verification' 
    },
    { 
      id: 'pitch_deck', 
      label: 'Upload Startup Pitch Deck', 
      done: false, // Pitch deck field does not exist in backend schema (BACKEND GAP)
      route: '/app/settings' 
    },
    { 
      id: 'socials', 
      label: 'Connect GitHub & LinkedIn', 
      done: !!currentUser.linkedin, 
      route: '/app/settings' 
    }
  ];

  const completedCount = tasks.filter(t => t.done).length;
  const percentage = Math.round((completedCount / tasks.length) * 100);

  // Find the first uncompleted task as recommended next action
  const nextAction = tasks.find(t => !t.done);

  return (
    <Card className="p-5 border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-white shadow-soft-sm">
      <div className="flex items-center gap-4 mb-4">
        <ProgressRing percentage={percentage} size={68} strokeWidth={7} />
        <div>
          <h4 className="text-sm font-bold text-slate-900">
            Profile Strength: {percentage === 100 ? 'Complete' : percentage >= 60 ? 'High' : 'Moderate'}
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {percentage === 100 
              ? 'Excellent! Your profile details are fully configured.' 
              : 'Complete remaining steps to boost trust and platform discovery.'}
          </p>
        </div>
      </div>

      <div className="space-y-2.5 mb-4 border-t border-slate-100 pt-3">
        {tasks.map((task, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className={`flex items-center gap-2 ${task.done ? 'text-slate-500 line-through' : 'text-slate-800 font-semibold'}`}>
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

      {nextAction && (
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs font-bold"
          onClick={() => navigate(nextAction.route)}
        >
          <span>Recommended: {nextAction.label}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      )}
    </Card>
  );
};
