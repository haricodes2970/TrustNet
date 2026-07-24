import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Rocket, 
  ShieldCheck, 
  Users, 
  DollarSign, 
  Award, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  Globe, 
  ChevronDown,
  Lock,
  Zap,
  MessageSquare
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Logo } from '../../components/common/Logo';
import { MOCK_STARTUPS } from '../../data/mockData';

export const LandingPage = () => {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState(null);

  const stats = [
    { label: 'Capital Raised', value: '$50M+' },
    { label: 'Active Founders', value: '12,000+' },
    { label: 'Verified VCs', value: '1,500+' },
    { label: 'Ecosystem Deals', value: '4,200+' },
  ];

  const features = [
    {
      title: 'For Startup Founders',
      desc: 'Publish pitch decks, raise seed capital, discover co-founders, and get verified YC badges.',
      icon: Rocket,
    },
    {
      title: 'For Venture Investors',
      desc: 'Access verified deal-flow pipelines, view pre-vetted pitch decks, and book 1:1 pitch calls.',
      icon: DollarSign,
    },
    {
      title: 'For Mentors & Advisors',
      desc: 'Offer 1:1 mentorship sessions, advise top founders, and earn ecosystem reputation points.',
      icon: Award,
    },
  ];

  const faqs = [
    { q: 'How does TrustNet verify founders and investors?', a: 'TrustNet validates credentials against Y Combinator, Crunchbase, LinkedIn, and identity verification checks to issue verified green checkmark badges.' },
    { q: 'Can early-stage startups publish pitch decks securely?', a: 'Yes! Pitch decks are hosted in an interactive slide viewer with customizable privacy settings (Public or Verified Investors Only).' },
    { q: 'Is TrustNet free for early-stage founders?', a: 'TrustNet offers a generous free tier for all founders and community members. Premium features are available for active investors and scaling startups.' },
  ];

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 lg:pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-bold mb-6 shadow-soft-sm">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>The Next-Gen Startup Ecosystem Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] max-w-4xl mx-auto">
          Where Great <span className="text-emerald-500">Startups</span> Connect, Raise & Scale.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto mt-6 leading-relaxed">
          TrustNet is the premium networking platform connecting Entrepreneurs, Founders, Investors, and Mentors to build the future of tech.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
          <Button size="lg" variant="primary" onClick={() => navigate('/signup')}>
            <span>Join TrustNet Ecosystem</span>
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>

      {/* Stats Counter Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-8 bg-slate-900 text-white rounded-3xl shadow-soft-lg">
          {stats.map((s, idx) => (
            <div key={idx} className="text-center">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400">{s.value}</span>
              <p className="text-xs text-slate-400 mt-1 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900">Tailored for Every Ecosystem Role</h2>
          <p className="text-sm text-slate-500 mt-2">Built like LinkedIn + AngelList + Discord, refined for high-trust collaboration.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <Card key={idx} hoverEffect className="p-6 border-slate-200">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Featured Startups Section */}
      <section id="showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Featured Startups Raising Now</h2>
            <p className="text-xs text-slate-500 mt-1">Explore pre-vetted AI, SaaS, and ClimateTech companies.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            <span>View All Startups</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {MOCK_STARTUPS.map((startup) => (
            <Card key={startup.id} hoverEffect className="p-5 border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <img src={startup.logo} alt={startup.name} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{startup.name}</h4>
                  <p className="text-xs text-slate-500">{startup.stage} • {startup.industry}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 line-clamp-2 mb-4">{startup.tagline}</p>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100 font-semibold text-emerald-700">
                <span>Raised: ${(startup.fundingRaised / 1000).toFixed(0)}k</span>
                <span className="text-slate-900">{startup.valuation} Valuation</span>
              </div>
            </Card>
          ))}
        </div>
      </section>


      {/* FAQ Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-200 rounded-2xl p-4 bg-white">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between text-left font-bold text-slate-900 text-sm"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${activeFaq === idx ? 'rotate-180 text-emerald-500' : 'text-slate-400'}`} />
              </button>
              {activeFaq === idx && (
                <p className="text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-relaxed">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-slate-200 pt-12 pb-8 text-center text-xs text-slate-500 max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center mb-4">
          <Logo size="md" />
        </div>
        <p>© 2026 TrustNet Inc. All rights reserved. Designed for modern startup founders.</p>
      </footer>
    </div>
  );
};
