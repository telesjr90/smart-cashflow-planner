import React from 'react';
import { Card } from './Card';

export function StatCard({ title, value, subtext, trend, icon, variant = 'default' }) {
  // Variant allows for "highlighted" cards (like the main Balance card)
  const isHighlight = variant === 'highlight';

  return (
    <Card className={`relative overflow-hidden ${isHighlight ? 'bg-primary-600 border-primary-600' : ''}`}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className={`text-caption font-medium ${isHighlight ? 'text-primary-100' : 'text-surface-500'}`}>
            {title}
          </p>
          {icon && <div className={`${isHighlight ? 'text-primary-100' : 'text-surface-400'}`}>{icon}</div>}
        </div>
        
        <div className="flex items-baseline gap-2">
          <h4 className={`text-title-xl tracking-tight ${isHighlight ? 'text-white' : 'text-surface-900'}`}>
            {value}
          </h4>
        </div>

        {(subtext || trend) && (
          <div className="mt-2 flex items-center gap-2">
            {trend && (
              <span className={`text-tiny font-bold ${trend === 'up' ? 'text-success-500' : 'text-danger-500'}`}>
                {trend === 'up' ? '↑' : '↓'}
              </span>
            )}
            {subtext && (
              <p className={`text-tiny ${isHighlight ? 'text-primary-200' : 'text-surface-400'}`}>
                {subtext}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

