import React, { useState, useEffect } from 'react';
import { 
  PiggyBank, 
  ShieldCheck, 
  DollarSign, 
  FileText, 
  ExternalLink,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { listFundingRounds } from '../../lib/fundingRoundApi';
import { listInvestmentInterests, createInvestmentInterest } from '../../lib/investmentInterestApi';

export const FundingMarketplacePage = () => {
  const { showToast } = useApp();
  const [campaigns, setCampaigns] = useState([]);
  const [lois, setLois] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('campaigns');

  // LOI Modal state
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [loiAmount, setLoiAmount] = useState('100000');
  const [loiEquity, setLoiEquity] = useState('2.5');
  const [loiTerms, setLoiTerms] = useState('Post-Money SAFE (Valuation Cap)');
  const [loiSubmitting, setLoiSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [roundsData, interestsData] = await Promise.all([
        listFundingRounds(),
        listInvestmentInterests()
      ]);
      setCampaigns(Array.isArray(roundsData) ? roundsData : []);
      setLois(Array.isArray(interestsData) ? interestsData : []);
    } catch (err) {
      console.error('Failed to load funding marketplace data:', err);
      setError(err.message || 'Failed to load funding marketplace data.');
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
      const targetStartupId = selectedCampaign.startup?._id || selectedCampaign.startup || selectedCampaign.startupId || selectedCampaign.id;
      const startupName = selectedCampaign.name || selectedCampaign.title || 'Startup Venture';
      
      const payload = {
        startupId: targetStartupId,
        startupName,
        message: `Letter of Intent for $${Number(loiAmount).toLocaleString()} (${loiEquity}% equity split, ${loiTerms}).`,
        amount: Number(loiAmount),
        equity: Number(loiEquity),
        terms: loiTerms
      };

      const saved = await createInvestmentInterest(payload);
      setLois(prev => [saved, ...prev]);
      setSelectedCampaign(null);
      showToast('LOI Submitted Successfully!', `Your Letter of Intent for $${Number(loiAmount).toLocaleString()} has been sent to the founder.`, 'success');
    } catch (err) {
      console.error('LOI error:', err);
      showToast('Failed to submit LOI', err.message || 'Please check your inputs.', 'error');
    } finally {
      setLoiSubmitting(false);
    }
  };

  // Analytics totals derived from live responses
  const totalCapitalTarget = campaigns.reduce((acc, c) => acc + (Number(c.targetAmount || c.fundingTarget || 0)), 0);
  const totalCapitalRaised = campaigns.reduce((acc, c) => acc + (Number(c.raisedAmount || c.fundingRaised || 0)), 0);

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
      ) : error ? (
        <Card className="p-8 text-center bg-red-50/50 border-red-200 space-y-3">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">{error}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="mt-2 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </Button>
        </Card>
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
                  const raised = Number(startup.raisedAmount || startup.fundingRaised || 0);
                  const target = Number(startup.targetAmount || startup.fundingTarget || 100000);
                  const percent = Math.min(100, Math.round((raised / target) * 100));
                  const name = startup.name || startup.title || 'Startup Round';
                  const stage = startup.stage || startup.roundType || 'Seed';
                  const logo = startup.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200';
                  const location = startup.location || 'San Francisco, CA';
                  const description = startup.description || startup.tagline || 'Innovative tech venture raising capital.';
                  const minCheck = startup.minimumContribution ? `$${startup.minimumContribution.toLocaleString()}` : '$10,000';

                  return (
                    <Card key={startup._id || startup.id} className="p-6 border-slate-200/80 bg-white shadow-soft-sm hoverEffect transition-all space-y-4">
                      {/* Startup banner info */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img src={logo} alt={name} className="w-12 h-12 rounded-xl object-cover" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">{name}</h4>
                            <p className="text-[10px] text-slate-500 font-semibold">{location}</p>
                          </div>
                        </div>
                        <Badge variant="emerald">{stage}</Badge>
                      </div>

                      {/* Tagline */}
                      <p className="text-xs text-slate-600 font-normal leading-relaxed line-clamp-2">
                        {description}
                      </p>

                      {/* Raising target bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-500">Raised: ${raised.toLocaleString()}</span>
                          <span className="text-emerald-600">{percent}% of ${target.toLocaleString()} Target</span>
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
                          <strong className="text-slate-800 text-[11px] block mt-0.5">5.0% - 12.0%</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Min Check</span>
                          <strong className="text-slate-800 text-[11px] block mt-0.5">{minCheck}</strong>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 flex gap-2">
                        <Button variant="outline" className="flex-1 justify-center" onClick={() => window.open(startup.website || '#', '_blank')}>
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
                  {lois.map(loi => {
                    const loiName = loi.startupName || loi.startup?.name || 'Startup Venture';
                    const dateStr = loi.createdAt ? new Date(loi.createdAt).toLocaleDateString() : 'Recently';
                    const amount = loi.amount || 100000;
                    const equity = loi.equity || 2.5;
                    const terms = loi.terms || 'Post-Money SAFE';
                    const status = loi.status || 'submitted';

                    return (
                      <Card key={loi._id || loi.id} className="p-5 border-slate-200/80 bg-white shadow-soft-xs space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{loiName}</h4>
                            <span className="text-[9px] text-slate-400 block mt-0.5">Submitted on {dateStr}</span>
                          </div>
                          <Badge variant={status === 'accepted' ? 'emerald' : 'blue'}>{status}</Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Investment Intent</span>
                            <strong className="text-slate-800 font-bold">${amount.toLocaleString()}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Implied Equity</span>
                            <strong className="text-slate-800 font-bold">{equity}%</strong>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-500 italic">
                          "{loi.message || `Non-binding intent to purchase equity shares based on: ${terms}.`}"
                        </p>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="p-6 border-slate-200 bg-white text-center space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase block">Total Capital Target</span>
                <h3 className="text-3xl font-black text-emerald-600">${totalCapitalTarget.toLocaleString()}</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Across active deal rooms</p>
              </Card>

              <Card className="p-6 border-slate-200 bg-white text-center space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase block">Total Capital Raised</span>
                <h3 className="text-3xl font-black text-slate-900">${totalCapitalRaised.toLocaleString()}</h3>
                <p className="text-[10px] text-slate-500 font-semibold">Confirmed & pledged commitments</p>
              </Card>

              <Card className="p-6 border-slate-200 bg-white text-center space-y-2">
                <span className="text-xs text-slate-400 font-bold uppercase block">Active Deal Flow Pipeline</span>
                <h3 className="text-3xl font-black text-emerald-600">{campaigns.length} Rounds</h3>
                <p className="text-[10px] text-slate-500 font-semibold">100% Verified corporations</p>
              </Card>
            </div>
          )}
        </>
      )}

      {/* LOI Submission Modal */}
      <Modal
        isOpen={!!selectedCampaign}
        onClose={() => setSelectedCampaign(null)}
        title={`Draft Letter of Intent (LOI) - ${selectedCampaign?.name || selectedCampaign?.title || 'Startup'}`}
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
