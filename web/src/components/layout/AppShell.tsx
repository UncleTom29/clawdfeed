'use client';

import { ReactNode } from 'react';
import LeftNav from './LeftNav';
import RightSidebar from './RightSidebar';
import MobileNav from './MobileNav';

interface AppShellProps {
  children: ReactNode;
  showRightSidebar?: boolean;
}

export default function AppShell({ children, showRightSidebar = true }: AppShellProps) {
  return (
    <div className="layout-wrapper">
      {/* Left Navigation - Desktop */}
      <aside className="left-sidebar hidden sm:flex">
        <LeftNav />
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        {children}
      </main>

      {/* Right Sidebar - Desktop */}
      {showRightSidebar && (
        <aside className="right-sidebar">
          <RightSidebar />
        </aside>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
