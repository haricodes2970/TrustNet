import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, DollarSign, Calendar, Bookmark, ArrowRight, Building } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';

export const OpportunityCard = ({ opportunity }) => {
  const navigate = useNavigate();
  const { toggleBookmark, showToast } = useApp();

  return (
    <Card hoverEffect className="p-5 border-slate-200 flex flex-col justify-between h-full">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <img
              src={opportunity.logo}
              alt={opportunity.organization}
              className="w-10 h-10 rounded-xl object-cover border border-slate-100 shadow-xs"
            />
            <div>
              <h3
                onClick={() => navigate(`/app/opportunities/${opportunity.id}`)}
                className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors cursor-pointer"
              >
                {opportunity.title}
              </h3>
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" />
                {opportunity.organization}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleBookmark('opportunity', opportunity.id)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-slate-100"
          >
            <Bookmark className={`w-4 h-4 ${opportunity.isBookmarked ? 'fill-emerald-500 text-emerald-500' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="emerald">{opportunity.type}</Badge>
          <Badge variant="slate" className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {opportunity.location}
          </Badge>
        </div>

        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
          {opportunity.description}
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
          {opportunity.salary}
        </span>
        <Button
          size="sm"
          variant="primary"
          onClick={() => showToast('Application Submitted', `Applied for ${opportunity.title}`, 'success')}
        >
          <span>Apply Now</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
};
