import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({
  message = 'Loading...',
  variant = 'default', // default | inverse
  size = 'md', // sm | md
  className = '',
  ...props
}) {
  const variants = {
    default: {
      spinner: 'text-primary-600',
      text: 'text-surface-500',
      panel: 'bg-surface-100 border border-surface-200/60 shadow-soft',
      backdrop: 'bg-surface-900/30 dark:bg-surface-900/50',
    },
    inverse: {
      spinner: 'text-white',
      text: 'text-surface-50',
      panel: 'bg-surface-900 border border-surface-500/40 shadow-soft',
      backdrop: 'bg-surface-900/50',
    },
  };

  const sizes = {
    sm: {
      icon: 'h-8 w-8',
      padding: 'p-5',
      gap: 'gap-2',
      text: 'text-caption',
    },
    md: {
      icon: 'h-10 w-10',
      padding: 'p-6',
      gap: 'gap-3',
      text: 'text-body',
    },
  };

  const activeVariant = variants[variant] || variants.default;
  const activeSize = sizes[size] || sizes.md;

  return (
    <div
      className={`fixed inset-0 z-[60] ${activeVariant.backdrop} backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300 ${className}`}
      role="status"
      aria-live="polite"
      {...props}
    >
      <div className={`flex flex-col items-center ${activeSize.gap} ${activeSize.padding} rounded-3xl ${activeVariant.panel}`}>
        <Loader2 className={`${activeSize.icon} ${activeVariant.spinner} animate-spin`} strokeWidth={2.5} aria-hidden="true" />
        <p className={`${activeSize.text} font-semibold ${activeVariant.text} animate-pulse`}>{message}</p>
      </div>
    </div>
  );
}
