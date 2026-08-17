import React from 'react';
import { 
  ResponsiveContainer, 
  RadarChart as RechartsRadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar 
} from 'recharts';

export const RadarChart = ({ data }) => {
  const chartData = [
    { subject: 'Product', A: data?.product || 80, fullMark: 100 },
    { subject: 'Market', A: data?.market || 75, fullMark: 100 },
    { subject: 'Financials', A: data?.financials || 70, fullMark: 100 },
    { subject: 'Team', A: data?.team || 90, fullMark: 100 },
    { subject: 'Risk Control', A: data?.risk || 85, fullMark: 100 },
  ];

  return (
    <div className="w-full h-[220px] select-none text-[10px] font-bold text-slate-500">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
          <PolarGrid stroke="#E2E8F0" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748B', fontSize: 10, fontWeight: 700 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94A3B8' }} />
          <Radar
            name="Startup"
            dataKey="A"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.25}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
};
