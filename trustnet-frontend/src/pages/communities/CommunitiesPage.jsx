import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Bot, Rocket, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';

export const CommunitiesPage = () => {
  const { communities, setCommunities, showToast } = useApp();
  const navigate = useNavigate();

  const toggleJoin = (commId) => {
    setCommunities(prev => prev.map(c => {
      if (c.id === commId) {
        const isJoined = !c.isJoined;
        showToast(isJoined ? 'Joined Community' : 'Left Community', `Updated membership status for ${c.name}`, 'info');
        return {
          ...c,
          isJoined,
          membersCount: isJoined ? c.membersCount + 1 : c.membersCount - 1
        };
      }
      return c;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Communities Hub</h1>
          <p className="text-xs text-slate-500 mt-1">Connect with specialized peer groups, YC cohorts, and tech hubs</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {communities.map((comm) => (
          <Card key={comm.id} hoverEffect className="overflow-hidden border-slate-200 flex flex-col justify-between h-full">
            <div>
              <div className="h-28 w-full bg-slate-200 relative">
                <img src={comm.banner} alt={comm.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 right-3">
                  <Badge variant="emerald">{comm.category}</Badge>
                </div>
              </div>

              <div className="p-5">
                <h3
                  onClick={() => navigate(`/app/communities/${comm.id}`)}
                  className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                  {comm.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {comm.description}
                </p>
              </div>
            </div>

            <div className="px-5 pb-5 pt-0 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                {comm.membersCount} Members
              </span>

              <Button
                size="sm"
                variant={comm.isJoined ? 'secondary' : 'primary'}
                onClick={() => toggleJoin(comm.id)}
              >
                <span>{comm.isJoined ? 'Joined' : 'Join Community'}</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
