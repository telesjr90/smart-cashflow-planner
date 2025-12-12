import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-24 animate-pulse" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading dashboard</span>

      {/* Hero Section */}
      <section className="space-y-4">
        <div aria-hidden="true">
          {/* Label */}
          <div className="h-3 w-32 bg-surface-200 rounded-pill mb-2" />
          {/* Balance + Badge */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-48 bg-surface-200 rounded-2xl" />
            <div className="h-6 w-20 bg-surface-200 rounded-pill" />
          </div>
          {/* Subtext */}
          <div className="h-3 w-40 bg-surface-200 rounded-pill mt-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3" aria-hidden="true">
          {[1, 2].map((item) => (
            <div key={item} className="h-24 bg-surface-100 rounded-3xl p-4 border border-surface-200/60 shadow-soft">
              <div className="h-8 w-8 bg-surface-200 rounded-2xl mb-3" />
              <div className="h-4 w-16 bg-surface-200 rounded-pill mb-1" />
              <div className="h-6 w-24 bg-surface-200 rounded-2xl" />
            </div>
          ))}
        </div>
      </section>

      {/* Chart Section */}
      <section aria-hidden="true">
        <div className="bg-surface-100 rounded-3xl h-64 w-full p-4 flex flex-col justify-between border border-surface-200/60 shadow-soft">
          <div className="space-y-2">
            <div className="h-4 w-12 bg-surface-200 rounded-pill" />
            <div className="h-3 w-24 bg-surface-200 rounded-pill" />
          </div>
          {/* Fake bars */}
          <div className="flex items-end justify-between gap-2 h-32 px-2">
            {[40, 60, 30, 80, 50].map((height, idx) => (
              <div key={idx} className={`w-full bg-surface-200 rounded-t-2xl`} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </section>

      {/* List Section */}
      <section aria-hidden="true">
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="h-5 w-32 bg-surface-200 rounded-pill" />
          <div className="h-4 w-16 bg-surface-200 rounded-pill" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 bg-surface-100 border border-surface-200/60 rounded-3xl shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-surface-200 rounded-2xl" />
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-surface-200 rounded-pill" />
                  <div className="h-3 w-20 bg-surface-200 rounded-pill" />
                </div>
              </div>
              <div className="h-5 w-16 bg-surface-200 rounded-pill" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
