import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export function CashflowChart({ data = [] }) {
  // Use CSS variable for the stroke color (Violet-500)
  const strokeColor = '#8b5cf6'; 
  const fillColor = '#8b5cf6';

  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-surface-400 text-caption bg-surface-50 rounded-2xl border border-surface-100">
        Not enough data to project trend
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fillColor} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={fillColor} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="label" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              borderRadius: '12px', 
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              border: 'none'
            }}
            itemStyle={{ color: '#1e293b', fontSize: '12px', fontWeight: 600 }}
            labelStyle={{ display: 'none' }}
            formatter={(value) => [`$${value}`, 'Balance']}
          />
          <Area 
            type="monotone" 
            dataKey="balance" 
            stroke={strokeColor} 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorBalance)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}