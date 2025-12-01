// File: src/components/layout/AppShell.jsx

import React, { useCallback } from "react";
import {
  Wallet,
  LogOut,
  Home as HomeIcon,
  ListChecks,
  Target,
  Settings as SettingsIcon,
  CalendarDays,
  ArrowRightLeft,
} from "lucide-react";

/**
 * Thin wrapper that centers the app and gives it a card-like frame.
 * Used by AppShell to provide consistent layout across all screens.
 */
function Wrapper({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 max-w-md mx-auto w-full bg-white shadow-sm border-x border-slate-200 flex flex-col">
        {children}
      </div>
    </div>
  );
}

/**
 * Bottom navigation tabs used to move between high-level app sections.
 * Controlled via `current` (active tab key) and `onChange` callback.
 */
function Tabs({ current, onChange }) {
  const items = [
    { key: "home", label: "Home", icon: HomeIcon },
    { key: "planner", label: "Planner", icon: Target },
    { key: "dashboard", label: "Dashboard", icon: CalendarDays },
    { key: "bills", label: "Bills", icon: ListChecks },
    { key: "accounts", label: "Accounts", icon: Wallet },
    { key: "settings", label: "Settings", icon: SettingsIcon },
    { key: "expenses", label: "Expenses", icon: ArrowRightLeft },
  ];

  const handleTabClick = useCallback(
    (key) => {
      if (typeof onChange === "function") {
        onChange(key);
      }
    },
    [onChange]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 pointer-events-auto">
      <div className="max-w-md mx-auto flex items-stretch justify-between px-1 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              type="button"
              key={item.key}
              onClick={() => handleTabClick(item.key)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-colors ${
                active ? "bg-indigo-50 text-indigo-600" : "text-slate-500"
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * AppShell
 *
 * Provides the common application chrome:
 * - Top header with app name + greeting + logout button
 * - Centered mobile layout (Wrapper)
 * - Bottom navigation tabs
 *
 * The main page content is passed as `children`. Any overlay/modal content
 * that should render inside the shell but after the tabs can be passed via
 * the optional `footer` prop.
 */
export default function AppShell({
  tab,
  onTabChange,
  greetingName,
  onLogout,
  children,
  footer = null,
}) {
  const displayName = greetingName || "there";

  return (
    <Wrapper>
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="text-indigo-600" size={18} />
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500">
              Smart Cash Flow Planner
            </div>
            <div className="text-xs font-semibold text-slate-900">
              Hi {displayName}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Page body from parent */}
      {children}

      {/* Bottom navigation */}
      <Tabs current={tab} onChange={onTabChange} />

      {/* Optional footer/overlay (e.g. modals) */}
      {footer}
    </Wrapper>
  );
}
