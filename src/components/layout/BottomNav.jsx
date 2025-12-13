import React from "react";
import { Home, Target, Receipt, ListChecks, Settings, Plus } from "lucide-react";
import { useToast } from "../ui/toast/useToast";

export function BottomNav({ currentTab, onTabChange, onAddPress }) {
  const { showToast } = useToast();

  const navItems = [
    { id: "home", icon: Home, label: "Home" },
    { id: "planner", icon: Target, label: "Planner" },
    { id: "expenses", icon: Receipt, label: "Expenses" },
    { id: "add", icon: Plus, label: "Add", isFab: true },
    { id: "bills", icon: ListChecks, label: "Bills" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  const handleAddPress = () => {
    if (typeof onAddPress === "function") {
      onAddPress();
    } else {
      showToast({ type: "info", message: "Add transaction coming soon." });
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="mx-auto max-w-md relative">
        {/* Bottom nav height/padding is used as the baseline offset for FAB/Toast safe spacing. */}
        <nav className="pointer-events-auto relative mx-4 mb-4 bg-surface-50 dark:bg-surface-100 border border-surface-200 rounded-2xl shadow-soft px-5 py-3 pb-safe">
          <div className="flex items-center justify-between">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              
              // 1. Render Floating Action Button (FAB)
              if (item.isFab) {
                return (
                  <div key={item.id} className="relative -top-8">
                    <button
                      onClick={handleAddPress}
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
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 ${
                    isActive
                      ? "text-primary-600 bg-primary-50/70 dark:text-primary-400 dark:bg-surface-100/40"
                      : "text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <item.icon 
                    size={22} 
                    className={`transition-transform duration-200 ${isActive ? '-translate-y-1' : ''}`}
                    strokeWidth={isActive ? 2.5 : 2}
                    // Fill icon if active for that "solid" look
                    fill={isActive ? "currentColor" : "none"} 
                    fillOpacity={isActive ? 0.2 : 0}
                  />

                  {/* Optional: Hide label on mobile if space is tight, or keep it small */}
                  <span className={`text-[11px] font-semibold ${isActive ? 'opacity-100' : 'opacity-80'}`}>
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

