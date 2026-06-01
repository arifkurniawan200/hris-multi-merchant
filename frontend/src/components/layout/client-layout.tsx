'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { NotifProvider } from '@/contexts/notification-context';
import { NotifBell } from '@/components/notifications/notif-bell';
import { LogOut } from 'lucide-react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
            role="status"
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <NotifProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-end gap-3 border-b border-border bg-card px-6">
            {user && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user.name || user.email}
              </span>
            )}
            <NotifBell />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted">
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </NotifProvider>
  );
}
