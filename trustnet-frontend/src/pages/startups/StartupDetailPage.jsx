import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin,
  FileText,
  Share2,
  ArrowLeft
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import * as startupApi from '../../lib/startupApi';
import { normalizeStartup } from '../../lib/adapters/startupAdapter';

export const StartupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useApp();

  const [startup, setStartup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError('');
      try {
        const raw = await startupApi.getStartup(id);
        if (!cancelled) setStartup(normalizeStartup(raw));
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading startup…</p>;
  }

  if (error || !startup) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || 'Startup not found.'}</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/app/startups')}>
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Startups</span>
        </Button>
      </div>
    );
  }

  const progressPercent = startup.fundingTarget
    ? Math.min(100, Math.round((startup.fundingRaised / startup.fundingTarget) * 100))
    : 0;

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/app/startups')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Startups</span>
      </button>

      {/* Banner & Header */}
      <Card className="overflow-hidden border-slate-200">
        <div className="h-56 sm:h-72 w-full bg-gradient-to-br from-emerald-500/20 to-slate-300 relative">
          {startup.banner && <img src={startup.banner} alt={startup.name} className="w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-white/90 text-slate-800 backdrop-blur-md"
              onClick={() => showToast('Link Copied', 'Startup link copied.', 'info')}
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        <div className="p-6 sm:p-8 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              {startup.logo ? (
                <img src={startup.logo} alt={startup.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-soft-md bg-white" />
              ) : (
                <div className="w-20 h-20 rounded-2xl ring-4 ring-white shadow-soft-md bg-emerald-500 text-white flex items-center justify-center text-2xl font-bold">
                  {startup.name?.charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{startup.name}</h1>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  {startup.location || 'Location not set'}
                  {startup.foundedYear && ` • Founded ${startup.foundedYear}`}
                </p>
              </div>
            </div>

            {startup.pitchDeckUrl && (
              <div className="flex items-center gap-3">
                <Button variant="primary" size="md" onClick={() => window.open(startup.pitchDeckUrl, '_blank', 'noopener')}>
                  <FileText className="w-4 h-4" />
                  <span>View Pitch Deck</span>
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="emerald">{startup.stageLabel}</Badge>
            {startup.industry && <Badge variant="slate">{startup.industry}</Badge>}
            {startup.status && <Badge variant="blue">{startup.status}</Badge>}
          </div>

          <p className="text-sm text-slate-700 leading-relaxed max-w-4xl font-normal">
            {startup.description}
          </p>
        </div>
      </Card>

      {/* Funding Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <Card className="p-6 border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Funding Progress</h3>
            <div className="flex items-center justify-between text-sm font-semibold mb-2">
              <span className="text-slate-600">Raised ${(startup.fundingRaised / 1000).toFixed(0)}k</span>
              <span className="text-emerald-600 font-bold">
                {startup.fundingTarget ? `${progressPercent}% of $${(startup.fundingTarget / 1000).toFixed(0)}k Goal` : 'No funding goal set'}
              </span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </Card>

          {(startup.problemStatement || startup.solution) && (
            <Card className="p-6 border-slate-200 space-y-4">
              <h3 className="text-base font-bold text-slate-900">Problem & Solution</h3>
              {startup.problemStatement && (
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Problem</span>
                  <p className="text-sm text-slate-700 mt-1">{startup.problemStatement}</p>
                </div>
              )}
              {startup.solution && (
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Solution</span>
                  <p className="text-sm text-slate-700 mt-1">{startup.solution}</p>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Founder</h3>
            {/* This backend doesn't populate `founder` into a full profile
                (GET /users/:id is an unimplemented stub) -- showing the id
                only, not fabricating a name/avatar/headline. */}
            <p className="text-xs text-slate-500">Founder ID: {startup.founderId || 'Unknown'}</p>
          </Card>

          {startup.tags?.length > 0 && (
            <Card className="p-6 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-3">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {startup.tags.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg">
                    {t}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {startup.website && (
            <Card className="p-6 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 mb-3">Website</h3>
              <a href={startup.website} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 font-semibold hover:underline break-all">
                {startup.website}
              </a>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
