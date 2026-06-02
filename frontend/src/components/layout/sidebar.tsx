'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { SapaHRLogo } from '@/components/ui/sapahr-logo';
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
  Link2,
  UserCircle,
  Users,
  Building2,
  Upload,
  Download,
  PenLine,
  DollarSign,
  LayoutDashboard,
  Wallet,
  Shield,
  ChevronDown,
  ChevronRight,
  Megaphone,
  Briefcase,
  PiggyBank,
  UserCog,
  Package,
  ArrowRightLeft,
} from 'lucide-react';
import { api } from '@/lib/api';

const isManager = (role: string) =>
  role === 'manager' || role === 'tenant_admin' || role === 'super_admin';

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ElementType;
  roles?: string[];
}

interface NavGroup {
  labelKey: string;
  icon: React.ElementType;
  roles?: string[];
  items: NavItem[];
}

// ── Badge Hook ──

interface BadgeCounts {
  unread: number;
  pendingCorrections: number;
  pendingLeaves: number;
  pendingOvertime: number;
  pendingReimb: number;
}

function useBadgeCounts(user: any): BadgeCounts {
  const [counts, setCounts] = React.useState<BadgeCounts>({
    unread: 0,
    pendingCorrections: 0,
    pendingLeaves: 0,
    pendingOvertime: 0,
    pendingReimb: 0,
  });

  React.useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      try {
        // Unread notifications
        const notifRes = await api.get<{ unread_count: number }>('/api/v1/notifications/unread-count');
        const unread = notifRes?.unread_count ?? 0;

        let pendingCorrections = 0;
        let pendingLeaves = 0;
        let pendingOvertime = 0;
        let pendingReimb = 0;

        if (isManager(user.role)) {
          // Pending corrections
          const corrRes = await api.get<{ data: any[] }>('/api/v1/attendance-corrections/pending');
          pendingCorrections = corrRes?.data?.length ?? 0;

          // Pending leaves
          const leaveRes = await api.get<{ data: any[] }>('/api/v1/leaves/pending');
          pendingLeaves = leaveRes?.data?.length ?? 0;

          // Pending overtime
          const otRes = await api.get<{ data: any[] }>('/api/v1/overtime/pending');
          pendingOvertime = otRes?.data?.length ?? 0;

          // Pending reimbursements
          const reimbRes = await api.get<{ data: any[] }>('/api/v1/reimbursements/pending');
          pendingReimb = reimbRes?.data?.length ?? 0;
        }

        setCounts({
          unread,
          pendingCorrections,
          pendingLeaves,
          pendingOvertime,
          pendingReimb,
        });
      } catch {
        // Silently fail — badges gracefully hide
      }
    };

    fetchCounts();
    // Poll every 30s
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return counts;
}

// ── Badge Component ──

function Badge({ count, color = 'bg-red-500' }: { count: number; color?: string }) {
  if (count <= 0) return null;
  return (
    <span
      className={`ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white ${color}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ── Sidebar ──
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const t = useTranslations('nav');
  const badges = useBadgeCounts(user);

  // Collapse state per group
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(() => {
    return {};
  });
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { setReady(true); }, []);

  const groups: NavGroup[] = [
    {
      labelKey: 'dashboard',
      icon: Clock,
      roles: ['employee', 'manager', 'tenant_admin', 'super_admin'],
      items: [
        { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'attendance.group',
      icon: Clock,
      roles: ['employee', 'manager', 'tenant_admin', 'super_admin'],
      items: [
        // Employee items
        { href: '/dashboard/history', labelKey: 'attendance.history', icon: History, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/dashboard/shifts', labelKey: 'attendance.myShift', icon: Clock, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/employee/shift-swaps', labelKey: 'attendance.shiftSwap', icon: ArrowRightLeft, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/dashboard/attendance/corrections', labelKey: 'attendance.corrections', icon: PenLine, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/roster', labelKey: 'attendance.roster', icon: CalendarDays, roles: ['manager', 'tenant_admin', 'super_admin'] },
        // Manager items
        { href: '/manager/attendance/corrections', labelKey: 'attendance.corrections', icon: PenLine, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/attendance/export', labelKey: 'attendance.export', icon: Download, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/report', labelKey: 'attendance.report', icon: FileText, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/shifts', labelKey: 'attendance.shiftManagement', icon: ArrowLeftRight, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/shift-assignments', labelKey: 'attendance.shiftAssignments', icon: Link2, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/shift-swaps', labelKey: 'attendance.shiftSwapApprovals', icon: ArrowRightLeft, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/analytics', labelKey: 'attendance.analytics', icon: BarChart3, roles: ['manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'timeOff.group',
      icon: CalendarDays,
      roles: ['employee', 'manager', 'tenant_admin', 'super_admin'],
      items: [
        { href: '/dashboard/leave', labelKey: 'timeOff.leaveRequest', icon: FileText, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/dashboard/leave/history', labelKey: 'timeOff.leaveHistory', icon: CalendarDays, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/dashboard/leave/calendar', labelKey: 'timeOff.leaveCalendar', icon: CalendarDays, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/leaves/all', labelKey: 'timeOff.allLeaves', icon: List, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/leaves/pending', labelKey: 'timeOff.leaveApprovals', icon: CheckCircle2, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/dashboard/overtime', labelKey: 'timeOff.overtimeRequest', icon: Clock, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/overtime', labelKey: 'timeOff.overtimeApprovals', icon: CheckCircle2, roles: ['manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'employees.group',
      icon: Briefcase,
      roles: ['manager', 'tenant_admin', 'super_admin'],
      items: [
        { href: '/manager/employees', labelKey: 'employees.management', icon: Users, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/departments', labelKey: 'employees.departments', icon: Building2, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/employees/import', labelKey: 'employees.bulkImport', icon: Upload, roles: ['manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'finance.group',
      icon: PiggyBank,
      roles: ['employee', 'manager', 'tenant_admin', 'super_admin'],
      items: [
        { href: '/employee/reimbursement', labelKey: 'finance.reimbursement', icon: DollarSign, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/reimbursement', labelKey: 'finance.reimbursementManage', icon: DollarSign, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/payroll', labelKey: 'finance.payroll', icon: Wallet, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/employee/payslip', labelKey: 'finance.payslip', icon: FileText, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'assets.group',
      icon: Package,
      roles: ['employee', 'manager', 'tenant_admin', 'super_admin'],
      items: [
        { href: '/employee/assets', labelKey: 'assets.myAssets', icon: Briefcase, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/assets', labelKey: 'assets.assetManagement', icon: Package, roles: ['manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'announcements.group',
      icon: Megaphone,
      roles: ['manager', 'tenant_admin', 'super_admin'],
      items: [
        { href: '/manager/announcements', labelKey: 'announcements.announcements', icon: Megaphone, roles: ['manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'admin.group',
      icon: Shield,
      roles: ['super_admin'],
      items: [
        { href: '/admin', labelKey: 'admin.panel', icon: Shield, roles: ['super_admin'] },
        { href: '/admin/tenants', labelKey: 'admin.tenants', icon: Building2, roles: ['super_admin'] },
        { href: '/admin/users', labelKey: 'admin.users', icon: Users, roles: ['super_admin'] },
      ],
    },
    {
      labelKey: 'account.group',
      icon: UserCog,
      roles: ['employee', 'manager', 'tenant_admin', 'super_admin'],
      items: [
        { href: '/dashboard/profile', labelKey: 'account.profile', icon: UserCircle, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
        { href: '/dashboard/notifications', labelKey: 'account.notifications', icon: Bell, roles: ['employee', 'manager', 'tenant_admin', 'super_admin'] },
      ],
    },
  ];

  function toggleGroup(labelKey: string) {
    setCollapsed((prev) => ({ ...prev, [labelKey]: !prev[labelKey] }));
  }

  function isActive(href: string) {
    if (href === '/admin' && pathname.startsWith('/admin')) return true;
    return pathname === href;
  }

  function groupHasActive(group: NavGroup): boolean {
    return group.items.some((item) =>
      isActive(item.href) && user && (!item.roles || item.roles.includes(user.role))
    );
  }

  // Compute badge for specific nav href
  function getBadgeForHref(href: string): number {
    if (!user || !isManager(user.role)) return 0;
    switch (href) {
      case '/manager/attendance/corrections': return badges.pendingCorrections;
      case '/manager/leaves/pending': return badges.pendingLeaves;
      case '/manager/overtime': return badges.pendingOvertime;
      case '/manager/reimbursement': return badges.pendingReimb;
      case '/dashboard/notifications': return badges.unread;
      default: return 0;
    }
  }

  // Color per badge type
  function getBadgeColor(href: string): string {
    if (href === '/dashboard/notifications') return 'bg-red-500';
    if (href === '/manager/overtime') return 'bg-blue-500';
    if (href === '/manager/leaves/pending') return 'bg-amber-500';
    if (href === '/manager/reimbursement') return 'bg-purple-500';
    return 'bg-red-500'; // corrections, default
  }

  const visibleGroups = groups.filter(
    (g) => !g.roles || (user && g.roles.includes(user.role))
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <SapaHRLogo variant="horizontal" />
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
        {visibleGroups.map((group) => {
          const active = groupHasActive(group);
          const isOpen = collapsed[group.labelKey] === undefined ? active : !collapsed[group.labelKey];
          const GroupIcon = group.icon;

          const visibleItems = group.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role))
          );

          if (visibleItems.length === 0) return null;

          // Single-item group (dashboard, account) → no collapse
          if (visibleItems.length === 1) {
            const item = visibleItems[0];
            const ItemIcon = item.icon;
            const itemBadge = getBadgeForHref(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'sidebar-item flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                  isActive(item.href)
                    ? 'bg-primary text-primary-foreground active'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <ItemIcon className="h-5 w-5 flex-shrink-0" />
                <span>{t(item.labelKey)}</span>
                {itemBadge > 0 && <Badge count={itemBadge} color={getBadgeColor(item.href)} />}
              </Link>
            );
          }

          // Multi-item group → collapsible
          return (
            <div key={group.labelKey}>
              <button
                onClick={() => toggleGroup(group.labelKey)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                )}
              >
                <GroupIcon className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1 text-left">{t(group.labelKey)}</span>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-border pl-3">
                  {visibleItems.map((item) => {
                    const ItemIcon = item.icon;
                    const itemBadge = getBadgeForHref(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                          isActive(item.href)
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <ItemIcon className="h-4 w-4 flex-shrink-0" />
                        <span>{t(item.labelKey)}</span>
                        {itemBadge > 0 && <Badge count={itemBadge} color={getBadgeColor(item.href)} />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
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
          <span>{t('logout')}</span>
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
