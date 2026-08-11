import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Send, Star, AlertCircle, CheckCircle2 } from 'lucide-react';

export const StartupModal = ({ isOpen, onClose, item, onSendPitch }) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(null); // 'success' or 'error'

  if (!item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    setStatus(null);

    const res = await onSendPitch(item.id, message);
    setSending(false);
    if (res.success) {
      setStatus('success');
      setMessage('');
    } else {
      setStatus('error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item.title}
      subtitle={`Offered by ${item.startup} • Founded by ${item.founder}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Images/Screenshots Carousel */}
        {item.screenshots && item.screenshots.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {item.screenshots.map((url, idx) => (
              <img 
                key={idx}
                src={url} 
                alt={`${item.title} Screenshot ${idx + 1}`}
                className="w-full h-36 object-cover rounded-xl border border-slate-200 shadow-xs"
              />
            ))}
          </div>
        )}

        {/* Detailed Info */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">
              Product Overview
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{item.rating} Rating</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-semibold">
            {item.details}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((t, idx) => (
              <Badge key={idx} variant="emerald" size="sm">
                {t}
              </Badge>
            ))}
          </div>
        </div>

        {/* Pricing / Action Info */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Target Pricing</span>
            <span className="text-sm font-black text-slate-900">{item.pricing}</span>
          </div>
          <Badge variant="emerald" size="sm">Active Partner</Badge>
        </div>

        {/* Contact/Hire Founder Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-slate-100">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Send a Collaboration Pitch to the Founder
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${item.founder}, I saw ${item.title} on the TrustNet Marketplace and would love to collaborate...`}
              rows={3}
              required
              disabled={sending || status === 'success'}
              className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl p-3 text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          {/* Feedback states */}
          {status === 'success' && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>Your pitch has been delivered to {item.founder} successfully!</span>
            </div>
          )}
          {status === 'error' && (
            <div className="p-3 bg-red-50 text-red-800 border border-red-100 rounded-xl flex items-center gap-2 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span>Failed to send. Please check your network and try again.</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={sending}>
              Close
            </Button>
            {status !== 'success' && (
              <Button type="submit" variant="primary" size="sm" disabled={sending || !message.trim()}>
                {sending ? 'Sending...' : 'Send Pitch Message'}
                <Send className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};
