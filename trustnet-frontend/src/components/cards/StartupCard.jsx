import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, MapPin, Users, TrendingUp, ExternalLink, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';

export const StartupCard = ({ startup }) => {
  const navigate = useNavigate();
  const { toggleBookmark } = useApp();

  const progressPercent = startup.fundingTarget
    ? Math.min(100, Math.round((startup.fundingRaised / startup.fundingTarget) * 100))
    : 0;

  return (
    <Card hoverEffect className="group flex flex-col justify-between h-full border-slate-200/90">
      <div>
        {/* Banner & Logo */}
        <div className="relative h-28 w-full bg-gradient-to-br from-emerald-500/20 to-slate-200 overflow-hidden">
          {startup.banner && (
            <img
              src={startup.banner}
              alt={startup.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark('startup', startup.id);
            }}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-md text-slate-700 hover:text-emerald-600 hover:bg-white shadow-soft-sm transition-all"
          >
            <Bookmark className={`w-4 h-4 ${startup.isBookmarked ? 'fill-emerald-500 text-emerald-500' : ''}`} />
          </button>

          <div className="absolute bottom-3 left-4 flex items-center gap-2">
            <Badge variant="emerald">{startup.stageLabel || startup.stage}</Badge>
            {startup.industry && (
              <Badge variant="slate" className="bg-white/90 text-slate-800 backdrop-blur-sm">
                {startup.industry}
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5">
          {/* Logo & Title */}
          <div className="flex items-start gap-3.5 mb-3">
            {startup.logo ? (
              <img
                src={startup.logo}
                alt={startup.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-white shadow-soft-sm -mt-8 relative z-10 bg-white"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl ring-2 ring-white shadow-soft-sm -mt-8 relative z-10 bg-emerald-500 text-white flex items-center justify-center text-sm font-bold">
                {startup.name?.charAt(0) || '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3
                onClick={() => navigate(`/app/startups/${startup.id}`)}
                className="text-base font-bold text-slate-900 hover:text-emerald-600 transition-colors truncate cursor-pointer"
              >
                {startup.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                {startup.location}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
            {startup.tagline}
          </p>

          {/* Funding Progress */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-slate-500">Raised: ${(startup.fundingRaised / 1000).toFixed(0)}k</span>
              <span className="text-emerald-600 font-bold">{progressPercent}% of ${(startup.fundingTarget / 1000).toFixed(0)}k</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Tech Stack Pills -- backend has no techStack field; only
              renders when present (e.g. future data), never fabricated */}
          {startup.techStack?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {startup.techStack.slice(0, 3).map((tech, idx) => (
                <span key={idx} className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-600 rounded-md">
                  {tech}
                </span>
              ))}
              {startup.techStack.length > 3 && (
                <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-400 rounded-md">
                  +{startup.techStack.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pb-5 pt-0 flex items-center justify-between gap-2 border-t border-slate-100/60 mt-2">
        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
          {startup.teamSize !== undefined ? (
            <>
              <Users className="w-3.5 h-3.5 text-slate-400" />
              {startup.teamSize} members
            </>
          ) : (
            <span className="text-slate-400">{startup.status || ''}</span>
          )}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/app/startups/${startup.id}`)}
          className="group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500"
        >
          <span>View Startup</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </Card>
  );
};
