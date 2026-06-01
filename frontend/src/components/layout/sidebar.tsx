'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import {
  Bell,
  Clock,
  History,
  BarChart3,
  LogOut,
  Menu,
  X,
  FileText,
  CalendarDays,
  CheckCircle2,
  List,
  ArrowLeftRight,
  UserCircle,
} from 'lucide-react';

const isManager = (role: string) =>
  role === 'manager' || role === 'tenant_admin' || role === 'super_admin';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles?: string[];
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems: NavItem[] = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: Clock,
    },
    {
      href: '/dashboard/leave',
      label: 'Leave Request',
      icon: FileText,
    },
    {
      href: '/dashboard/leave/history',
      label: 'Leave History',
      icon: CalendarDays,
    },
    {
      href: '/dashboard/shifts',
      label: 'My Shift',
      icon: Clock,
    },
    {
      href: '/dashboard/overtime',
      label: 'Overtime Request',
      icon: Clock,
    },
    {
      href: '/dashboard/history',
      label: 'Attendance History',
      icon: History,
    },
    {
      href: '/dashboard/notifications',
      label: 'Notifications',
      icon: Bell,
    },
    {
      href: '/manager/shifts',
      label: 'Shift Management',
      icon: ArrowLeftRight,
      roles: ['manager', 'tenant_admin', 'super_admin'],
    },
    {
      href: '/manager/report',
      label: 'Attendance Report',
      icon: BarChart3,
      roles: ['manager', 'tenant_admin', 'super_admin'],
    },
    {
      href: '/manager/leaves/pending',
      label: 'Leave Approvals',
      icon: CheckCircle2,
      roles: ['manager', 'tenant_admin', 'super_admin'],
    },
    {
      href: '/manager/overtime',
      label: 'Overtime Approvals',
      icon: CheckCircle2,
      roles: ['manager', 'tenant_admin', 'super_admin'],
    },
    {
      href: '/manager/leaves/all',
      label: 'All Leaves',
      icon: List,
      roles: ['manager', 'tenant_admin', 'super_admin'],
    },
    {
      href: '/dashboard/profile',
      label: 'Profile',
      icon: UserCircle,
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="text-xl font-bold text-foreground">HRIS</h1>
          <p className="text-xs text-muted-foreground">Attendance System</p>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="md:hidden text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="px-6 py-4 border-b border-border">
          <p className="text-sm font-medium text-foreground truncate">
            {user.name || user.email}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{user.role.replace('_', ' ')}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-border">
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-danger/10 hover:text-danger transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden bg-card border border-border rounded-lg p-2 shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar overlay (mobile) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
