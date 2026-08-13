import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MapPin, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Share2, 
  ArrowLeft,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { listFundingRounds } from '../../lib/fundingRoundApi';
import { createInvestmentInterest } from '../../lib/investmentInterestApi';

export const StartupDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { startups, showToast } = useApp();
  
  const startup = startups.find(s => s.id === id) || startups[0];
  const [isPitchDeckOpen, setIsPitchDeckOpen] = useState(false);
  const [isInvestModalOpen, setIsInvestModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(1);
  const [interestMessage, setInterestMessage] = useState('');
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [fundingRound, setFundingRound] = useState(null);

  useEffect(() => {
    const fetchRound = async () => {
      try {
        const rounds = await listFundingRounds({ startupId: startup.id });
        if (Array.isArray(rounds) && rounds.length > 0) {
          setFundingRound(rounds[0]);
        }
      } catch (err) {
        console.error('Failed to fetch funding round:', err);
      }
    };
    fetchRound();
  }, [startup.id]);

  const raised = fundingRound?.raisedAmount ?? startup.fundingRaised;
  const target = fundingRound?.targetAmount ?? startup.fundingTarget;
  const progressPercent = Math.min(100, Math.round((raised / target) * 100));

  const handleSendInterest = async (e) => {
    e.preventDefault();
    setSubmittingInterest(true);
    try {
      await createInvestmentInterest({
        startupId: startup.id,
        startupName: startup.name,
        message: interestMessage || `Expressed investment interest in ${startup.name}.`
      });
      showToast('Interest Submitted!', `Your investment request has been sent to ${startup.name}.`, 'success');
      setIsInvestModalOpen(false);
      setInterestMessage('');
    } catch (err) {
      console.error(err);
      showToast('Submission Failed', err.message || 'Could not send investment interest.', 'error');
    } finally {
      setSubmittingInterest(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <button
        onClick={() => navigate('/app/startups')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Startups</span>
      </button>

      {/* Banner & Header */}
      <Card className="overflow-hidden border-slate-200">
        <div className="h-56 sm:h-72 w-full bg-slate-200 relative">
          <img src={startup.banner} alt={startup.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <Button variant="outline" size="sm" className="bg-white/90 text-slate-800 backdrop-blur-md" onClick={() => showToast('Link Copied', 'Copied pitch deal room link.', 'info')}>
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        <div className="p-6 sm:p-8 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 mb-6">
            <div className="flex items-end gap-4">
              <img src={startup.logo} alt={startup.name} className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-soft-md bg-white" />
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900">{startup.name}</h1>
                <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  {startup.location} • Founded {startup.foundedYear}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" size="md" onClick={() => setIsPitchDeckOpen(true)}>
                <FileText className="w-4 h-4 mr-1.5" />
                <span>View Pitch Deck</span>
              </Button>
              <Button variant="primary" size="md" onClick={() => setIsInvestModalOpen(true)}>
                <DollarSign className="w-4 h-4 mr-1.5" />
                <span>Express Investment Interest</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="emerald">{startup.stage}</Badge>
            <Badge variant="slate">{startup.industry}</Badge>
            <Badge variant="blue">Valuation {startup.valuation}</Badge>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed max-w-4xl font-normal">
            {startup.description}
          </p>
        </div>
      </Card>

      {/* Funding Progress & Cap Table Info */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Funding Card */}
          <Card className="p-6 border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Seed Funding Progress</h3>
            <div className="flex items-center justify-between text-sm font-semibold mb-2">
              <span className="text-slate-600">Raised ${(raised / 1000).toFixed(0)}k</span>
              <span className="text-emerald-600 font-bold">{progressPercent}% of ${(target / 1000).toFixed(0)}k Target</span>
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
          </Card>

          {/* Roadmap & Milestones Timeline */}
          <Card className="p-6 border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-6">Milestones & Roadmap</h3>
            <div className="space-y-6">
              {startup.milestones.map((m, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${m.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-600">{m.date}</span>
                      <Badge variant={m.status === 'completed' ? 'emerald' : 'slate'} size="sm">
                        {m.status}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{m.title}</h4>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Founder & Tech Stack Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Founder & Leadership</h3>
            <div className="flex items-center gap-3 mb-4">
              <Avatar src={startup.founder.avatar} alt={startup.founder.name} size="md" isVerified />
              <div>
                <h4 className="text-sm font-bold text-slate-900">{startup.founder.name}</h4>
                <p className="text-xs text-slate-500">{startup.founder.headline}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => navigate(`/app/people/${startup.founder.id}`)}>
              View Founder Profile
            </Button>
          </Card>

          <Card className="p-6 border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-3">Technology Stack</h3>
            <div className="flex flex-wrap gap-1.5">
              {startup.techStack.map((t, idx) => (
                <span key={idx} className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 rounded-lg">
                  {t}
                </span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Express Investment Interest Modal */}
      <Modal
        isOpen={isInvestModalOpen}
        onClose={() => setIsInvestModalOpen(false)}
        title={`Express Investment Interest - ${startup.name}`}
        subtitle="Submit your investment thesis or check request to the founder"
      >
        <form onSubmit={handleSendInterest} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Message to Founders</label>
            <textarea
              rows={4}
              value={interestMessage}
              onChange={(e) => setInterestMessage(e.target.value)}
              placeholder="Describe your fund, check size, or valuation expectations..."
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => setIsInvestModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={submittingInterest}>
              <span>Submit Proposal</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pitch Deck PDF Viewer Modal */}
      <Modal
        isOpen={isPitchDeckOpen}
        onClose={() => setIsPitchDeckOpen(false)}
        title={`${startup.name} - Pitch Deck (PDF)`}
        subtitle="Confidential Investor Pitch Slides"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="aspect-[16/9] bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white p-8 relative overflow-hidden">
            <div className="text-center space-y-3">
              <Badge variant="emerald">SLIDE {currentSlide} OF 10</Badge>
              <h2 className="text-3xl font-black text-white">{startup.name} Confidential Pitch</h2>
              <p className="text-sm text-slate-300 max-w-lg mx-auto">
                {currentSlide === 1 && "Problem: Enterprise workflows are fragmented across legacy tools."}
                {currentSlide === 2 && "Solution: TrustNet Autonomous AI Agents & Verification."}
                {currentSlide === 3 && "Market Traction: High growth across enterprise accounts."}
                {currentSlide > 3 && `Slide ${currentSlide}: Financial Projections & Unit Economics.`}
              </p>
            </div>

            {/* Slide Navigation Buttons */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                disabled={currentSlide === 1}
                onClick={() => setCurrentSlide(c => c - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev Slide</span>
              </Button>

              <span className="text-xs text-slate-400 font-mono">PDF Viewer Mode</span>

              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                disabled={currentSlide === 10}
                onClick={() => setCurrentSlide(c => c + 1)}
              >
                <span>Next Slide</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
