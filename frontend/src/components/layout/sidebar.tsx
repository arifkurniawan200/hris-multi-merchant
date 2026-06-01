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
  Settings,
  Briefcase,
  PiggyBank,
  UserCog,
} from 'lucide-react';

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

// ── Sidebar ──
export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const t = useTranslations('nav');

  // Collapse state per group
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>(() => {
    // Start collapsed, expand if a child is active
    return {};
  });
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => { setReady(true); }, []);

  const groups: NavGroup[] = [
    {
      labelKey: 'dashboard',
      icon: Clock,
      roles: ['employee', 'manager', 'tenant_admin'],
      items: [
        { href: '/dashboard', labelKey: 'dashboard', icon: LayoutDashboard, roles: ['employee', 'manager', 'tenant_admin'] },
      ],
    },
    {
      labelKey: 'attendance.group',
      icon: Clock,
      roles: ['employee', 'manager', 'tenant_admin'],
      items: [
        { href: '/dashboard/history', labelKey: 'attendance.history', icon: History, roles: ['employee', 'manager', 'tenant_admin'] },
        { href: '/manager/attendance/corrections', labelKey: 'attendance.corrections', icon: PenLine, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/report', labelKey: 'attendance.report', icon: BarChart3, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/attendance/export', labelKey: 'attendance.export', icon: Download, roles: ['manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'timeOff.group',
      icon: CalendarDays,
      roles: ['employee', 'manager', 'tenant_admin'],
      items: [
        { href: '/dashboard/leave', labelKey: 'timeOff.leaveRequest', icon: FileText, roles: ['employee', 'manager', 'tenant_admin'] },
        { href: '/dashboard/leave/history', labelKey: 'timeOff.leaveHistory', icon: CalendarDays, roles: ['employee', 'manager', 'tenant_admin'] },
        { href: '/dashboard/leave/calendar', labelKey: 'timeOff.leaveCalendar', icon: CalendarDays, roles: ['employee', 'manager', 'tenant_admin'] },
        { href: '/manager/leaves/all', labelKey: 'timeOff.allLeaves', icon: List, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/leaves/pending', labelKey: 'timeOff.leaveApprovals', icon: CheckCircle2, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/leaves-types', labelKey: 'timeOff.leaveTypes', icon: FileText, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/dashboard/overtime', labelKey: 'timeOff.overtimeRequest', icon: Clock, roles: ['employee', 'manager', 'tenant_admin'] },
        { href: '/manager/overtime', labelKey: 'timeOff.overtimeApprovals', icon: CheckCircle2, roles: ['manager', 'tenant_admin', 'super_admin'] },
      ],
    },
    {
      labelKey: 'shifts.group',
      icon: ArrowLeftRight,
      roles: ['employee', 'manager', 'tenant_admin'],
      items: [
        { href: '/dashboard/shifts', labelKey: 'shifts.myShift', icon: Clock, roles: ['employee', 'manager', 'tenant_admin'] },
        { href: '/manager/shifts', labelKey: 'shifts.shiftManagement', icon: ArrowLeftRight, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/shift-assignments', labelKey: 'shifts.shiftAssignments', icon: Link2, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/roster', labelKey: 'roster', icon: CalendarDays, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/analytics', labelKey: 'analytics', icon: BarChart3, roles: ['manager', 'tenant_admin', 'super_admin'] },
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
      roles: ['employee', 'manager', 'tenant_admin'],
      items: [
        { href: '/employee/reimbursement', labelKey: 'finance.reimbursement', icon: DollarSign, roles: ['employee', 'manager', 'tenant_admin'] },
        { href: '/manager/reimbursement', labelKey: 'finance.reimbursementManage', icon: DollarSign, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/manager/payroll', labelKey: 'finance.payroll', icon: Wallet, roles: ['manager', 'tenant_admin', 'super_admin'] },
        { href: '/employee/payslip', labelKey: 'finance.payslip', icon: FileText, roles: ['employee', 'manager', 'tenant_admin'] },
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
    // Handle redirect /admin → /admin/tenants
    if (href === '/admin' && pathname.startsWith('/admin')) return true;
    return pathname === href;
  }

  function groupHasActive(group: NavGroup): boolean {
    return group.items.some((item) =>
      isActive(item.href) && user && (!item.roles || item.roles.includes(user.role))
    );
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
