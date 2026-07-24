import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { 
  Rocket, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Users, 
  DollarSign, 
  Target, 
  Plus, 
  ShieldCheck, 
  Sparkles
} from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ProgressRing } from '../../components/ui/ProgressRing';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import * as startupApi from '../../lib/startupApi';
import { toCreatePayload, STAGE_OPTIONS, normalizeStartup } from '../../lib/adapters/startupAdapter';

export const CreateStartupPage = () => {
  const navigate = useNavigate();
  const { setStartups, showToast } = useApp();
  const { currentUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  // Blank by default -- this used to prefill a full fake example, which
  // meant "Publish" could succeed without the founder typing anything.
  const [formData, setFormData] = useState({
    name: '',
    tagline: '',
    logo: '',
    banner: '',
    industry: '',
    stage: 'idea',
    location: '',
    website: '',
    description: '',
    problem: '',
    solution: '',
    targetAudience: '',
    fundingTarget: 0,
    fundingRaised: 0,
    // Below: collected in the wizard for UX continuity, but the backend
    // Startup model has no columns for any of these -- not sent on
    // publish. Team invites belong to the Team module (not wired this
    // pass); story/mission/vision/businessModel/useOfFunds/milestones have
    // no backend equivalent at all.
    team: [
      { name: currentUser?.name || currentUser?.fullName || 'You', role: 'Founder & CEO', email: currentUser?.email || '', dept: 'Executive', access: 'Admin' }
    ],
    milestones: []
  });

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Senior Engineer');

  const updateField = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  const calculateCompletion = () => {
    let score = 0;
    if (formData.name && formData.tagline) score += 20;
    if (formData.story && formData.problem && formData.solution) score += 20;
    if (formData.team.length > 0) score += 20;
    if (formData.fundingTarget > 0) score += 20;
    if (formData.visibility) score += 20;
    return score;
  };

  const completionPercent = calculateCompletion();

  const handleAddTeamMember = (e) => {
    e.preventDefault();
    if (!newMemberEmail) return;
    setFormData(prev => ({
      ...prev,
      team: [
        ...prev.team,
        { name: newMemberEmail.split('@')[0], role: newMemberRole, email: newMemberEmail, dept: 'Engineering', access: 'Editor' }
      ]
    }));
    setNewMemberEmail('');
  };

  const handlePublish = async () => {
    setPublishError('');

    if (!formData.name || !formData.tagline) {
      setPublishError('Name and tagline are required.');
      setCurrentStep(1);
      return;
    }
    if (!formData.description || formData.description.trim().length < 50) {
      setPublishError('Description must be at least 50 characters (backend requirement).');
      setCurrentStep(2);
      return;
    }
    if (!formData.industry) {
      setPublishError('Industry/category is required.');
      setCurrentStep(1);
      return;
    }

    setIsPublishing(true);
    try {
      const payload = toCreatePayload(formData);
      const created = await startupApi.createStartup(payload);
      const normalized = normalizeStartup(created);
      setStartups(prev => [normalized, ...prev]);

      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      showToast('🚀 Startup Published Live!', `${normalized.name} is now live on the TrustNet directory.`, 'success');
      navigate(`/app/startups/${normalized.id}`);
    } catch (err) {
      setPublishError(err.message || 'Failed to publish startup.');
    } finally {
      setIsPublishing(false);
    }
  };

  const steps = [
    { num: 1, title: 'Basic Info' },
    { num: 2, title: 'Details' },
    { num: 3, title: 'Team' },
    { num: 4, title: 'Funding' },
    { num: 5, title: 'Publish' }
  ];

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto">
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/app/startups')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          <span>Back to Startups</span>
        </button>

        <div className="flex items-center gap-3">
          <Badge variant="emerald">5-Step Wizard</Badge>
          <span className="text-xs font-semibold text-slate-500">{completionPercent}% Completed</span>
        </div>
      </div>

      {/* Stepper Header */}
      <Card className="p-4 border-slate-200/80 bg-white">
        <div className="grid grid-cols-5 gap-2 text-center">
          {steps.map((step) => {
            const isActive = currentStep === step.num;
            const isDone = currentStep > step.num;
            return (
              <button
                key={step.num}
                onClick={() => setCurrentStep(step.num)}
                className={`p-3 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                    : isDone
                    ? 'bg-slate-50 border-slate-200 text-emerald-600'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-black">
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-emerald-600" strokeWidth={1.75} /> : step.num}
                </div>
                <span className="hidden sm:inline truncate">{step.title}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Split Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Wizard Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* STEP 1 */}
          {currentStep === 1 && (
            <Card className="p-6 border-slate-200/80 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Rocket className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 1: Basic Information</h2>
                  <p className="text-xs text-slate-500">Company identity and main presence details</p>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  label="Startup Name"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. NexusAI"
                  required
                />

                <Input
                  label="One-line Tagline"
                  value={formData.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="Autonomous AI workflow agents for enterprise operations"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Industry / Category"
                    value={formData.industry}
                    onChange={(e) => updateField('industry', e.target.value)}
                    placeholder="e.g. AI & SaaS, Fintech, HealthTech"
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Stage</label>
                    <select
                      value={formData.stage}
                      onChange={(e) => updateField('stage', e.target.value)}
                      className="w-full bg-slate-50/80 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    >
                      {STAGE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Location (City, Country)"
                    value={formData.location}
                    onChange={(e) => updateField('location', e.target.value)}
                  />
                  <Input
                    label="Website URL"
                    value={formData.website}
                    onChange={(e) => updateField('website', e.target.value)}
                  />
                </div>

                <Input
                  label="Logo URL"
                  value={formData.logo}
                  onChange={(e) => updateField('logo', e.target.value)}
                />
              </div>
            </Card>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <Card className="p-6 border-slate-200/80 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Target className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 2: Startup Details</h2>
                  <p className="text-xs text-slate-500">Explain your problem, solution, and target audience</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Description <span className="text-slate-400 normal-case">(min. 50 characters)</span>
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">{formData.description.length}/50 minimum</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Problem Statement</label>
                  <textarea
                    rows={3}
                    value={formData.problem}
                    onChange={(e) => updateField('problem', e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Solution</label>
                  <textarea
                    rows={3}
                    value={formData.solution}
                    onChange={(e) => updateField('solution', e.target.value)}
                    className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-3 text-sm text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <Card className="p-6 border-slate-200/80 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 3: Team Members</h2>
                  <p className="text-xs text-slate-500">Invite co-founders and set workspace access</p>
                </div>
              </div>

              <form onSubmit={handleAddTeamMember} className="flex gap-2">
                <Input
                  placeholder="Member email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="primary">
                  <Plus className="w-4 h-4" strokeWidth={1.75} />
                  <span>Invite</span>
                </Button>
              </form>

              <div className="space-y-3 pt-2">
                {formData.team.map((mem, idx) => (
                  <div key={idx} className="p-3 bg-slate-50/80 rounded-xl flex items-center justify-between border border-slate-200/80">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{mem.name}</h4>
                      <p className="text-[11px] text-slate-500">{mem.role} • {mem.email}</p>
                    </div>
                    <Badge variant="emerald">{mem.access}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && (
            <Card className="p-6 border-slate-200/80 space-y-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <DollarSign className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 4: Funding & Goals</h2>
                  <p className="text-xs text-slate-500">Specify round goals and fund utilization</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Target Funding ($ USD)"
                  type="number"
                  value={formData.fundingTarget}
                  onChange={(e) => updateField('fundingTarget', e.target.value)}
                />
                <Input
                  label="Amount Raised So Far ($ USD)"
                  type="number"
                  value={formData.fundingRaised}
                  onChange={(e) => updateField('fundingRaised', e.target.value)}
                />
              </div>
            </Card>
          )}

          {/* STEP 5 */}
          {currentStep === 5 && (
            <Card className="p-6 border-slate-200/80 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Step 5: Review & Publish</h2>
                  <p className="text-xs text-slate-500">Check all details before publishing live</p>
                </div>
                <ProgressRing progress={completionPercent} size={64} strokeWidth={6} />
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" strokeWidth={1.75} />
                  <span>TrustNet Verified Founder Status</span>
                </div>
                <p className="text-xs text-slate-600">
                  Publishing will index your startup deck for 500+ verified angel investors.
                </p>
              </div>

              {publishError && (
                <div className="p-3 text-xs bg-red-50 text-red-600 rounded-xl border border-red-200 font-medium">
                  {publishError}
                </div>
              )}

              <Button variant="primary" size="lg" className="w-full" onClick={handlePublish} isLoading={isPublishing}>
                <Rocket className="w-5 h-5" strokeWidth={1.75} />
                <span>Publish Startup Now</span>
              </Button>
            </Card>
          )}

          {/* Stepper Footer */}
          <div className="flex items-center justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
              <span>Previous</span>
            </Button>

            {currentStep < 5 && (
              <Button
                variant="primary"
                onClick={() => setCurrentStep(prev => Math.min(5, prev + 1))}
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4" strokeWidth={1.75} />
              </Button>
            )}
          </div>
        </div>

        {/* Right Sticky Column: REAL-TIME LIVE PREVIEW PANEL (5 Cols) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.75} />
                Live Startup Card Preview
              </span>
              <span className="text-[11px] text-emerald-600 font-semibold">Real-time</span>
            </div>

            <Card className="border-slate-200/80 bg-white hoverEffect">
              <div className="h-32 w-full bg-slate-100 relative">
                <img src={formData.banner} alt="Banner" className="w-full h-full object-cover" />
              </div>

              <div className="p-6 relative pt-0">
                <div className="flex items-end justify-between -mt-10 mb-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden border-4 border-white shadow-md bg-white">
                    <img src={formData.logo} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                  <Badge variant="emerald">{formData.stage}</Badge>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{formData.name || 'Startup Name'}</h3>
                  <p className="text-xs font-semibold text-slate-600 mt-1 line-clamp-2">{formData.tagline}</p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-500">Raised: ${Number(formData.fundingRaised).toLocaleString()}</span>
                      <span className="text-emerald-600">Goal: ${Number(formData.fundingTarget).toLocaleString()}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${Math.min(100, (formData.fundingRaised / formData.fundingTarget) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
