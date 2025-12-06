import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-surface-100 rounded-3xl shadow-soft border border-surface-200/50 ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between px-5 pt-5 pb-2 ${className}`}>
      <div>
        <h3 className="text-title-l text-surface-900">{title}</h3>
        {subtitle && <p className="text-caption text-surface-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-5 ${className}`}>
      {children}
    </div>
  );
}

