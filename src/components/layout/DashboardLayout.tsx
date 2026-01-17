'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load saved preference
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  const handleToggleSidebar = () => {
    const newValue = !sidebarCollapsed;
    setSidebarCollapsed(newValue);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newValue));
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />
      <Header sidebarCollapsed={sidebarCollapsed} />
      <main
        className={cn(
          'pt-[var(--header-height)] min-h-screen transition-all duration-300',
          sidebarCollapsed ? 'pl-[var(--sidebar-collapsed-width)]' : 'pl-[var(--sidebar-width)]'
        )}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
