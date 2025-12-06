import React from 'react';

export function Card({ children, className = '', ...props }) {
  return (
    <div 
      className={`bg-white rounded-2xl border border-surface-200 shadow-sm ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b border-surface-100 ${className}`}>
      <h3 className="text-title-l text-surface-900">{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '' }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

