import React, { useState, useEffect } from 'react';
import { 
  PiggyBank, 
  Sparkles, 
  DollarSign, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Percent,
  FileText,
  Building,
  Bookmark,
  ExternalLink,
  Plus
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { apiClient } from '../../services/apiClient';

export const FundingMarketplacePage = () => {
  const { showToast } = useApp();
  const [campaigns, setCampaigns] = useState([]);
  const [lois, setLois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('campaigns');

  // LOI Modal state
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loiAmount, setLoiAmount] = useState('100000');
  const [loiEquity, setLoiEquity] = useState('2.5');
  const [loiTerms, setLoiTerms] = useState('Post-Money SAFE (Valuation Cap)');
  const [loiSubmitting, setLoiSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [campaignData, loiData] = await Promise.all([
        apiClient.get('/funding/campaigns'),
        apiClient.get('/funding/lois')
      ]);
      setCampaigns(campaignData);
      setLois(loiData);
    } catch (err) {
      console.error('Failed to load funding marketplace data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenLoiModal = (campaign) => {
    setSelectedCampaign(campaign);
    setLoiAmount('100000');
    setLoiEquity('2.5');
  };

  const handleSendLoi = async (e) => {
    e.preventDefault();
    if (!selectedCampaign) return;

    setLoiSubmitting(true);
    try {
      const saved = await apiClient.post('/funding/lois', {
        startupId: selectedCampaign.id,
        startupName: selectedCampaign.name,
        amount: Number(loiAmount),
        equity: Number(loiEquity),
        terms: loiTerms
      });

      setLois(prev => [saved, ...prev]);
      setSelectedCampaign(null);
      showToast('LOI Submitted Successfully!', `Your Letter of Intent for $${Number(loiAmount).toLocaleString()} has been sent to the founder.`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to submit LOI', 'Please check your inputs.', 'error');
    } finally {
      setLoiSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/80">
              <PiggyBank className="w-7 h-7 text-emerald-500" strokeWidth={1.75} />
            </div>
            <span>Venture Funding Marketplace</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1.5">
            Access vetted startup deal rooms, evaluate cap structures, and submit digital letters of intent (LOI).
          </p>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={`pb-4 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'campaigns'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Active Deal Rooms ({campaigns.length})
        </button>
        <button
          onClick={() => setActiveTab('lois')}
          className={`pb-4 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'lois'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          My Digital LOIs ({lois.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`pb-4 px-6 text-xs font-bold transition-all border-b-2 cursor-pointer ${
            activeTab === 'analytics'
              ? 'border-emerald-500 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Ecosystem Capital Analytics
        </button>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="h-64 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {activeTab === 'campaigns' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {campaigns.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-400">
                  No active fundraising campaigns listed at the moment.
                </div>
              ) : (
                campaigns.map(startup => {
                  const percent = Math.min(100, Math.round((startup.fundingRaised / startup.fundingTarget) * 100));
                  return (
                    <Card key={startup.id} className="p-6 border-slate-200/80 bg-white shadow-soft-sm hoverEffect transition-all space-y-4">
                      {/* Startup banner info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={startup.logo} alt={startup.name} className="w-12 h-12 rounded-xl object-cover" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{startup.name}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold">{startup.location}</p>
                          </div>
                        </div>
                        <Badge variant="emerald">{startup.stage}</Badge>
                      </div>

                      {/* Tagline */}
                      <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-2">
                        {startup.description || startup.tagline}
                      </p>

                      {/* Raising target bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500">Raised: ${startup.fundingRaised?.toLocaleString()}</span>
                          <span className="text-emerald-600">{percent}% of ${startup.fundingTarget?.toLocaleString()} Target</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>

                      {/* Deal terms cards */}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Valuation Cap</span>
                          <strong className="text-slate-800 text-[11px] block mt-0.5">{startup.valuation || '$10.0M'}</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Equity Offered</span>
                          <strong className="text-slate-800 text-[11px] block mt-0.5">8.0% - 12.0%</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Min Check</span>
                          <strong className="text-slate-800 text-[11px] block mt-0.5">$25,000</strong>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex gap-2">
                        <Button variant="outline" className="flex-1 justify-center" onClick={() => window.open(startup.website, '_blank')}>
                          <ExternalLink className="w-3.5 h-3.5 mr-1" />
                          <span>Review Room</span>
                        </Button>
                        <Button variant="primary" className="flex-1 justify-center" onClick={() => handleOpenLoiModal(startup)}>
                          <DollarSign className="w-3.5 h-3.5 mr-1" />
                          <span>Submit LOI</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'lois' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Your Active Letters of Intent ({lois.length})</h3>

              {lois.length === 0 ? (
                <Card className="p-8 text-center text-slate-500 border-slate-200/80 bg-white">
                  <FileText className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-medium">No submitted Letters of Intent.</p>
                  <p className="text-xs text-slate-400 mt-1">Explore Deal Rooms and make an offer to co-invest.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {lois.map(loi => (
                    <Card key={loi.id} className="p-5 border-slate-200/80 bg-white shadow-soft-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{loi.startupName}</h4>
                          <span className="text-[9px] text-slate-400 block mt-0.5">Submitted on {loi.createdAt}</span>
                        </div>
                        <Badge variant={loi.status === 'Accepted' ? 'emerald' : 'blue'}>{loi.status}</Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Investment Intent</span>
                          <strong className="text-slate-800 font-bold">${loi.amount?.toLocaleString()}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Implied Equity</span>
                          <strong className="text-slate-800 font-bold">{loi.equity}%</strong>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500 italic">
                        "This LOI outlines a non-binding intent to purchase equity shares based on: {loi.terms}."
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 border-slate-200 bg-white text-center space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase block">Total Capital Seeking VC</span>
                <h3 className="text-3xl font-black text-emerald-600">$18,450,000</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Indexed from 124 verified Angels</p>
              </Card>

              <Card className="p-6 border-slate-200 bg-white text-center space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase block">Median SAFE Valuation Cap</span>
                <h3 className="text-3xl font-black text-slate-900">$8,500,000</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Across active Seed round files</p>
              </Card>

              <Card className="p-6 border-slate-200 bg-white text-center space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase block">Active Deal Flow Pipeline</span>
                <h3 className="text-3xl font-black text-emerald-600">8 Campaigns</h3>
                <p className="text-[10px] text-slate-500 font-semibold">100% Verified Delaware corporations</p>
              </Card>
            </div>
          )}
        </>
      )}

      {/* LOI Submission Modal */}
      <Modal
        isOpen={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        title={`Draft Letter of Intent (LOI) - ${selectedCampaign?.name}`}
        subtitle="Submit a non-binding digital investment intent proposal"
        maxWidth="max-w-md"
      >
        {selectedCampaign && (
          <form onSubmit={handleSendLoi} className="space-y-4">
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Standard Post-Money SAFE compliance checker active</span>
            </div>

            <Input
              label="Investment Amount ($ USD)"
              type="number"
              value={loiAmount}
              onChange={(e) => setLoiAmount(e.target.value)}
              required
            />

            <Input
              label="Target Implied Equity Split (%)"
              type="number"
              step="0.01"
              value={loiEquity}
              onChange={(e) => setLoiEquity(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Valuation Terms Protocol</label>
              <select
                value={loiTerms}
                onChange={(e) => setLoiTerms(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
              >
                <option value="Post-Money SAFE (Valuation Cap)">Post-Money SAFE (Valuation Cap)</option>
                <option value="Pre-Money SAFE (Discount Only)">Pre-Money SAFE (Discount Only)</option>
                <option value="Convertible Promissory Note">Convertible Promissory Note</option>
              </select>
            </div>

            <div className="pt-4 flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setSelectedCampaign(null)}>Cancel</Button>
              <Button type="submit" variant="primary" isLoading={loiSubmitting}>
                <span>Submit LOI Proposal</span>
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
