'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

/* ── Types ── */

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

/* ── Context ── */

const DialogContext = React.createContext<{ onClose: () => void }>({
  onClose: () => {},
});

/* ── Root ── */

export function Dialog({ open, onClose, children, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    // Body scroll lock
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handler);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Focus trap
  useEffect(() => {
    if (!open || !contentRef.current) return;
    const firstFocusable = contentRef.current.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [open]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <DialogContext.Provider value={{ onClose }}>
      <div
        ref={overlayRef}
        onClick={handleOverlayClick}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          animation: 'dialog-overlay-show 0.15s ease-out',
        }}
      >
        <div
          ref={contentRef}
          role="dialog"
          aria-modal="true"
          className={cn(
            'w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl',
            'scrollbar-thin',
            className
          )}
          style={{ animation: 'dialog-content-show 0.2s ease-out' }}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>
  );
}

/* ── Sub-components ── */

export function DialogHeader({ children, className }: DialogHeaderProps) {
  const { onClose } = React.useContext(DialogContext);
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-border px-6 py-4',
        className
      )}
    >
      <div className="flex-1">{children}</div>
      <button
        onClick={onClose}
        className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

export function DialogTitle({ children, className }: DialogTitleProps) {
  return (
    <h3 className={cn('text-base font-semibold text-foreground', className)}>
      {children}
    </h3>
  );
}

export function DialogContent({ children, className }: DialogContentProps) {
  return <div className={cn('px-6 py-4 space-y-4', className)}>{children}</div>;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 border-t border-border px-6 py-4',
        className
      )}
    >
      {children}
    </div>
  );
}
