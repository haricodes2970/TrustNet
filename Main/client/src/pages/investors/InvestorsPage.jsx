import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, RefreshCw, Users, ShieldAlert } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { listInvestors } from '../../lib/investorApi';
import { createInvestmentInterest } from '../../lib/investmentInterestApi';

export const InvestorsPage = () => {
  const { currentUser } = useAuth();
  const { startups, showToast } = useApp();
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthError, setIsAuthError] = useState(false);

  const [selectedInvestor, setSelectedInvestor] = useState(null);
  const [pitchNote, setPitchNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchInvestors = async () => {
    setLoading(true);
    setError(null);
    setIsAuthError(false);
    try {
      const data = await listInvestors();
      setInvestors(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching investors:', err);
      if (err.status === 401 || err.status === 403) {
        setIsAuthError(true);
        setError('Authentication required to access investor directory.');
      } else {
        setError(err.message || 'Failed to load investor directory.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestors();
  }, []);

  const handleBookMeeting = async (e) => {
    e.preventDefault();
    if (!selectedInvestor) return;

    setSubmitting(true);
    try {
      const myStartup = startups.find(s => 
        (s.founder && (s.founder === currentUser?.id || s.founder._id === currentUser?.id || s.founder === currentUser?._id))
      ) || startups[0];
      const targetStartupId = myStartup ? (myStartup._id || myStartup.id) : 'stp_1';
      const targetStartupName = myStartup ? myStartup.name : 'Nexus AI';

      await createInvestmentInterest({
        startupId: targetStartupId,
        startupName: targetStartupName,
        message: pitchNote || `Pitch meeting requested with ${selectedInvestor.name || selectedInvestor.user?.fullName || selectedInvestor.organization || 'Investor'}.`
      });
      showToast('Pitch Meeting Requested', `Sent pitch proposal to ${selectedInvestor.name || selectedInvestor.user?.fullName || selectedInvestor.organization || 'investor'}.`, 'success');
      setSelectedInvestor(null);
      setPitchNote('');
    } catch (err) {
      console.error('Failed to submit interest:', err);
      showToast('Submission Failed', err.message || 'Could not send pitch request.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Investor Directory</h1>
        <p className="text-xs text-slate-500 mt-1">Connect with active VCs writing check sizes from $100k to $5M</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-56 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center bg-red-50/50 border-red-200 space-y-3">
          {isAuthError ? <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" /> : <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />}
          <p className="text-sm font-semibold text-slate-800">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchInvestors} className="mt-2 inline-flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading</span>
          </Button>
        </Card>
      ) : investors.length === 0 ? (
        <Card className="p-12 text-center text-slate-400 space-y-3 bg-white border-slate-200">
          <Users className="w-12 h-12 mx-auto text-slate-300" />
          <h3 className="text-sm font-bold text-slate-700">No Investors Found</h3>
          <p className="text-xs text-slate-500">There are currently no active investor profiles listed in the directory.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {investors.map((inv) => {
            const invName = inv.name || inv.user?.fullName || inv.user?.name || inv.organization || 'Anonymous Investor';
            const invAvatar = inv.avatar || inv.user?.avatarUrl || inv.user?.avatar;
            const invOrg = inv.organization || 'Venture Partner';
            const invBio = inv.investmentThesis || inv.user?.bio || inv.bio || 'Active investor evaluating seed & early-stage opportunities.';
            const checkSize = inv.checkSize || '$500k - $2M';
            const tags = inv.preferredIndustries || inv.interests || ['Tech', 'SaaS'];

            return (
              <Card key={inv._id || inv.id} hoverEffect className="p-6 border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <Avatar src={invAvatar} alt={invName} size="lg" isVerified />
                    <Badge variant="purple">Check Size: {checkSize}</Badge>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{invName}</h3>
                  <p className="text-xs text-emerald-700 font-semibold">{invOrg}</p>
                  <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">{invBio}</p>

                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {tags.map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-md">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 mt-6 border-t border-slate-100 flex items-center gap-3">
                  <Button variant="primary" size="sm" className="w-full" onClick={() => setSelectedInvestor(inv)}>
                    <Calendar className="w-4 h-4 mr-1.5" />
                    <span>Book Pitch Meeting</span>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Book Pitch Meeting Modal */}
      <Modal
        isOpen={!!selectedInvestor}
        onClose={() => setSelectedInvestor(null)}
        title={`Book Pitch Call with ${selectedInvestor?.name || selectedInvestor?.user?.fullName || selectedInvestor?.user?.name || selectedInvestor?.organization || 'Investor'}`}
        subtitle={`${selectedInvestor?.organization || 'VC Partner'} • Check Size ${selectedInvestor?.checkSize || '$500k - $2M'}`}
      >
        <form onSubmit={handleBookMeeting} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Preferred Slot</label>
            <select className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5 text-slate-800">
              <option>Thursday, Next Week at 10:00 AM PST</option>
              <option>Thursday, Next Week at 2:30 PM PST</option>
              <option>Friday, Next Week at 11:00 AM PST</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Pitch Summary Note</label>
            <textarea
              rows={3}
              value={pitchNote}
              onChange={(e) => setPitchNote(e.target.value)}
              placeholder="Briefly describe your startup MRR, traction, and raise amount..."
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30"
              required
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={submitting}>
            <span>Confirm Pitch Booking</span>
          </Button>
        </form>
      </Modal>
    </div>
  );
};
