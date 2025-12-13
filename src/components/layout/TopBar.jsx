import React from "react";
import { Bell, Menu } from "lucide-react";
import { ThemeToggle } from "../ui/ThemeToggle";
import { useToast } from "../ui/toast/useToast";

export function TopBar({ user, title, showProfile = true }) {
  const { showToast } = useToast();
  // Use a reliable placeholder service for the avatar
  const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || "Finzo"}`;

  const handleNotificationsClick = () => {
    showToast({ type: "info", message: "No new notifications yet." });
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-surface-50/80 backdrop-blur-md border-b border-surface-200/50 px-5 py-3 transition-colors duration-200">
      <div className="mx-auto flex max-w-md items-center justify-between">
        
        {/* Left Side: Profile or Title */}
        {showProfile ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full border-2 border-primary-100 overflow-hidden shadow-sm bg-surface-100">
              <img 
                src={profileImage} 
                alt="Profile" 
                className="h-full w-full object-cover"
              />
            </div>
            {user && (
              <div className="flex flex-col">
                <span className="text-tiny font-bold uppercase tracking-wider text-surface-400">
                  Welcome Back
                </span>
                <span className="text-body font-bold text-surface-900 leading-tight">
                  {user.displayName?.split(' ')[0] || 'Friend'}
                </span>
              </div>
            )}
          </div>
        ) : (
          <h1 className="text-title-l font-bold text-surface-900">{title}</h1>
        )}

        {/* Right Side: Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            type="button"
            className="p-2 text-surface-500 hover:bg-surface-200/50 rounded-full transition-colors"
            aria-label="Notifications"
            title="No new notifications"
            onClick={handleNotificationsClick}
          >
            <Bell size={24} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}

