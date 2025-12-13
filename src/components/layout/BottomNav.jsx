import React from "react";
import {
  Home,
  Target,
  Receipt,
  ListChecks,
  Settings,
  Plus,
} from "lucide-react";

export function BottomNav({ currentTab, onTabChange, onAddPress }) {
  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "planner", icon: Target, label: "Planner" },
    { id: "expenses", icon: Receipt, label: "Expenses" },
    { id: "add", icon: Plus, label: "Add", isFab: true },
    { id: "bills", icon: ListChecks, label: "Bills" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="mx-auto max-w-md relative">

        {/* Navigation Container */}
        {/* Bottom nav height/padding is used as the baseline offset for FAB/Toast safe spacing. */}
        <nav className="pointer-events-auto relative bg-white dark:bg-surface-100 shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.1)] pb-safe pt-2 px-6 rounded-t-3xl border-t border-surface-200/50">
          <div className="flex items-center justify-between">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              
              // 1. Render Floating Action Button (FAB)
              if (item.isFab) {
                return (
                  <div key={item.id} className="relative -top-8">
                    <button
                      onClick={onAddPress}
                      data-testid={`nav-${item.id}`}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-600 text-white shadow-glow hover:scale-105 active:scale-95 transition-transform"
                      aria-label="Add Transaction"
                    >
                      <Plus size={28} strokeWidth={3} />
                    </button>
                  </div>
                );
              }

              // 2. Render Standard Nav Items
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  data-testid={`nav-${item.id}`}
                  aria-label={item.label}
                  className={`flex flex-col items-center gap-1 p-2 transition-all duration-200 ${
                    isActive 
                      ? 'text-primary-600 dark:text-primary-500' 
                      : 'text-surface-300 hover:text-surface-500 dark:text-surface-500 dark:hover:text-surface-300'
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon 
                    size={24} 
                    className={`transition-transform duration-200 ${isActive ? '-translate-y-1' : ''}`}
                    strokeWidth={isActive ? 2.5 : 2}
                    // Fill icon if active for that "solid" look
                    fill={isActive ? "currentColor" : "none"} 
                    fillOpacity={isActive ? 0.2 : 0}
                  />

                  {/* Optional: Hide label on mobile if space is tight, or keep it small */}
                  <span className={`text-[10px] font-semibold ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

