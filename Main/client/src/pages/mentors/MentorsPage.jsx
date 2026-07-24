import React, { useState } from 'react';
import { Award, Star, Calendar, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { MOCK_USERS } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

export const MentorsPage = () => {
  const { showToast } = useApp();
  const mentors = MOCK_USERS.filter(u => u.role === 'Mentor');
  const [selectedMentor, setSelectedMentor] = useState(null);

  const handleBookSession = (e) => {
    e.preventDefault();
    showToast('Mentorship Session Scheduled', `Booked 1:1 advisory call with ${selectedMentor.name}`, 'success');
    setSelectedMentor(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verified Mentors & Advisors</h1>
        <p className="text-xs text-slate-500 mt-1">Get 1:1 guidance from ex-FAANG leaders and serial founders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mentors.map((men) => (
          <Card key={men.id} hoverEffect className="p-6 border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-4">
                <Avatar src={men.avatar} alt={men.name} size="lg" isVerified />
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-xs font-bold border border-amber-200">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{men.rating || 4.9}</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-slate-900">{men.name}</h3>
              <p className="text-xs text-slate-500">{men.headline}</p>
              <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">{men.bio}</p>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {men.skills?.map((s, idx) => (
                  <span key={idx} className="px-2 py-0.5 text-[11px] bg-slate-100 text-slate-600 rounded-md">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-700">{men.hourlyRate}</span>
              <Button variant="primary" size="sm" onClick={() => setSelectedMentor(men)}>
                <Calendar className="w-4 h-4" />
                <span>Book 1:1 Session</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        isOpen={!!selectedMentor}
        onClose={() => setSelectedMentor(null)}
        title={`Book 1:1 Mentorship with ${selectedMentor?.name}`}
        subtitle="Select a convenient time for advice on architecture, fundraising, or growth."
      >
        <form onSubmit={handleBookSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Select Time</label>
            <select className="w-full bg-white border border-slate-200 text-sm rounded-xl p-2.5">
              <option>Wednesday, Aug 05 at 1:00 PM EST</option>
              <option>Friday, Aug 07 at 4:00 PM EST</option>
            </select>
          </div>
          <Button type="submit" variant="primary" size="lg" className="w-full">
            Confirm Booking
          </Button>
        </form>
      </Modal>
    </div>
  );
};
