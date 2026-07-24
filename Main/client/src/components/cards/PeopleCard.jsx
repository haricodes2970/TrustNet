import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, MessageSquare, MapPin, Building, Briefcase } from 'lucide-react';
import { Card } from '../ui/Card';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';

export const PeopleCard = ({ user }) => {
  const navigate = useNavigate();
  const { updateConnectionStatus } = useApp();

  const isConnected = user.connectionStatus === 'connected';
  const isPending = user.connectionStatus === 'pending_sent';

  return (
    <Card hoverEffect className="group flex flex-col justify-between h-full p-5 border-slate-200">
      <div>
        {/* Header Avatar & Role */}
        <div className="flex items-start justify-between mb-4">
          <Avatar
            src={user.avatar}
            alt={user.name}
            size="lg"
            isVerified={user.isVerified}
          />
          <Badge
            variant={
              user.role === 'Founder' ? 'emerald' :
              user.role === 'Investor' ? 'purple' :
              user.role === 'Mentor' ? 'blue' : 'amber'
            }
          >
            {user.role}
          </Badge>
        </div>

        {/* User Details */}
        <h3
          onClick={() => navigate(`/app/people/${user.id}`)}
          className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer truncate"
        >
          {user.name}
        </h3>
        <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed min-h-[36px]">
          {user.headline}
        </p>

        {user.organization && (
          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-2 font-medium">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>{user.organization}</span>
          </p>
        )}

        {/* Skills Tag Pills */}
        <div className="flex flex-wrap gap-1 mt-3">
          {user.skills?.slice(0, 3).map((skill, idx) => (
            <span key={idx} className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-md">
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
        {isConnected ? (
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/app/messages')}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Message</span>
          </Button>
        ) : isPending ? (
          <Button
            size="sm"
            variant="outline"
            className="w-full text-slate-500"
            disabled
          >
            <Check className="w-3.5 h-3.5 text-emerald-500" />
            <span>Requested</span>
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="w-full"
            onClick={() => updateConnectionStatus(user.id, 'pending_sent')}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Connect</span>
          </Button>
        )}
      </div>
    </Card>
  );
};
