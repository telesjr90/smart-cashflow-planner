import React from 'react';
import { Bell, Menu } from 'lucide-react';
import { ThemeToggle } from '../ui/ThemeToggle';

export function TopBar({ user, title, showProfile = true }) {
  // Use a reliable placeholder service for the avatar
  const profileImage = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.uid || 'Finzo'}`;

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
          <button className="p-2 text-surface-500 hover:bg-surface-200/50 rounded-full transition-colors relative">
            <Bell size={24} />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-danger-500 border border-white dark:border-surface-900"></span>
          </button>
        </div>
      </div>
    </header>
  );
}

