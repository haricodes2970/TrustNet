import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Video, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { useApp } from '../../context/AppContext';

export const CalendarPage = () => {
  const { showToast } = useApp();
  const [viewMode, setViewMode] = useState('month'); // day, week, month, agenda
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = ['2025', '2026', '2027', '2028'];

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(months[today.getMonth()]);
  const [selectedYear, setSelectedYear] = useState(String(today.getFullYear()));
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  const [events, setEvents] = useState([
    { id: '1', title: 'Investor Pitch - Horizon VC', type: 'Investor Call', day: 22, date: 'Jul 22, 2026', time: '10:00 AM', attendees: 'Sarah Chen (Partner)', link: 'https://meet.google.com/xyz-abc' },
    { id: '2', title: 'Mentor Session - Marcus Vance', type: 'Mentor Session', day: 23, date: 'Jul 23, 2026', time: '02:00 PM', attendees: 'Marcus Vance', link: 'https://meet.google.com/uvw-rst' },
    { id: '3', title: 'Senior Engineer Interview', type: 'Hiring Interview', day: 24, date: 'Jul 24, 2026', time: '11:00 AM', attendees: 'Engineering Team', link: '#' },
    { id: '4', title: 'YC W26 Milestone Deadline', type: 'Deadline', day: 26, date: 'Jul 26, 2026', time: '11:59 PM', attendees: 'All Founders', link: '#' }
  ]);

  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('Investor Call');
  const [newDate, setNewDate] = useState('Jul 25, 2026');
  const [newDay, setNewDay] = useState(25);

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!newTitle) return;

    const newEvt = {
      id: `evt_${Date.now()}`,
      title: newTitle,
      type: newType,
      day: Number(newDay) || 25,
      date: newDate,
      time: '03:00 PM',
      attendees: 'TrustNet Network Member',
      link: 'https://meet.google.com/new-meeting'
    };

    setEvents(prev => [newEvt, ...prev]);
    setIsScheduleModalOpen(false);
    setNewTitle('');
    showToast('Event Scheduled', `Scheduled "${newTitle}" on ${newDate}.`, 'success');
  };

  const handlePrevMonth = () => {
    const idx = months.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(months[idx - 1]);
    } else {
      setSelectedMonth(months[11]);
      setSelectedYear(String(Number(selectedYear) - 1));
    }
  };

  const handleNextMonth = () => {
    const idx = months.indexOf(selectedMonth);
    if (idx < 11) {
      setSelectedMonth(months[idx + 1]);
    } else {
      setSelectedMonth(months[0]);
      setSelectedYear(String(Number(selectedYear) + 1));
    }
  };

  const getBadgeVariant = (type) => {
    switch (type) {
      case 'Investor Call': return 'emerald';
      case 'Mentor Session': return 'emerald';
      case 'Hiring Interview': return 'slate';
      case 'Deadline': return 'amber';
      default: return 'slate';
    }
  };

  // Dynamic Calendar calculations
  const currentMonthIdx = months.indexOf(selectedMonth);
  const yearNum = Number(selectedYear);

  // First day of the selected month
  const firstDayOfMonth = new Date(yearNum, currentMonthIdx, 1);
  const startOffset = firstDayOfMonth.getDay(); // 0: Sun, 1: Mon, etc.

  // Days in selected month
  const daysInMonth = new Date(yearNum, currentMonthIdx + 1, 0).getDate();

  // Days in previous month
  const prevMonthDays = new Date(yearNum, currentMonthIdx, 0).getDate();

  const calendarDays = [];

  // Previous month padding
  for (let i = prevMonthDays - startOffset + 1; i <= prevMonthDays; i++) {
    calendarDays.push({ dayNumber: i, isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ dayNumber: i, isCurrentMonth: true });
  }

  // Next month padding to fill complete weeks (multiples of 7)
  const totalCellsSoFar = calendarDays.length;
  const totalCellsNeeded = Math.ceil(totalCellsSoFar / 7) * 7;
  const nextMonthPadding = totalCellsNeeded - totalCellsSoFar;

  for (let i = 1; i <= nextMonthPadding; i++) {
    calendarDays.push({ dayNumber: i, isCurrentMonth: false });
  }

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/80">
              <CalendarIcon className="w-7 h-7 text-emerald-500" strokeWidth={1.75} />
            </div>
            <span>Calendar & Schedule</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1.5">
            Manage investor pitch meetings, mentor 1-on-1s, hiring interviews, and startup deadlines.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={() => setIsScheduleModalOpen(true)}>
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          <span>Schedule Meeting</span>
        </Button>
      </div>

      {/* Date & View Toolbar with Dropdowns */}
      <Card className="p-3.5 border-slate-200/80 bg-white flex flex-col md:flex-row items-center justify-between gap-4 shadow-soft-sm">
        {/* Month & Year Select Dropdowns */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 text-slate-900 font-bold text-xs rounded-xl px-3.5 h-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {months.map(m => <option key={m} value={m}>{m}</option>)}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 text-slate-900 font-bold text-xs rounded-xl px-3.5 h-10 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* View Mode Switcher Dropdown & Tabs */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl">
            {['day', 'week', 'month', 'agenda'].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all min-h-[36px] ${
                  viewMode === mode
                    ? 'bg-white text-emerald-600 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* VISUAL INTERACTIVE CALENDAR MONTH GRID */}
      {viewMode === 'month' && (
        <Card className="border-slate-200/80 bg-white p-4 shadow-soft-sm space-y-4">
          <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
              {selectedMonth} {selectedYear} Overview
            </h2>
            <Badge variant="emerald">{events.length} Upcoming Events</Badge>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 uppercase tracking-wider py-2">
            {daysOfWeek.map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* 35 Calendar Cells Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((cell, idx) => {
              const dayEvts = cell.isCurrentMonth
                ? events.filter(e => e.day === cell.dayNumber)
                : [];
              const isToday = cell.isCurrentMonth && 
                              cell.dayNumber === today.getDate() && 
                              selectedMonth === months[today.getMonth()] && 
                              selectedYear === String(today.getFullYear());

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (cell.isCurrentMonth) {
                      setNewDay(cell.dayNumber);
                      setNewDate(`${selectedMonth.slice(0, 3)} ${cell.dayNumber}, ${selectedYear}`);
                      setIsScheduleModalOpen(true);
                    }
                  }}
                  className={`min-h-[90px] sm:min-h-[110px] p-2 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none ${
                    !cell.isCurrentMonth
                      ? 'bg-slate-50/40 border-slate-100 text-slate-300 pointer-events-none'
                      : isToday
                      ? 'bg-emerald-50/40 border-emerald-400 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200/80 hover:border-emerald-400 hover:shadow-soft-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-black ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center'
                        : cell.isCurrentMonth ? 'text-slate-800' : 'text-slate-300'
                    }`}>
                      {cell.dayNumber}
                    </span>
                    {dayEvts.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </div>

                  {/* Event Pills inside Day Cell */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayEvts.map((e) => (
                      <div
                        key={e.id}
                        className="p-1 rounded-md bg-emerald-100/80 border border-emerald-200 text-[10px] font-bold text-emerald-800 truncate"
                        title={`${e.title} (${e.time})`}
                      >
                        {e.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Main Grid: Scheduled Events & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
        {/* Events List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Event Details & Video Call Links</h3>
            <span className="text-xs text-slate-500 font-semibold">{events.length} Scheduled</span>
          </div>

          <div className="space-y-3">
            {events.map((evt) => (
              <Card key={evt.id} className="p-5 border-slate-200/80 bg-white hoverEffect">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant={getBadgeVariant(evt.type)}>{evt.type}</Badge>
                      <span className="text-xs font-bold text-slate-400">{evt.date}</span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{evt.title}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-3 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                        {evt.time}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.75} />
                        {evt.attendees}
                      </span>
                    </p>
                  </div>

                  {evt.link !== '#' && (
                    <Button variant="outline" size="sm" onClick={() => window.open(evt.link, '_blank')}>
                      <Video className="w-4 h-4 text-emerald-500" strokeWidth={1.75} />
                      <span>Join Meeting</span>
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6 border-slate-200/80 bg-white space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Calendar Categories</h3>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
                <span className="font-bold text-emerald-800">Investor Pitch Calls</span>
                <Badge variant="emerald">2 Scheduled</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-800">Mentor 1-on-1 Sessions</span>
                <Badge variant="emerald">1 Scheduled</Badge>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="font-bold text-slate-800">Hiring Interviews</span>
                <Badge variant="slate">1 Scheduled</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule New Meeting / Event"
        subtitle="Set up investor pitches, mentor sessions, or team calls"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4 pt-2">
          <Input
            label="Event Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="e.g. Investor Pitch - Horizon VC"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Event Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="w-full bg-slate-50/80 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="Investor Call">Investor Call</option>
                <option value="Mentor Session">Mentor Session</option>
                <option value="Hiring Interview">Hiring Interview</option>
                <option value="Deadline">Deadline</option>
              </select>
            </div>

            <Input
              label="Date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" size="lg" className="w-full mt-4 h-12">
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Confirm & Schedule</span>
          </Button>
        </form>
      </Modal>
    </div>
  );
};
