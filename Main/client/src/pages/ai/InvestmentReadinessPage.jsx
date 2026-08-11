import React, { useState } from 'react';
import { ReadinessGauge } from '../../components/investment/ReadinessGauge';
import { RadarChart } from '../../components/investment/RadarChart';
import { ChecklistCard } from '../../components/investment/ChecklistCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useApp } from '../../context/AppContext';
import { ShieldCheck, Sparkles, Star, AlertTriangle, ArrowRight, Upload } from 'lucide-react';

export const InvestmentReadinessPage = () => {
  const { showToast } = useApp();

  const [readinessScore, setReadinessScore] = useState(78);
  const [trustScore, setTrustScore] = useState(82);
  const [radarData, setRadarData] = useState({
    product: 85,
    market: 72,
    financials: 64,
    team: 90,
    risk: 80,
  });

  const [checklist, setChecklist] = useState([
    { id: 'doc_1', name: 'Cap Table Verification', description: 'Fully audit share percentages & cap splits.', status: 'Verified' },
    { id: 'doc_2', name: 'Pitch Deck Slide Stack', description: 'Upload standard VC seed pitch slides.', status: 'Pending' },
    { id: 'doc_3', name: 'Historical Financials & P&L', description: 'Past 12 months profit/loss excel document.', status: 'Verified' },
    { id: 'doc_4', name: 'Financial Model Projections', description: '3-5 year growth scenario forecasts.', status: 'Missing' },
    { id: 'doc_5', name: 'Entity Incorporation Document', description: 'Delaware C-Corp filing or regional equivalent.', status: 'Verified' },
  ]);

  const [investorFeedback, setInvestorFeedback] = useState([
    {
      id: 'fb_1',
      investor: 'Sarah Chen',
      fund: 'Horizon VC',
      stars: 4,
      content: 'Excellent team pedigree. Product MVP shows strong technical capability. Financial projections need clarity on user acquisition costs.',
      date: '3 days ago',
    },
    {
      id: 'fb_2',
      investor: 'Marcus Vance',
      fund: 'Apex Capital',
      stars: 5,
      content: 'Clear path to product-market fit. Tech infrastructure is solid. Suggest verifying identity documents to speed up matching.',
      date: '1 week ago',
    },
  ]);

  const handleUploadDocument = (id) => {
    // Create temporary hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.png,.jpg,.jpeg';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        showToast('Scanning & Auditing Document', `Running AI OCR Audit on ${file.name}...`, 'info');
        
        // Simulate a 1.5s scanning loader
        setTimeout(() => {
          setChecklist(prev => prev.map(item => {
            if (item.id === id) {
              showToast('Document Verified', `${item.name} has passed automated AI verification!`, 'success');
              return { ...item, status: 'Verified' };
            }
            return item;
          }));
          
          // Boost scores upon successful audit
          setReadinessScore(prev => Math.min(prev + 6, 100));
          setTrustScore(prev => Math.min(prev + 8, 100));
        }, 1500);
      }
    };
    fileInput.click();
  };

  return (
    <div className="space-y-8 max-w-[1440px] mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200/80">
              <ShieldCheck className="w-7 h-7 text-emerald-500" strokeWidth={1.75} />
            </div>
            <span>Investment Readiness & Trust Auditor</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1.5">
            Audit compliance items, verify identity credentials, and evaluate dynamic AI Business and Trust metrics.
          </p>
        </div>

        <Badge variant="emerald" size="lg">
          <Sparkles className="w-4 h-4 mr-1.5" strokeWidth={1.75} />
          AI Audit Engine Active
        </Badge>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Scores and Gauges (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Circular Gauge Card */}
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
            <div className="grid grid-cols-2 gap-4">
              <ReadinessGauge score={readinessScore} label="Business" sublabel="AI Business Score" />
              <ReadinessGauge score={trustScore} label="Trust Score" sublabel="Identity & Legal Trust" />
            </div>
          </Card>

          {/* Radar Chart Card */}
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3">Readiness Vectors Map</h3>
            <RadarChart data={radarData} />
          </Card>

          {/* AI Score Feedback Directive Card */}
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-amber-600 font-bold text-xs bg-amber-50 p-3.5 border border-amber-100 rounded-2xl">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <span>Missing 3-year Financial Projections decreases funding readiness score by 8%.</span>
            </div>
          </Card>
        </div>

        {/* Right Column: Checklists & Mocks Feedback (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Document Auditing Checklist */}
          <Card className="p-6 border-slate-200/80 bg-white shadow-xs">
            <ChecklistCard items={checklist} onUpload={handleUploadDocument} />
          </Card>

          {/* Simulated Investor Feedbacks */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">Ecosystem Investor Audits</h3>
            <div className="grid grid-cols-1 gap-4">
              {investorFeedback.map((fb) => (
                <Card key={fb.id} className="p-5 border-slate-200/80 bg-white shadow-xs space-y-3 transition-all hover:border-slate-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{fb.investor}</h4>
                      <p className="text-[10px] text-slate-400 font-semibold">{fb.fund} Alum Partner</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: fb.stars }).map((_, starIdx) => (
                        <Star key={starIdx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                    "{fb.content}"
                  </p>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-semibold">
                    <span>Audit review date: {fb.date}</span>
                    <button className="text-emerald-500 hover:text-emerald-600 flex items-center gap-0.5 hover:underline">
                      <span>Schedule Followup Call</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
