'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Inbox, SearchX, AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  /** Icon: 'inbox' (default), 'search', 'error', or a custom ReactNode */
  icon?: React.ReactNode | 'inbox' | 'search' | 'error';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const icons: Record<string, React.ReactNode> = {
  inbox: <Inbox className="h-12 w-12 text-muted-foreground/40" />,
  search: <SearchX className="h-12 w-12 text-muted-foreground/40" />,
  error: <AlertCircle className="h-12 w-12 text-muted-foreground/40" />,
};

export function EmptyState({
  icon = 'inbox',
  title = 'No data yet',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 animate-fade-in', className)}>
      <div className="mb-4">
        {typeof icon === 'string' ? icons[icon] ?? icons.inbox : icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} className="active:scale-95 transition-all duration-200">
          {action.label}
        </Button>
      )}
    </div>
  );
}
