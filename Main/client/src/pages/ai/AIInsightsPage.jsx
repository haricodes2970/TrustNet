import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useApp } from '../../context/AppContext';
import { generateInsight, AI_CAPABILITIES } from '../../lib/aiApi';

// Minimal stub -- no page existed for the backend AI module in the
// original design. Covers the 5 capabilities needing only a startupId
// (task-prioritization/analytics-interpretation/report-explanation need
// extra params -- projectId/section/reportType -- and are not wired here).
export const AIInsightsPage = () => {
  const { startups } = useApp();
  const [startupId, setStartupId] = useState('');
  const [capability, setCapability] = useState(AI_CAPABILITIES[0].value);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async () => {
    if (!startupId) {
      setError('Select a startup first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await generateInsight({ capability, startupId, question });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-500" />
          AI Insights
        </h1>
        <p className="text-xs text-slate-500 mt-1">Ask the TrustNet AI assistant about a startup you have a role on</p>
      </div>

      <Card className="p-6 border-slate-200 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Startup</label>
            <select
              value={startupId}
              onChange={(e) => setStartupId(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800"
            >
              <option value="">Select a startup…</option>
              {startups.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Capability</label>
            <select
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800"
            >
              {AI_CAPABILITIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <Input
          label="Question (optional)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Anything specific you want the summary to focus on?"
        />

        <Button variant="primary" onClick={handleAsk} isLoading={isLoading}>
          <Sparkles className="w-4 h-4" />
          <span>Generate Insight</span>
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      {result && (
        <Card className="p-6 border-slate-200 space-y-3">
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{result.insight}</p>
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-semibold">Context used</summary>
            <pre className="whitespace-pre-wrap break-words mt-2">{JSON.stringify(result.contextSummary, null, 2)}</pre>
          </details>
        </Card>
      )}
    </div>
  );
};
