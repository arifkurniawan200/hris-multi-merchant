'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  created_at: string;
}

interface NotifContextType {
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotifContext = createContext<NotifContextType | undefined>(undefined);

export function NotifProvider({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [count, notifs] = await Promise.all([
        api.get<{ unread_count: number }>('/api/v1/notifications/unread-count'),
        api.get<Notification[]>('/api/v1/notifications?limit=20'),
      ]);
      setUnreadCount(count?.unread_count ?? 0);
      setNotifications(notifs || []);
    } catch {
      // Notification API not available yet — silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 30s, but delay first call to avoid immediate API blast
  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 2000);
    const interval = setInterval(refresh, 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [refresh]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.put(`/api/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* ignore */ }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/api/v1/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  return (
    <NotifContext.Provider
      value={{ unreadCount, notifications, loading, refresh, markRead, markAllRead }}
    >
      {children}
    </NotifContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotifContext);
  if (!ctx) throw new Error('useNotifications must be used within NotifProvider');
  return ctx;
}
