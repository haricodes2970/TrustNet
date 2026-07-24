import React, { useState } from 'react';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Mic, 
  Smile, 
  Search, 
  MoreVertical, 
  CheckCheck,
  Hash,
  Volume2
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';

export const MessagingPage = () => {
  const { conversations, sendMessage } = useApp();
  const { currentUser } = useAuth();
  
  const [activeConvId, setActiveConvId] = useState(conversations[0]?.id || 'msg_conv_1');
  const [inputMessage, setInputMessage] = useState('');

  const activeConv = conversations.find(c => c.id === activeConvId) || conversations[0];

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;
    sendMessage(activeConvId, inputMessage);
    setInputMessage('');
  };

  return (
    <Card className="h-[calc(100vh-140px)] border-slate-200 overflow-hidden flex flex-col md:flex-row shadow-soft-sm">
      {/* Left Conversations Sidebar */}
      <div className="w-full md:w-80 border-r border-slate-200 bg-white flex flex-col justify-between">
        <div>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Messages & Channels</h2>
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                className="w-full bg-slate-50 border border-slate-200 text-xs rounded-xl pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="divide-y divide-slate-50 overflow-y-auto max-h-[calc(100vh-280px)]">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                    isActive ? 'bg-emerald-50/70 border-l-4 border-emerald-500' : 'hover:bg-slate-50'
                  }`}
                >
                  <Avatar src={conv.partner.avatar} alt={conv.partner.name} size="md" isOnline isVerified />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{conv.partner.name}</h4>
                      <span className="text-[10px] text-slate-400">{conv.lastTime}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Chat Container */}
      <div className="flex-1 bg-slate-50/50 flex flex-col justify-between min-w-0">
        {/* Chat Header */}
        <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar src={activeConv.partner.avatar} alt={activeConv.partner.name} size="sm" isOnline isVerified />
            <div>
              <h3 className="text-sm font-bold text-slate-900">{activeConv.partner.name}</h3>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online • YC Verified
              </span>
            </div>
          </div>
          <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {activeConv.messages.map((m) => {
            const isMe = m.senderId === 'usr_me';
            return (
              <div
                key={m.id}
                className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {!isMe && <Avatar src={activeConv.partner.avatar} alt="Partner" size="sm" />}
                <div className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                  isMe
                    ? 'bg-emerald-500 text-white rounded-br-none shadow-soft-sm'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                }`}>
                  <p>{m.text}</p>
                  <span className={`text-[10px] block mt-1 text-right ${isMe ? 'text-emerald-100' : 'text-slate-400'}`}>
                    {m.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Voice Note Placeholder Bar */}
        <div className="px-4 py-1.5 bg-slate-100/80 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-600">
          <Volume2 className="w-4 h-4 text-emerald-600" />
          <span className="font-semibold text-[11px]">Voice Memo Simulation: Press mic to record 15s pitch audio.</span>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <button type="button" className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg">
            <Paperclip className="w-4 h-4" />
          </button>
          <button type="button" className="p-2 text-slate-400 hover:text-emerald-600 rounded-lg">
            <Mic className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder="Type a message or paste a pitch deck link..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 bg-slate-50 border border-slate-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          />
          <Button type="submit" size="sm" variant="primary" disabled={!inputMessage.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
};
