'use client';

import React from 'react';
import { Button } from './button';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from './dialog';
import { AlertTriangle, Trash2, Info } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message = 'Are you sure you want to proceed?',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const iconMap = {
    danger: <Trash2 className="h-5 w-5 text-danger" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning" />,
    info: <Info className="h-5 w-5 text-primary" />,
  };

  const iconBg = {
    danger: 'bg-danger/10',
    warning: 'bg-warning/10',
    info: 'bg-primary/10',
  };

  const btnVariant = variant === 'danger' ? 'danger' : 'default';

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          <div className={`h-9 w-9 rounded-lg ${iconBg[variant]} flex items-center justify-center flex-shrink-0`}>
            {iconMap[variant]}
          </div>
          {title}
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </DialogContent>
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
          className="active:scale-95 transition-all duration-200"
        >
          {cancelLabel}
        </Button>
        <Button
          variant={btnVariant}
          onClick={onConfirm}
          disabled={loading}
          className="active:scale-95 transition-all duration-200"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing...
            </span>
          ) : (
            confirmLabel
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
