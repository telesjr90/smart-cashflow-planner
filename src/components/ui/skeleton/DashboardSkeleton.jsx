import React from 'react';

export default function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-24 animate-pulse">
      
      {/* Hero Section */}
      <section className="space-y-4">
        <div>
          {/* Label */}
          <div className="h-3 w-32 bg-slate-200 rounded-full mb-2"></div>
          {/* Balance + Badge */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-48 bg-slate-200 rounded-xl"></div>
            <div className="h-6 w-20 bg-slate-200 rounded-full"></div>
          </div>
          {/* Subtext */}
          <div className="h-3 w-40 bg-slate-200 rounded-full mt-2"></div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-slate-100 rounded-3xl p-4">
             <div className="h-8 w-8 bg-slate-200 rounded-xl mb-3"></div>
             <div className="h-4 w-16 bg-slate-200 rounded-full mb-1"></div>
             <div className="h-6 w-24 bg-slate-200 rounded-xl"></div>
          </div>
          <div className="h-24 bg-slate-100 rounded-3xl p-4">
             <div className="h-8 w-8 bg-slate-200 rounded-xl mb-3"></div>
             <div className="h-4 w-16 bg-slate-200 rounded-full mb-1"></div>
             <div className="h-6 w-24 bg-slate-200 rounded-xl"></div>
          </div>
        </div>
      </section>

      {/* Chart Section */}
      <section>
        <div className="bg-slate-100 rounded-3xl h-64 w-full p-4 flex flex-col justify-between">
           <div className="space-y-2">
             <div className="h-4 w-12 bg-slate-200 rounded-full"></div>
             <div className="h-3 w-24 bg-slate-200 rounded-full"></div>
           </div>
           {/* Fake bars */}
           <div className="flex items-end justify-between gap-2 h-32 px-2">
             <div className="w-full bg-slate-200 rounded-t-sm h-[40%]"></div>
             <div className="w-full bg-slate-200 rounded-t-sm h-[60%]"></div>
             <div className="w-full bg-slate-200 rounded-t-sm h-[30%]"></div>
             <div className="w-full bg-slate-200 rounded-t-sm h-[80%]"></div>
             <div className="w-full bg-slate-200 rounded-t-sm h-[50%]"></div>
           </div>
        </div>
      </section>

      {/* List Section */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <div className="h-5 w-32 bg-slate-200 rounded-full"></div>
          <div className="h-4 w-16 bg-slate-200 rounded-full"></div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-100 rounded-2xl"></div>
                <div className="space-y-2">
                  <div className="h-4 w-32 bg-slate-200 rounded-full"></div>
                  <div className="h-3 w-20 bg-slate-100 rounded-full"></div>
                </div>
              </div>
              <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}