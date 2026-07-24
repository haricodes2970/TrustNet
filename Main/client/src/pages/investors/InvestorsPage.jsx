import React, { useState } from 'react';
import { DollarSign, Calendar, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MOCK_USERS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

export const InvestorsPage = () => {
  const { showToast } = useApp();
  const investors = MOCK_USERS.filter(u => u.role === 'Investor');
  
  const [selectedInvestor, setSelectedInvestor] = useState(null);

  const handleBookMeeting = (e) => {
    e.preventDefault();
    showToast('Pitch Meeting Requested', `Sent 20-min calendar invite to ${selectedInvestor.name}.`, 'success');
    setSelectedInvestor(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Investor Directory</h1>
        <p className="text-xs text-slate-500 mt-1">Connect with active VCs writing check sizes from $100k to $5M</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {investors.map((inv) => (
          <Card key={inv.id} hoverEffect className="p-6 border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <Avatar src={inv.avatar} alt={inv.name} size="lg" isVerified />
                <Badge variant="purple">Check Size: {inv.checkSize || '$500k - $2M'}</Badge>
              </div>

              <h3 className="text-base font-bold text-slate-900">{inv.name}</h3>
              <p className="text-xs text-emerald-700 font-semibold">{inv.organization}</p>
              <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">{inv.bio}</p>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {inv.interests?.map((tag, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-md">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center gap-3">
              <Button variant="primary" size="sm" className="w-full" onClick={() => setSelectedInvestor(inv)}>
                <Calendar className="w-4 h-4" />
                <span>Book Pitch Meeting</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Book Pitch Meeting Modal */}
      <Modal
        isOpen={!!selectedInvestor}
        onClose={() => setSelectedInvestor(null)}
        title={`Book Pitch Call with ${selectedInvestor?.name}`}
        subtitle={`${selectedInvestor?.organization} • Check Size ${selectedInvestor?.checkSize}`}
      >
        <form onSubmit={handleBookMeeting} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Available Slot</label>
            <select className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5">
              <option>Thursday, Jul 30 at 10:00 AM PST</option>
              <option>Thursday, Jul 30 at 2:30 PM PST</option>
              <option>Friday, Jul 31 at 11:00 AM PST</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Pitch Summary Note</label>
            <textarea
              rows={3}
              placeholder="Briefly describe your startup MRR, traction, and raise amount..."
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3"
              required
            />
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full">
            <span>Confirm Pitch Booking</span>
          </Button>
        </form>
      </Modal>
    </div>
  );
};
