import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingOverlay({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-[60] bg-white/80 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 p-6 rounded-3xl">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" strokeWidth={2.5} />
        <p className="text-sm font-semibold text-slate-600 animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
}