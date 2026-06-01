'use client';

import React from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/contexts/theme-context';
import { Sidebar } from '@/components/layout/sidebar';
import { NotifProvider } from '@/contexts/notification-context';
import { NotifBell } from '@/components/notifications/notif-bell';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { LocaleSwitcher } from '@/components/ui/locale-switcher';
import { useTranslations } from 'next-intl';
import { LogOut, Moon, Sun } from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated, user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const t = useTranslations('common');
  const tnav = useTranslations('nav');
  const [tenantName, setTenantName] = useState<string>('');

  // Fetch tenant name when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      api.get<{ name: string }>('/api/v1/tenants/my')
        .then(data => setTenantName(data.name))
        .catch(() => setTenantName(''));
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"
            role="status"
          />
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">{t('redirecting')}</p>
      </div>
    );
  }

  return (
    <NotifProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-14 items-center justify-end gap-2 border-b border-border bg-card px-6">
            {tenantName && (
              <span className="text-sm font-medium text-foreground hidden sm:inline mr-auto">
                {tenantName}
              </span>
            )}
            <LocaleSwitcher />
            <button
              onClick={toggle}
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title={theme === 'dark' ? t('lightMode') : t('darkMode')}
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <NotifBell />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{tnav('logout')}</span>
            </button>
          </header>
          <main className="flex-1 overflow-y-auto bg-muted">
            <div className="p-6 md:p-8 max-w-7xl mx-auto">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </NotifProvider>
  );
}
