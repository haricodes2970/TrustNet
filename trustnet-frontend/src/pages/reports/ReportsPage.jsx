import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { generateReport, REPORT_TYPES } from '../../lib/reportsApi';

// Minimal stub -- no page existed for the backend Reports module in the
// original design. Owner/Admin only on the backend; a contributor or
// unrelated user will see the 403 message surfaced below, not a crash.
export const ReportsPage = () => {
  const { startups } = useApp();
  const [startupId, setStartupId] = useState('');
  const [reportType, setReportType] = useState('startup');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!startupId) {
      setError('Select a startup first.');
      return;
    }
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await generateReport(reportType, startupId, 'json');
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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Reports</h1>
        <p className="text-xs text-slate-500 mt-1">Generate a JSON report for a startup you own or admin</p>
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
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-slate-50/80 border border-slate-200 text-sm rounded-xl px-3.5 h-11 text-slate-800"
            >
              {REPORT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <Button variant="primary" onClick={handleGenerate} isLoading={isLoading}>
          <FileText className="w-4 h-4" />
          <span>Generate Report</span>
        </Button>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </Card>

      {result && (
        <Card className="p-6 border-slate-200">
          <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words">{JSON.stringify(result, null, 2)}</pre>
        </Card>
      )}
    </div>
  );
};
