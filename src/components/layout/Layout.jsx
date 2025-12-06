import React from 'react';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';

export function Layout({ children, currentTab, onTabChange, onAddPress, user }) {
  // Determine title based on tab (for TopBar when profile isn't shown)
  const getTitle = () => {
    switch(currentTab) {
      case 'planner': return 'Financial Analysis';
      case 'bills': return 'My Wallet';
      case 'settings': return 'Profile';
      case 'expenses': return 'Transactions'; // If you add a dedicated expenses tab later
      default: return 'Finzo';
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 text-surface-900 font-sans transition-colors duration-200 selection:bg-primary-100 selection:text-primary-900">
      
      {/* Top Bar - Shows Profile on Home, Title elsewhere */}
      <TopBar 
        user={user} 
        title={getTitle()} 
        showProfile={currentTab === 'home'} 
      />

      {/* Main Content Area */}
      {/* pb-28 ensures content isn't hidden behind the bottom nav/FAB */}
      <main className="mx-auto max-w-md px-5 pb-28 pt-4 animate-in fade-in duration-300">
        {children}
      </main>

      {/* Bottom Navigation */}
      <BottomNav 
        currentTab={currentTab} 
        onTabChange={onTabChange} 
        onAddPress={onAddPress}
      />
      
    </div>
  );
}

